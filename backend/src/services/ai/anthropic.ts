import Anthropic from '@anthropic-ai/sdk';
import { config as envConfig } from '../../config/env.js';
import type { AIMessage, AIConfig } from './provider.js';

let anthropic: Anthropic | null = null;

// Inicializa o cliente Anthropic
function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    if (!envConfig.ai.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY nao configurada');
    }
    anthropic = new Anthropic({
      apiKey: envConfig.ai.anthropicApiKey,
    });
  }
  return anthropic;
}

// Gera resposta usando Anthropic Claude
export async function generateClaudeResponse(
  message: string,
  context: AIMessage[],
  config: AIConfig
): Promise<string | null> {
  try {
    const client = getAnthropicClient();

    // Monta as mensagens para a API
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Adiciona o contexto da conversa
    for (const msg of context) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Adiciona a mensagem atual
    messages.push({
      role: 'user',
      content: message,
    });

    // Faz a chamada para a API
    const response = await client.messages.create({
      model: config.model || 'claude-3-haiku-20240307',
      max_tokens: config.maxTokens,
      system: config.systemPrompt,
      messages,
    });

    // Extrai o texto da resposta
    const textBlock = response.content.find((block) => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      return textBlock.text;
    }

    return null;
  } catch (error) {
    console.error('❌ Erro no Anthropic:', error);
    throw error;
  }
}

export default { generateClaudeResponse };
