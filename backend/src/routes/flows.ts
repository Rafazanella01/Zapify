import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import { AppError } from '../middlewares/error.js';

const router = Router();

router.use(authMiddleware);

// Schema de validacao para steps
const flowStepSchema = z.object({
  id: z.string(),
  type: z.enum(['message', 'question', 'condition', 'action']),
  content: z.string(),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
    nextStepId: z.string(),
  })).optional(),
  nextStepId: z.string().optional(),
  delay: z.number().optional(),
});

// Schema de validacao para flow
const flowSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  trigger: z.string().min(1, 'Trigger e obrigatorio'),
  triggerType: z.enum(['EXACT', 'CONTAINS', 'REGEX']).default('CONTAINS'),
  steps: z.array(flowStepSchema).default([]),
  isActive: z.boolean().default(true),
});

// GET /api/flows
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { active } = req.query;

    const where: Record<string, unknown> = {};
    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    const flows = await prisma.flow.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: flows,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/flows/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const flow = await prisma.flow.findUnique({
      where: { id },
    });

    if (!flow) {
      throw new AppError('Fluxo nao encontrado', 404);
    }

    res.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/flows
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = flowSchema.parse(req.body);

    const flow = await prisma.flow.create({
      data: {
        name: data.name,
        trigger: data.trigger,
        triggerType: data.triggerType,
        steps: data.steps,
        isActive: data.isActive,
      },
    });

    res.status(201).json({
      success: true,
      data: flow,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/flows/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = flowSchema.partial().parse(req.body);

    const flow = await prisma.flow.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/flows/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.flow.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Fluxo removido com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/flows/:id/toggle
router.put('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const flow = await prisma.flow.findUnique({
      where: { id },
    });

    if (!flow) {
      throw new AppError('Fluxo nao encontrado', 404);
    }

    const updated = await prisma.flow.update({
      where: { id },
      data: { isActive: !flow.isActive },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/flows/:id/duplicate
router.post('/:id/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const flow = await prisma.flow.findUnique({
      where: { id },
    });

    if (!flow) {
      throw new AppError('Fluxo nao encontrado', 404);
    }

    const duplicate = await prisma.flow.create({
      data: {
        name: `${flow.name} (Copia)`,
        trigger: flow.trigger,
        triggerType: flow.triggerType,
        steps: flow.steps as [],
        isActive: false,
      },
    });

    res.status(201).json({
      success: true,
      data: duplicate,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
