import { GoogleGenerativeAI } from '@google/generative-ai';
import { config as envConfig } from '../../config/env.js';
import type { AIMessage, AIConfig } from './provider.js';

let genAI: GoogleGenerativeAI | null = null;

// Inicializa o cliente Gemini
function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!envConfig.ai.geminiApiKey) {
      throw new Error('GEMINI_API_KEY nao configurada');
    }
    genAI = new GoogleGenerativeAI(envConfig.ai.geminiApiKey);
  }
  return genAI;
}

// Gera resposta usando Google Gemini
export async function generateGeminiResponse(
  message: string,
  context: AIMessage[],
  config: AIConfig
): Promise<string | null> {
  console.log('🌟 Gemini chamado com modelo:', config.model);
  console.log('🔑 API Key configurada:', envConfig.ai.geminiApiKey ? 'SIM' : 'NAO');

  try {
    const client = getGeminiClient();

    const model = client.getGenerativeModel({
      model: config.model || 'gemini-pro',
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    });

    // Monta o historico da conversa
    const history = context.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Inicia o chat com historico
    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    });

    // Adiciona o system prompt na primeira mensagem se existir
    let fullMessage = message;
    if (config.systemPrompt && context.length === 0) {
      fullMessage = `[Instrucoes do sistema: ${config.systemPrompt}]\n\nMensagem do usuario: ${message}`;
    }

    // Envia a mensagem e recebe a resposta
    const result = await chat.sendMessage(fullMessage);
    const response = result.response;
    const text = response.text();

    return text || null;
  } catch (error) {
    console.error('❌ Erro no Gemini:', error);
    throw error;
  }
}

export default { generateGeminiResponse };
