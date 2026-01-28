import { Client, LocalAuth, Message as WAMessage } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import prisma from '../../config/database.js';
import { emitToAll } from '../../config/socket.js';
import { config } from '../../config/env.js';
import { extractPhoneFromWid } from '../../utils/helpers.js';
import { handleIncomingMessage } from './messageHandler.js';

let client: Client | null = null;
let qrCodeData: string | null = null;
let isReady = false;
let connectedNumber: string | null = null;
let isInitializing = false;
let browserPid: number | null = null;

// Mata apenas o processo do browser do puppeteer (não o navegador do usuario)
async function killPuppeteerBrowser(): Promise<void> {
  // Tenta pegar o PID do browser do puppeteer
  if (client) {
    try {
      const browser = (client as any).pupBrowser;
      if (browser) {
        const process = browser.process();
        if (process?.pid) {
          browserPid = process.pid;
        }
        await browser.close();
      }
    } catch (err) {
      // Ignora erro se browser ja fechou
    }
  }

  // Se temos o PID, mata o processo especifico
  if (browserPid) {
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const cmd = isWindows
        ? `taskkill /F /PID ${browserPid} /T 2>nul`
        : `kill -9 ${browserPid} 2>/dev/null`;

      exec(cmd, () => {
        browserPid = null;
        resolve();
      });
    });
  }
}

// Limpa pasta de sessao corrompida
function clearSessionFolder(): void {
  const sessionPath = config.whatsapp.sessionPath;
  if (fs.existsSync(sessionPath)) {
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('🧹 Pasta de sessao limpa');
    } catch (err) {
      console.error('⚠️ Erro ao limpar pasta de sessao:', err);
    }
  }
}

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
export async function initializeWhatsApp(retryCount = 0): Promise<void> {
  if (isInitializing) {
    console.log('⚠️ Inicializacao ja em andamento');
    return;
  }

  if (client) {
    console.log('⚠️ Cliente WhatsApp ja inicializado');
    return;
  }

  isInitializing = true;
  console.log('🟢 Inicializando cliente WhatsApp...');

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: config.whatsapp.sessionPath,
    }),
    puppeteer: {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    },
  });

  // Evento: QR Code gerado
  client.on('qr', async (qr: string) => {
    console.log('📱 QR Code gerado. Escaneie com o WhatsApp.');

    // Salva PID do browser para cleanup posterior
    try {
      const browser = (client as any).pupBrowser;
      if (browser?.process()?.pid) {
        browserPid = browser.process().pid;
      }
    } catch (err) {}

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

    // Salva PID do browser para cleanup posterior
    try {
      const browser = (client as any).pupBrowser;
      if (browser?.process()?.pid) {
        browserPid = browser.process().pid;
      }
    } catch (err) {}

    if (client?.info) {
      connectedNumber = client.info.wid.user;
      console.log(`✅ WhatsApp conectado: ${connectedNumber}`);
    }

    emitToAll('bot:status', getBotStatus());
  });

  // Evento: Autenticado
  client.on('authenticated', () => {
    console.log('🔐 WhatsApp autenticado! Aguardando conexao...');
  });

  // Evento: Carregando tela
  client.on('loading_screen', (percent: number, message: string) => {
    console.log(`⏳ Carregando: ${percent}% - ${message}`);
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

  // Timeout para detectar conexao travada (90 segundos)
  const initTimeout = setTimeout(async () => {
    if (!isReady && client) {
      console.log('⚠️ Timeout na conexao. Sessao pode estar corrompida.');
      console.log('🔄 Limpando sessao e tentando novamente...');

      try {
        await client.destroy();
      } catch (err) {}

      client = null;
      isInitializing = false;
      clearSessionFolder();

      // Emite status para o frontend saber que precisa reconectar
      emitToAll('bot:status', { ...getBotStatus(), needsReconnect: true });
    }
  }, 90000);

  // Inicializa o cliente
  try {
    await client.initialize();
    clearTimeout(initTimeout);
    isInitializing = false;
  } catch (error: any) {
    clearTimeout(initTimeout);
    const errorMsg = error.message || error;
    console.error('❌ Erro ao inicializar WhatsApp:', errorMsg);

    // Limpa estado
    client = null;
    isReady = false;
    isInitializing = false;

    // Se for erro de browser travado ou conexao, limpa e tenta novamente
    const isRecoverableError =
      errorMsg.includes('already running') ||
      errorMsg.includes('ERR_CONNECTION') ||
      errorMsg.includes('ECONNREFUSED') ||
      errorMsg.includes('Target closed');

    if (isRecoverableError && retryCount < 2) {
      console.log('🔄 Limpando recursos e tentando novamente...');
      await killPuppeteerBrowser();
      clearSessionFolder();

      // Aguarda um pouco antes de tentar novamente
      await new Promise((r) => setTimeout(r, 2000));
      return initializeWhatsApp(retryCount + 1);
    }

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
export async function disconnectWhatsApp(clearSession = false): Promise<void> {
  isInitializing = false;

  if (client) {
    try {
      await client.logout();
    } catch (err) {
      // Ignora erro de logout se ja desconectado
    }

    try {
      await client.destroy();
    } catch (err) {
      // Ignora erro de destroy
    }

    client = null;
  }

  isReady = false;
  connectedNumber = null;
  qrCodeData = null;

  // Garante que processos orfaos sejam limpos
  await killPuppeteerBrowser();

  if (clearSession) {
    clearSessionFolder();
  }

  console.log('👋 WhatsApp desconectado');
}

// Reinicia o WhatsApp (gera novo QR)
export async function restartWhatsApp(): Promise<void> {
  await disconnectWhatsApp(true);
  await new Promise((r) => setTimeout(r, 1000));
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
