import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import { AppError } from '../middlewares/error.js';
import { sendMessage } from '../services/whatsapp/client.js';
import { emitToAll } from '../config/socket.js';

const router = Router();

router.use(authMiddleware);

// Schema de validacao
const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  phone: z.string().optional(),
  content: z.string().min(1, 'Mensagem nao pode ser vazia'),
  type: z.enum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT']).default('TEXT'),
});

// POST /api/messages/send
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = sendMessageSchema.parse(req.body);

    let conversation;
    let phone: string;

    if (data.conversationId) {
      // Envia para uma conversa existente
      conversation = await prisma.conversation.findUnique({
        where: { id: data.conversationId },
        include: { contact: true },
      });

      if (!conversation) {
        throw new AppError('Conversa nao encontrada', 404);
      }

      phone = conversation.contact.phone;
    } else if (data.phone) {
      // Envia para um numero novo
      phone = data.phone.replace(/\D/g, '');

      // Busca ou cria o contato
      let contact = await prisma.contact.findUnique({
        where: { phone },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: { phone },
        });
      }

      // Busca ou cria a conversa
      conversation = await prisma.conversation.findFirst({
        where: { contactId: contact.id, status: 'ACTIVE' },
        include: { contact: true },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            contactId: contact.id,
            status: 'ACTIVE',
          },
          include: { contact: true },
        });
      }
    } else {
      throw new AppError('Informe conversationId ou phone', 400);
    }

    // Envia a mensagem pelo WhatsApp
    await sendMessage(phone, data.content);

    // Salva a mensagem no banco
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: data.content,
        type: data.type,
        direction: 'OUTGOING',
        isFromBot: false,
      },
    });

    // Atualiza a conversa
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Emite evento de nova mensagem
    emitToAll('message:new', {
      ...message,
      conversation,
    });

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/messages/:conversationId
router.get('/:conversationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId } = req.params;
    const { page = '1', limit = '50' } = req.query;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { sentAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    res.json({
      success: true,
      data: messages.reverse(),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
