import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { z } from 'zod';

// Schema de validacao
const knowledgeSchema = z.object({
  category: z.enum(['COMPANY', 'PRODUCTS', 'RULES', 'FAQ', 'PRICING', 'POLICIES']),
  title: z.string().min(1),
  content: z.string().min(1),
  isActive: z.boolean().optional(),
  priority: z.number().optional(),
});

// Lista todos os conhecimentos
export async function listKnowledge(req: Request, res: Response) {
  try {
    const { category, isActive } = req.query;

    const where: any = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const knowledge = await prisma.knowledgeBase.findMany({
      where,
      orderBy: [{ category: 'asc' }, { priority: 'desc' }, { title: 'asc' }],
    });

    res.json({ data: knowledge });
  } catch (error) {
    console.error('Erro ao listar conhecimentos:', error);
    res.status(500).json({ error: 'Erro ao listar conhecimentos' });
  }
}

// Busca um conhecimento por ID
export async function getKnowledge(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const knowledge = await prisma.knowledgeBase.findUnique({
      where: { id },
    });

    if (!knowledge) {
      return res.status(404).json({ error: 'Conhecimento nao encontrado' });
    }

    res.json({ data: knowledge });
  } catch (error) {
    console.error('Erro ao buscar conhecimento:', error);
    res.status(500).json({ error: 'Erro ao buscar conhecimento' });
  }
}

// Cria um novo conhecimento
export async function createKnowledge(req: Request, res: Response) {
  try {
    const data = knowledgeSchema.parse(req.body);

    const knowledge = await prisma.knowledgeBase.create({
      data,
    });

    res.status(201).json({ data: knowledge });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados invalidos', details: error.errors });
    }
    console.error('Erro ao criar conhecimento:', error);
    res.status(500).json({ error: 'Erro ao criar conhecimento' });
  }
}

// Atualiza um conhecimento
export async function updateKnowledge(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = knowledgeSchema.partial().parse(req.body);

    const knowledge = await prisma.knowledgeBase.update({
      where: { id },
      data,
    });

    res.json({ data: knowledge });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados invalidos', details: error.errors });
    }
    console.error('Erro ao atualizar conhecimento:', error);
    res.status(500).json({ error: 'Erro ao atualizar conhecimento' });
  }
}

// Deleta um conhecimento
export async function deleteKnowledge(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.knowledgeBase.delete({
      where: { id },
    });

    res.json({ message: 'Conhecimento removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar conhecimento:', error);
    res.status(500).json({ error: 'Erro ao deletar conhecimento' });
  }
}

// Busca todos os conhecimentos ativos para o contexto da IA
export async function getKnowledgeContext(): Promise<string> {
  const knowledge = await prisma.knowledgeBase.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { priority: 'desc' }],
  });

  if (knowledge.length === 0) {
    return '';
  }

  const categoryLabels: Record<string, string> = {
    COMPANY: 'Sobre a Empresa',
    PRODUCTS: 'Produtos e Servicos',
    RULES: 'Regras de Atendimento',
    FAQ: 'Perguntas Frequentes',
    PRICING: 'Precos e Valores',
    POLICIES: 'Politicas',
  };

  // Agrupa por categoria
  const grouped: Record<string, typeof knowledge> = {};
  for (const item of knowledge) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  }

  // Formata o contexto
  let context = '\n\n=== BASE DE CONHECIMENTO ===\n';

  for (const [category, items] of Object.entries(grouped)) {
    context += `\n### ${categoryLabels[category] || category}:\n`;
    for (const item of items) {
      context += `- ${item.title}: ${item.content}\n`;
    }
  }

  context += '\n=== FIM DA BASE DE CONHECIMENTO ===\n';
  context += '\nIMPORTANTE: Use APENAS as informacoes acima para responder sobre a empresa, produtos, precos e politicas. Se o cliente perguntar algo que nao esta na base de conhecimento, informe que voce nao tem essa informacao e ofereca conectar com um atendente humano.\n';

  return context;
}

export default {
  listKnowledge,
  getKnowledge,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  getKnowledgeContext,
};
