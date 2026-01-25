import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import { AppError } from '../middlewares/error.js';

const router = Router();

router.use(authMiddleware);

// GET /api/conversations
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status = 'ACTIVE', page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.status = String(status).toUpperCase();
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          contact: true,
          messages: {
            take: 1,
            orderBy: { sentAt: 'desc' },
          },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({
      success: true,
      data: conversations,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: true,
      },
    });

    if (!conversation) {
      throw new AppError('Conversa nao encontrada', 404);
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '50' } = req.query;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      throw new AppError('Conversa nao encontrada', 404);
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { sentAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.message.count({ where: { conversationId: id } }),
    ]);

    res.json({
      success: true,
      data: messages.reverse(), // Ordem cronologica
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/conversations/:id/archive
router.put('/:id/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/conversations/:id/unarchive
router.put('/:id/unarchive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/conversations/:id/read
router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
