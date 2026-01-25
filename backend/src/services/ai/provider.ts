import prisma from '../../config/database.js';
import { generateGeminiResponse } from './gemini.js';
import { generateOpenAIResponse } from './openai.js';
import { generateClaudeResponse } from './anthropic.js';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

// Gera resposta da IA usando o provider configurado
export async function generateAIResponse(
  message: string,
  context: AIMessage[] = [],
  customSystemPrompt?: string
): Promise<string | null> {
  // Busca configuracao do bot
  const botConfig = await prisma.botConfig.findUnique({
    where: { id: 'default' },
  });

  if (!botConfig) {
    console.error('❌ Configuracao do bot nao encontrada');
    return null;
  }

  const config: AIConfig = {
    provider: botConfig.aiProvider,
    model: botConfig.aiModel,
    temperature: botConfig.aiTemperature,
    maxTokens: botConfig.aiMaxTokens,
    systemPrompt: customSystemPrompt || botConfig.systemPrompt || getDefaultSystemPrompt(),
  };

  try {
    switch (config.provider) {
      case 'gemini':
        return await generateGeminiResponse(message, context, config);

      case 'openai':
        return await generateOpenAIResponse(message, context, config);

      case 'anthropic':
        return await generateClaudeResponse(message, context, config);

      default:
        console.error(`❌ Provider de IA desconhecido: ${config.provider}`);
        return null;
    }
  } catch (error) {
    console.error(`❌ Erro ao gerar resposta da IA (${config.provider}):`, error);
    return null;
  }
}

// Prompt do sistema padrao
function getDefaultSystemPrompt(): string {
  return `Voce e um assistente virtual de atendimento ao cliente via WhatsApp.

Diretrizes:
- Seja educado, profissional e prestativo
- Responda de forma clara e objetiva
- Use linguagem adequada para WhatsApp (mensagens curtas e diretas)
- Se nao souber algo, seja honesto e ofereca alternativas
- Evite respostas muito longas
- Use emojis com moderacao quando apropriado
- Sempre tente ajudar o cliente a resolver sua duvida ou problema`;
}

// Atualiza contexto da conversa no banco
export async function updateConversationContext(
  conversationId: string,
  messages: AIMessage[]
): Promise<void> {
  // Mantem apenas as ultimas 20 mensagens no contexto
  const recentMessages = messages.slice(-20);

  await prisma.conversationContext.upsert({
    where: { conversationId },
    update: {
      messages: recentMessages,
      updatedAt: new Date(),
    },
    create: {
      conversationId,
      messages: recentMessages,
    },
  });
}

// Busca contexto da conversa
export async function getConversationContext(
  conversationId: string
): Promise<AIMessage[]> {
  const context = await prisma.conversationContext.findUnique({
    where: { conversationId },
  });

  return (context?.messages as AIMessage[]) || [];
}

export default {
  generateAIResponse,
  updateConversationContext,
  getConversationContext,
};
