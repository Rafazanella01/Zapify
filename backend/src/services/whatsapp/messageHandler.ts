import { Message as WAMessage } from 'whatsapp-web.js';
import prisma from '../../config/database.js';
import { emitToAll } from '../../config/socket.js';
import { extractPhoneFromWid, matchesTrigger, isWithinBusinessHours, randomDelay } from '../../utils/helpers.js';
import { generateAIResponse } from '../ai/provider.js';
import { sendMessage } from './client.js';

// Processa mensagem recebida
export async function handleIncomingMessage(waMessage: WAMessage): Promise<void> {
  // Ignora mensagens de grupo por enquanto
  if (waMessage.from.includes('@g.us')) {
    return;
  }

  // Ignora mensagens enviadas por nos
  if (waMessage.fromMe) {
    return;
  }

  const phone = extractPhoneFromWid(waMessage.from);
  const content = waMessage.body;
  const messageType = waMessage.type;

  console.log(`📩 Mensagem de ${phone}: ${content}`);

  // Busca ou cria o contato
  let contact = await prisma.contact.findUnique({
    where: { phone },
  });

  if (!contact) {
    const waContact = await waMessage.getContact();
    contact = await prisma.contact.create({
      data: {
        phone,
        name: waContact.pushname || waContact.name || null,
        profilePic: await waContact.getProfilePicUrl() || null,
      },
    });
  }

  // Verifica se o contato esta bloqueado
  if (contact.isBlocked) {
    console.log(`🚫 Contato bloqueado: ${phone}`);
    return;
  }

  // Busca ou cria a conversa
  let conversation = await prisma.conversation.findFirst({
    where: {
      contactId: contact.id,
      status: 'ACTIVE',
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        contactId: contact.id,
        status: 'ACTIVE',
      },
    });
  }

  // Salva a mensagem recebida
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content,
      type: mapMessageType(messageType),
      direction: 'INCOMING',
      isFromBot: false,
    },
  });

  // Atualiza a conversa
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      unreadCount: { increment: 1 },
    },
  });

  // Emite evento de nova mensagem
  emitToAll('message:new', {
    ...message,
    conversation: {
      ...conversation,
      contact,
    },
  });

  // Busca configuracao do bot
  const botConfig = await prisma.botConfig.findUnique({
    where: { id: 'default' },
  });

  console.log('🔧 Config do bot:', {
    isActive: botConfig?.isActive,
    aiProvider: botConfig?.aiProvider,
    aiModel: botConfig?.aiModel,
  });

  // Se o bot nao esta ativo, nao responde
  if (!botConfig?.isActive) {
    console.log('⏸️ Bot desativado, nao vai responder');
    return;
  }

  // Verifica horario de atendimento
  const withinHours = isWithinBusinessHours(
    botConfig.businessHoursStart,
    botConfig.businessHoursEnd,
    botConfig.businessDays
  );

  if (!withinHours && botConfig.awayMessage) {
    await randomDelay();
    await sendBotMessage(conversation.id, botConfig.awayMessage, phone);
    return;
  }

  // Verifica auto-respostas
  const autoReply = await findMatchingAutoReply(content);
  console.log('🔍 Auto-resposta encontrada:', autoReply?.trigger || 'nenhuma');
  if (autoReply) {
    console.log('📤 Enviando auto-resposta:', autoReply.response.substring(0, 50));
    await randomDelay();
    await sendBotMessage(conversation.id, autoReply.response, phone);
    return;
  }

  // Verifica fluxos
  const flow = await findMatchingFlow(content);
  if (flow) {
    await randomDelay();
    await executeFlow(conversation.id, flow, phone);
    return;
  }

  // Se nenhuma regra especifica, usa IA
  console.log('🤖 Tentando usar IA:', botConfig.aiProvider);
  if (botConfig.aiProvider) {
    try {
      // Busca contexto da conversa
      const recentMessages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { sentAt: 'desc' },
        take: 10,
      });

      const context = recentMessages.reverse().map((m) => ({
        role: m.direction === 'INCOMING' ? 'user' : 'assistant',
        content: m.content,
      }));

      console.log('🧠 Gerando resposta da IA...');
      const aiResponse = await generateAIResponse(
        content,
        context as Array<{ role: 'user' | 'assistant'; content: string }>,
        botConfig.systemPrompt || undefined
      );

      console.log('🤖 Resposta da IA:', aiResponse ? aiResponse.substring(0, 50) + '...' : 'null');

      if (aiResponse) {
        await randomDelay(1500, 4000);
        await sendBotMessage(conversation.id, aiResponse, phone);
      } else {
        console.log('⚠️ IA nao retornou resposta');
      }
    } catch (error) {
      console.error('❌ Erro ao gerar resposta da IA:', error);
    }
  }
}

// Envia mensagem do bot e salva no banco
async function sendBotMessage(
  conversationId: string,
  content: string,
  phone: string
): Promise<void> {
  try {
    await sendMessage(phone, content);

    const message = await prisma.message.create({
      data: {
        conversationId,
        content,
        type: 'TEXT',
        direction: 'OUTGOING',
        isFromBot: true,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Busca a conversa com o contato para emitir
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    emitToAll('message:new', {
      ...message,
      conversation,
    });
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem do bot:', error);
  }
}

// Busca auto-resposta correspondente
async function findMatchingAutoReply(content: string) {
  const autoReplies = await prisma.autoReply.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });

  for (const reply of autoReplies) {
    if (matchesTrigger(content, reply.trigger, reply.triggerType)) {
      return reply;
    }
  }

  return null;
}

// Busca fluxo correspondente
async function findMatchingFlow(content: string) {
  const flows = await prisma.flow.findMany({
    where: { isActive: true },
  });

  for (const flow of flows) {
    if (matchesTrigger(content, flow.trigger, flow.triggerType)) {
      return flow;
    }
  }

  return null;
}

// Executa um fluxo
async function executeFlow(
  conversationId: string,
  flow: { id: string; steps: unknown },
  phone: string
): Promise<void> {
  const steps = flow.steps as Array<{
    type: string;
    content: string;
    delay?: number;
  }>;

  if (!steps || steps.length === 0) return;

  for (const step of steps) {
    if (step.type === 'message' && step.content) {
      if (step.delay) {
        await new Promise((resolve) => setTimeout(resolve, step.delay));
      }
      await sendBotMessage(conversationId, step.content, phone);
    }
  }
}

// Mapeia tipo de mensagem do WhatsApp para o nosso enum
function mapMessageType(
  waType: string
): 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'STICKER' {
  const typeMap: Record<string, 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'STICKER'> = {
    chat: 'TEXT',
    image: 'IMAGE',
    audio: 'AUDIO',
    ptt: 'AUDIO',
    video: 'VIDEO',
    document: 'DOCUMENT',
    sticker: 'STICKER',
  };

  return typeMap[waType] || 'TEXT';
}

export default { handleIncomingMessage };
