import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import { AppError } from '../middlewares/error.js';

const router = Router();

router.use(authMiddleware);

// Schema de validacao
const templateSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  content: z.string().min(1, 'Conteudo e obrigatorio'),
  variables: z.array(z.string()).default([]),
  category: z.string().default('geral'),
  isActive: z.boolean().default(true),
});

// GET /api/templates
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, active } = req.query;

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = String(category);
    }

    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/templates/categories
router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await prisma.template.findMany({
      select: { category: true },
      distinct: ['category'],
    });

    const categories = templates.map((t) => t.category).sort();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/templates/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new AppError('Template nao encontrado', 404);
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/templates
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = templateSchema.parse(req.body);

    // Extrai variaveis do conteudo (formato: {{variavel}})
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = data.content.matchAll(variableRegex);
    const extractedVariables = [...new Set([...matches].map((m) => m[1]))];

    const template = await prisma.template.create({
      data: {
        ...data,
        variables: extractedVariables.length > 0 ? extractedVariables : data.variables,
      },
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/templates/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = templateSchema.partial().parse(req.body);

    // Se o conteudo foi alterado, re-extrai as variaveis
    if (data.content) {
      const variableRegex = /\{\{(\w+)\}\}/g;
      const matches = data.content.matchAll(variableRegex);
      const extractedVariables = [...new Set([...matches].map((m) => m[1]))];
      if (extractedVariables.length > 0) {
        data.variables = extractedVariables;
      }
    }

    const template = await prisma.template.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/templates/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.template.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Template removido com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/templates/:id/preview
router.post('/:id/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { variables } = req.body as { variables: Record<string, string> };

    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new AppError('Template nao encontrado', 404);
    }

    let preview = template.content;
    for (const [key, value] of Object.entries(variables || {})) {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    res.json({
      success: true,
      data: { preview },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
