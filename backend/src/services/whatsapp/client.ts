import { Client, LocalAuth, Message as WAMessage } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import prisma from '../../config/database.js';
import { emitToAll } from '../../config/socket.js';
import { config } from '../../config/env.js';
import { extractPhoneFromWid } from '../../utils/helpers.js';
import { handleIncomingMessage } from './messageHandler.js';

let client: Client | null = null;
let qrCodeData: string | null = null;
let isReady = false;
let connectedNumber: string | null = null;

// Status do bot
export interface BotStatus {
  isConnected: boolean;
  isReady: boolean;
  phoneNumber: string | null;
  qrCode: string | null;
}

// Retorna o status atual do bot
export function getBotStatus(): BotStatus {
  return {
    isConnected: client?.info ? true : false,
    isReady,
    phoneNumber: connectedNumber,
    qrCode: qrCodeData,
  };
}

// Retorna o cliente do WhatsApp
export function getWhatsAppClient(): Client | null {
  return client;
}

// Inicializa o cliente do WhatsApp
export async function initializeWhatsApp(): Promise<void> {
  if (client) {
    console.log('⚠️ Cliente WhatsApp ja inicializado');
    return;
  }

  console.log('🟢 Inicializando cliente WhatsApp...');

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: config.whatsapp.sessionPath,
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
      ],
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/AmeliazOli/lib/main/src/whatsapp-web/releases/ww_versions/',
    },
    // Desativa sendSeen para evitar erro de markedUnread
    webVersion: '2.2412.54',
  });

  // Evento: QR Code gerado
  client.on('qr', async (qr: string) => {
    console.log('📱 QR Code gerado. Escaneie com o WhatsApp.');

    try {
      qrCodeData = await qrcode.toDataURL(qr);
      emitToAll('bot:qr', qrCodeData);
      emitToAll('bot:status', getBotStatus());
    } catch (error) {
      console.error('❌ Erro ao gerar QR Code:', error);
    }
  });

  // Evento: Cliente pronto
  client.on('ready', async () => {
    isReady = true;
    qrCodeData = null;

    if (client?.info) {
      connectedNumber = client.info.wid.user;
      console.log(`✅ WhatsApp conectado: ${connectedNumber}`);
    }

    emitToAll('bot:status', getBotStatus());
  });

  // Evento: Autenticado
  client.on('authenticated', () => {
    console.log('🔐 WhatsApp autenticado!');
  });

  // Evento: Falha na autenticacao
  client.on('auth_failure', (msg: string) => {
    console.error('❌ Falha na autenticacao:', msg);
    isReady = false;
    qrCodeData = null;
    emitToAll('bot:status', getBotStatus());
  });

  // Evento: Desconectado
  client.on('disconnected', (reason: string) => {
    console.log('🔴 WhatsApp desconectado:', reason);
    isReady = false;
    connectedNumber = null;
    qrCodeData = null;
    emitToAll('bot:status', getBotStatus());
  });

  // Evento: Mensagem recebida
  client.on('message', async (message: WAMessage) => {
    try {
      await handleIncomingMessage(message);
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
    }
  });

  // Evento: Mensagem enviada
  client.on('message_create', async (message: WAMessage) => {
    // Processa apenas mensagens enviadas por nos
    if (message.fromMe) {
      console.log(`📤 Mensagem enviada para: ${message.to}`);
    }
  });

  // Inicializa o cliente
  try {
    await client.initialize();
  } catch (error: any) {
    console.error('❌ Erro ao inicializar WhatsApp:', error.message || error);
    client = null;
    isReady = false;
    throw error;
  }
}

// Envia mensagem
export async function sendMessage(
  phone: string,
  content: string
): Promise<WAMessage | null> {
  if (!client || !isReady) {
    throw new Error('WhatsApp nao esta conectado');
  }

  const chatId = phone.includes('@') ? phone : `${phone}@c.us`;

  try {
    // Tenta enviar diretamente sem sendSeen
    const message = await client.sendMessage(chatId, content, {
      sendSeen: false,
    });
    console.log(`✅ Mensagem enviada para ${chatId}`);
    return message;
  } catch (error: any) {
    // Se o erro for do markedUnread, tenta enviar de outra forma
    if (error.message?.includes('markedUnread')) {
      console.log('⚠️ Erro markedUnread, tentando envio alternativo...');
      try {
        // Usa evaluate direto do puppeteer para enviar
        const page = (client as any).pupPage;
        if (page) {
          await page.evaluate(async (chatId: string, content: string) => {
            const chat = await (window as any).WWebJS.getChat(chatId);
            if (chat) {
              await chat.sendMessage(content);
            }
          }, chatId, content);
          console.log(`✅ Mensagem enviada (metodo alternativo) para ${chatId}`);
          return null;
        }
      } catch (altError) {
        console.error('❌ Erro no envio alternativo:', altError);
      }
    }
    console.error('❌ Erro ao enviar mensagem:', error);
    throw error;
  }
}

// Desconecta o WhatsApp
export async function disconnectWhatsApp(): Promise<void> {
  if (client) {
    await client.logout();
    await client.destroy();
    client = null;
    isReady = false;
    connectedNumber = null;
    qrCodeData = null;
    console.log('👋 WhatsApp desconectado');
  }
}

// Reinicia o WhatsApp (gera novo QR)
export async function restartWhatsApp(): Promise<void> {
  await disconnectWhatsApp();
  await initializeWhatsApp();
}

export default {
  initializeWhatsApp,
  getWhatsAppClient,
  getBotStatus,
  sendMessage,
  disconnectWhatsApp,
  restartWhatsApp,
};
