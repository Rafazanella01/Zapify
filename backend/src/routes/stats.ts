import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);

// GET /api/stats/overview
router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalContacts,
      totalConversations,
      activeConversations,
      totalMessages,
      messagesIn,
      messagesOut,
      todayMessages,
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: 'ACTIVE' } }),
      prisma.message.count(),
      prisma.message.count({ where: { direction: 'INCOMING' } }),
      prisma.message.count({ where: { direction: 'OUTGOING' } }),
      prisma.message.count({
        where: {
          sentAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalContacts,
        totalConversations,
        activeConversations,
        totalMessages,
        messagesIn,
        messagesOut,
        todayMessages,
        botMessages: await prisma.message.count({ where: { isFromBot: true } }),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/stats/messages
router.get('/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = Number(days);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    // Busca mensagens agrupadas por dia
    const messages = await prisma.message.findMany({
      where: {
        sentAt: { gte: startDate },
      },
      select: {
        sentAt: true,
        direction: true,
        isFromBot: true,
      },
    });

    // Agrupa por dia
    const dailyStats: Record<string, { incoming: number; outgoing: number; bot: number }> = {};

    for (let i = 0; i < daysNum; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      dailyStats[key] = { incoming: 0, outgoing: 0, bot: 0 };
    }

    messages.forEach((msg) => {
      const key = msg.sentAt.toISOString().split('T')[0];
      if (dailyStats[key]) {
        if (msg.direction === 'INCOMING') {
          dailyStats[key].incoming++;
        } else {
          dailyStats[key].outgoing++;
          if (msg.isFromBot) {
            dailyStats[key].bot++;
          }
        }
      }
    });

    // Converte para array ordenado
    const data = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/stats/contacts
router.get('/contacts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = Number(days);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const newContacts = await prisma.contact.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const blockedContacts = await prisma.contact.count({
      where: { isBlocked: true },
    });

    // Top 10 contatos por numero de mensagens
    const topContacts = await prisma.contact.findMany({
      take: 10,
      include: {
        conversations: {
          include: {
            _count: {
              select: { messages: true },
            },
          },
        },
      },
    });

    const topContactsWithCount = topContacts
      .map((contact) => ({
        id: contact.id,
        name: contact.name || contact.phone,
        phone: contact.phone,
        messageCount: contact.conversations.reduce(
          (sum, conv) => sum + conv._count.messages,
          0
        ),
      }))
      .sort((a, b) => b.messageCount - a.messageCount);

    res.json({
      success: true,
      data: {
        newContacts,
        blockedContacts,
        topContacts: topContactsWithCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/stats/hourly
router.get('/hourly', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const messages = await prisma.message.findMany({
      where: {
        sentAt: { gte: today },
      },
      select: {
        sentAt: true,
        direction: true,
      },
    });

    // Agrupa por hora
    const hourlyStats: Record<number, { incoming: number; outgoing: number }> = {};

    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { incoming: 0, outgoing: 0 };
    }

    messages.forEach((msg) => {
      const hour = msg.sentAt.getHours();
      if (msg.direction === 'INCOMING') {
        hourlyStats[hour].incoming++;
      } else {
        hourlyStats[hour].outgoing++;
      }
    });

    const data = Object.entries(hourlyStats)
      .map(([hour, stats]) => ({
        hour: Number(hour),
        ...stats,
      }))
      .sort((a, b) => a.hour - b.hour);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
