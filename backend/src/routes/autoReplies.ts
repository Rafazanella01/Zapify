import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import { AppError } from '../middlewares/error.js';

const router = Router();

router.use(authMiddleware);

// Schema de validacao
const autoReplySchema = z.object({
  trigger: z.string().min(1, 'Trigger e obrigatorio'),
  triggerType: z.enum(['EXACT', 'CONTAINS', 'REGEX']).default('CONTAINS'),
  response: z.string().min(1, 'Resposta e obrigatoria'),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
});

// GET /api/auto-replies
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { active } = req.query;

    const where: Record<string, unknown> = {};
    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    const autoReplies = await prisma.autoReply.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      data: autoReplies,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auto-replies/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const autoReply = await prisma.autoReply.findUnique({
      where: { id },
    });

    if (!autoReply) {
      throw new AppError('Auto-resposta nao encontrada', 404);
    }

    res.json({
      success: true,
      data: autoReply,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auto-replies
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = autoReplySchema.parse(req.body);

    const autoReply = await prisma.autoReply.create({
      data,
    });

    res.status(201).json({
      success: true,
      data: autoReply,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auto-replies/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = autoReplySchema.partial().parse(req.body);

    const autoReply = await prisma.autoReply.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: autoReply,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/auto-replies/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.autoReply.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Auto-resposta removida com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auto-replies/:id/toggle
router.put('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const autoReply = await prisma.autoReply.findUnique({
      where: { id },
    });

    if (!autoReply) {
      throw new AppError('Auto-resposta nao encontrada', 404);
    }

    const updated = await prisma.autoReply.update({
      where: { id },
      data: { isActive: !autoReply.isActive },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
