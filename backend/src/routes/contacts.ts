import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import { AppError } from '../middlewares/error.js';

const router = Router();

// Middleware de autenticacao para todas as rotas
router.use(authMiddleware);

// Schema de validacao
const updateContactSchema = z.object({
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isBlocked: z.boolean().optional(),
});

// GET /api/contacts
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, blocked, tag, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search) } },
      ];
    }

    if (blocked !== undefined) {
      where.isBlocked = blocked === 'true';
    }

    if (tag) {
      where.tags = { has: String(tag) };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          conversations: {
            take: 1,
            orderBy: { lastMessageAt: 'desc' },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      success: true,
      data: contacts,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contacts/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
        },
      },
    });

    if (!contact) {
      throw new AppError('Contato nao encontrado', 404);
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/contacts/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateContactSchema.parse(req.body);

    const contact = await prisma.contact.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.contact.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Contato removido com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts/:id/block
router.post('/:id/block', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.update({
      where: { id },
      data: { isBlocked: true },
    });

    // Arquiva todas as conversas ativas
    await prisma.conversation.updateMany({
      where: { contactId: id, status: 'ACTIVE' },
      data: { status: 'BLOCKED' },
    });

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts/:id/unblock
router.post('/:id/unblock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.update({
      where: { id },
      data: { isBlocked: false },
    });

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contacts/tags/list
router.get('/tags/list', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const contacts = await prisma.contact.findMany({
      select: { tags: true },
    });

    const allTags = new Set<string>();
    contacts.forEach((c) => c.tags.forEach((t) => allTags.add(t)));

    res.json({
      success: true,
      data: Array.from(allTags).sort(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
