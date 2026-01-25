import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from './env.js';

let io: Server | null = null;

// Inicializa o Socket.io
export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    // Handler para marcar conversa como lida
    socket.on('conversation:read', (conversationId: string) => {
      console.log(`📖 Conversa marcada como lida: ${conversationId}`);
      // A logica sera implementada no service
    });

    // Handler para enviar mensagem
    socket.on('message:send', (data: { conversationId: string; content: string }) => {
      console.log(`📤 Enviando mensagem para conversa: ${data.conversationId}`);
      // A logica sera implementada no service
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Cliente desconectado: ${socket.id} - Motivo: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`❌ Erro no socket ${socket.id}:`, error);
    });
  });

  console.log('🔌 Socket.io inicializado');
  return io;
}

// Retorna a instancia do Socket.io
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io nao foi inicializado');
  }
  return io;
}

// Emite evento para todos os clientes
export function emitToAll(event: string, data: unknown): void {
  if (io) {
    io.emit(event, data);
  }
}

// Emite evento para um cliente especifico
export function emitToSocket(socketId: string, event: string, data: unknown): void {
  if (io) {
    io.to(socketId).emit(event, data);
  }
}

export default { initializeSocket, getIO, emitToAll, emitToSocket };
