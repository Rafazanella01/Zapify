import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import { AppError } from '../middlewares/error.js';
import { sendMessage, getBotStatus } from '../services/whatsapp/client.js';
import { emitToAll } from '../config/socket.js';

const router = Router();

router.use(authMiddleware);

// Schema de validacao
const campaignSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  message: z.string().min(1, 'Mensagem e obrigatoria'),
  mediaUrl: z.string().optional(),
  targetType: z.enum(['ALL', 'TAGS', 'SELECTED']).default('ALL'),
  targetTags: z.array(z.string()).default([]),
  targetContacts: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().optional(),
  delayBetween: z.number().min(1000).max(60000).default(3000),
});

// Estado das campanhas em execucao
const runningCampaigns = new Map<string, { paused: boolean; cancelled: boolean }>();

// GET /api/campaigns
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = String(status);
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/campaigns/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!campaign) {
      throw new AppError('Campanha nao encontrada', 404);
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/campaigns
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = campaignSchema.parse(req.body);

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        message: data.message,
        mediaUrl: data.mediaUrl,
        targetType: data.targetType,
        targetTags: data.targetTags,
        targetContacts: data.targetContacts,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        delayBetween: data.delayBetween,
      },
    });

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/campaigns/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = campaignSchema.partial().parse(req.body);

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Campanha nao encontrada', 404);
    }

    if (existing.status !== 'DRAFT') {
      throw new AppError('Apenas campanhas em rascunho podem ser editadas', 400);
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
    });

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Campanha nao encontrada', 404);
    }

    if (existing.status === 'RUNNING') {
      throw new AppError('Nao e possivel excluir campanha em execucao', 400);
    }

    await prisma.campaign.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Campanha removida com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/campaigns/:id/start - Inicia a campanha
router.post('/:id/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new AppError('Campanha nao encontrada', 404);
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
      throw new AppError('Campanha nao pode ser iniciada neste estado', 400);
    }

    const botStatus = getBotStatus();
    if (!botStatus.isReady) {
      throw new AppError('WhatsApp nao esta conectado', 400);
    }

    // Busca contatos baseado no tipo de alvo
    let contacts;
    if (campaign.targetType === 'ALL') {
      contacts = await prisma.contact.findMany({
        where: { isBlocked: false },
        select: { id: true, phone: true, name: true },
      });
    } else if (campaign.targetType === 'TAGS') {
      contacts = await prisma.contact.findMany({
        where: {
          isBlocked: false,
          tags: { hasSome: campaign.targetTags },
        },
        select: { id: true, phone: true, name: true },
      });
    } else {
      contacts = await prisma.contact.findMany({
        where: {
          id: { in: campaign.targetContacts },
          isBlocked: false,
        },
        select: { id: true, phone: true, name: true },
      });
    }

    if (contacts.length === 0) {
      throw new AppError('Nenhum contato encontrado para esta campanha', 400);
    }

    // Atualiza campanha para RUNNING
    await prisma.campaign.update({
      where: { id },
      data: {
        status: 'RUNNING',
        startedAt: campaign.status === 'DRAFT' ? new Date() : undefined,
        totalRecipients: contacts.length,
      },
    });

    // Cria logs para cada contato (se ainda nao existem)
    const existingLogs = await prisma.campaignLog.findMany({
      where: { campaignId: id },
      select: { contactId: true },
    });
    const existingContactIds = new Set(existingLogs.map((l) => l.contactId));

    const newLogs = contacts
      .filter((c) => !existingContactIds.has(c.id))
      .map((contact) => ({
        campaignId: id,
        contactId: contact.id,
        phone: contact.phone,
        status: 'PENDING' as const,
      }));

    if (newLogs.length > 0) {
      await prisma.campaignLog.createMany({ data: newLogs });
    }

    // Inicia o envio em background
    runningCampaigns.set(id, { paused: false, cancelled: false });
    executeCampaign(id, campaign.delayBetween);

    res.json({
      success: true,
      message: 'Campanha iniciada',
      data: { totalRecipients: contacts.length },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/campaigns/:id/pause - Pausa a campanha
router.post('/:id/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new AppError('Campanha nao encontrada', 404);
    }

    if (campaign.status !== 'RUNNING') {
      throw new AppError('Apenas campanhas em execucao podem ser pausadas', 400);
    }

    const state = runningCampaigns.get(id);
    if (state) {
      state.paused = true;
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    res.json({
      success: true,
      message: 'Campanha pausada',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/campaigns/:id/cancel - Cancela a campanha
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new AppError('Campanha nao encontrada', 404);
    }

    if (campaign.status !== 'RUNNING' && campaign.status !== 'PAUSED') {
      throw new AppError('Campanha nao pode ser cancelada neste estado', 400);
    }

    const state = runningCampaigns.get(id);
    if (state) {
      state.cancelled = true;
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    runningCampaigns.delete(id);

    res.json({
      success: true,
      message: 'Campanha cancelada',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/campaigns/:id/logs - Logs da campanha
router.get('/:id/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, page = '1', limit = '50' } = req.query;

    const where: Record<string, unknown> = { campaignId: id };
    if (status) {
      where.status = String(status);
    }

    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));

    const [logs, total] = await Promise.all([
      prisma.campaignLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(String(limit)),
      }),
      prisma.campaignLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(String(page)),
        limit: parseInt(String(limit)),
        total,
        pages: Math.ceil(total / parseInt(String(limit))),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Funcao para executar campanha em background
async function executeCampaign(campaignId: string, delayBetween: number) {
  const state = runningCampaigns.get(campaignId);
  if (!state) return;

  try {
    // Busca logs pendentes
    const pendingLogs = await prisma.campaignLog.findMany({
      where: { campaignId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return;

    for (const log of pendingLogs) {
      // Verifica se foi pausado ou cancelado
      const currentState = runningCampaigns.get(campaignId);
      if (!currentState || currentState.paused || currentState.cancelled) {
        break;
      }

      try {
        // Personaliza mensagem com nome do contato
        let message = campaign.message;
        const contact = await prisma.contact.findUnique({ where: { id: log.contactId } });
        if (contact?.name) {
          message = message.replace(/\{\{nome\}\}/gi, contact.name);
        }

        // Envia mensagem
        await sendMessage(log.phone, message);

        // Atualiza log como enviado
        await prisma.campaignLog.update({
          where: { id: log.id },
          data: { status: 'SENT', sentAt: new Date() },
        });

        // Atualiza contador da campanha
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        });

        // Emite progresso
        emitToAll('campaign:progress', {
          campaignId,
          sent: campaign.sentCount + 1,
          total: campaign.totalRecipients,
        });
      } catch (error: any) {
        // Marca como falhou
        await prisma.campaignLog.update({
          where: { id: log.id },
          data: { status: 'FAILED', error: error.message },
        });

        await prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }

      // Delay entre mensagens
      await new Promise((r) => setTimeout(r, delayBetween));
    }

    // Verifica se terminou
    const finalState = runningCampaigns.get(campaignId);
    if (finalState && !finalState.cancelled && !finalState.paused) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      emitToAll('campaign:completed', { campaignId });
    }

    runningCampaigns.delete(campaignId);
  } catch (error) {
    console.error('Erro na execucao da campanha:', error);
    runningCampaigns.delete(campaignId);
  }
}

export default router;
