import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.js';
import { getBotStatus, restartWhatsApp, disconnectWhatsApp } from '../services/whatsapp/client.js';

const router = Router();

router.use(authMiddleware);

// Schema de validacao
const configSchema = z.object({
  isActive: z.boolean().optional(),
  aiProvider: z.enum(['gemini', 'openai', 'anthropic']).optional(),
  aiModel: z.string().optional(),
  aiTemperature: z.number().min(0).max(2).optional(),
  aiMaxTokens: z.number().min(100).max(4000).optional(),
  welcomeMessage: z.string().nullable().optional(),
  awayMessage: z.string().nullable().optional(),
  businessHoursStart: z.string().nullable().optional(),
  businessHoursEnd: z.string().nullable().optional(),
  businessDays: z.array(z.number().min(0).max(6)).optional(),
  systemPrompt: z.string().nullable().optional(),
});

// GET /api/config
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let config = await prisma.botConfig.findUnique({
      where: { id: 'default' },
    });

    // Cria configuracao padrao se nao existir
    if (!config) {
      config = await prisma.botConfig.create({
        data: { id: 'default' },
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/config
router.put('/', adminMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = configSchema.parse(req.body);

    const config = await prisma.botConfig.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/config/status
router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = getBotStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/config/restart
router.post('/restart', adminMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await restartWhatsApp();

    res.json({
      success: true,
      message: 'Bot reiniciado. Escaneie o novo QR Code.',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/config/disconnect
router.post('/disconnect', adminMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await disconnectWhatsApp();

    res.json({
      success: true,
      message: 'Bot desconectado com sucesso.',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/config/ai-models
router.get('/ai-models', async (_req: Request, res: Response, _next: NextFunction) => {
  const models = {
    gemini: [
      { id: 'gemini-pro', name: 'Gemini Pro' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ],
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
    anthropic: [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ],
  };

  res.json({
    success: true,
    data: models,
  });
});

export default router;
