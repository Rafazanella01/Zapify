import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Schema de validacao das variaveis de ambiente
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // AI Providers
  AI_PROVIDER: z.enum(['gemini', 'openai', 'anthropic']).default('gemini'),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // AI Config
  AI_MODEL: z.string().optional(),
  AI_TEMPERATURE: z.string().default('0.7'),
  AI_MAX_TOKENS: z.string().default('1000'),

  // WhatsApp
  WHATSAPP_SESSION_PATH: z.string().default('./whatsapp-session'),
});

// Valida e exporta as variaveis de ambiente
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Variaveis de ambiente invalidas:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();

// Configuracoes derivadas
export const config = {
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  port: parseInt(env.PORT, 10),
  frontendUrl: env.FRONTEND_URL,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  ai: {
    provider: env.AI_PROVIDER,
    geminiApiKey: env.GEMINI_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    model: env.AI_MODEL,
    temperature: parseFloat(env.AI_TEMPERATURE),
    maxTokens: parseInt(env.AI_MAX_TOKENS, 10),
  },
  whatsapp: {
    sessionPath: env.WHATSAPP_SESSION_PATH,
  },
};

export default config;
