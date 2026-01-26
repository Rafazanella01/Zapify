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

// Filtra historico para garantir alternancia de roles (Gemini exige isso)
function filterAlternatingHistory(
  context: AIMessage[]
): Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> {
  const history: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];
  let lastRole: 'user' | 'model' | null = null;

  for (const msg of context) {
    const role = msg.role === 'user' ? 'user' : 'model';

    // Se o role e igual ao anterior, pula (Gemini nao aceita user->user ou model->model)
    if (role === lastRole) {
      // Se for user repetido, concatena com a mensagem anterior
      if (role === 'user' && history.length > 0) {
        history[history.length - 1].parts[0].text += '\n' + msg.content;
      }
      continue;
    }

    history.push({
      role,
      parts: [{ text: msg.content }],
    });

    lastRole = role;
  }

  // Gemini exige que o historico comece com 'user' e termine com 'model'
  // Remove mensagens iniciais se nao comecar com user
  while (history.length > 0 && history[0].role !== 'user') {
    history.shift();
  }

  // Remove ultima mensagem se for 'user' (vamos adicionar a nova mensagem)
  while (history.length > 0 && history[history.length - 1].role === 'user') {
    history.pop();
  }

  return history;
}

// Gera resposta usando Google Gemini
export async function generateGeminiResponse(
  message: string,
  context: AIMessage[],
  config: AIConfig
): Promise<string | null> {
  // Usa modelo padrao se nao estiver definido
  let modelName = config.model && config.model.trim() !== '' ? config.model : 'gemini-2.5-flash';

  // Corrige modelos antigos descontinuados
  if (modelName === 'gemini-pro' || modelName === 'gemini-1.5-flash' || modelName === 'gemini-1.5-pro' || modelName === 'gemini-2.0-flash') {
    modelName = 'gemini-2.5-flash';
  }

  console.log('🌟 Gemini chamado com modelo:', modelName);
  console.log('🔑 API Key configurada:', envConfig.ai.geminiApiKey ? 'SIM' : 'NAO');

  try {
    const client = getGeminiClient();

    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    });

    // Filtra o historico para garantir alternancia de roles
    const history = filterAlternatingHistory(context);

    console.log('📜 Historico filtrado:', history.length, 'mensagens');

    // Prepara a mensagem com system prompt
    let fullMessage = message;
    if (config.systemPrompt) {
      fullMessage = `[Instrucoes: ${config.systemPrompt}]\n\nUsuario: ${message}`;
    }

    // Se nao tiver historico, usa generateContent diretamente (mais simples)
    if (history.length === 0) {
      console.log('💬 Usando generateContent (sem historico)');
      const result = await model.generateContent(fullMessage);
      const response = result.response;
      const text = response.text();
      return text || null;
    }

    // Com historico, usa chat
    console.log('💬 Usando chat com historico');
    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    });

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
