import OpenAI from 'openai';
import { config as envConfig } from '../../config/env.js';
import type { AIMessage, AIConfig } from './provider.js';

let openai: OpenAI | null = null;

// Inicializa o cliente OpenAI
function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!envConfig.ai.openaiApiKey) {
      throw new Error('OPENAI_API_KEY nao configurada');
    }
    openai = new OpenAI({
      apiKey: envConfig.ai.openaiApiKey,
    });
  }
  return openai;
}

// Gera resposta usando OpenAI GPT
export async function generateOpenAIResponse(
  message: string,
  context: AIMessage[],
  config: AIConfig
): Promise<string | null> {
  try {
    const client = getOpenAIClient();

    // Monta as mensagens para a API
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Adiciona o system prompt
    if (config.systemPrompt) {
      messages.push({
        role: 'system',
        content: config.systemPrompt,
      });
    }

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
    const completion = await client.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    });

    const response = completion.choices[0]?.message?.content;
    return response || null;
  } catch (error) {
    console.error('❌ Erro no OpenAI:', error);
    throw error;
  }
}

export default { generateOpenAIResponse };
