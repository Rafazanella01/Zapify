import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { initializeSocket } from './config/socket.js';
import { errorHandler, notFoundHandler } from './middlewares/error.js';

// Importa rotas
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import autoReplyRoutes from './routes/autoReplies.js';
import templateRoutes from './routes/templates.js';
import flowRoutes from './routes/flows.js';
import configRoutes from './routes/config.js';
import statsRoutes from './routes/stats.js';

// Importa servico do WhatsApp
import { initializeWhatsApp } from './services/whatsapp/client.js';

const app = express();
const httpServer = createServer(app);

// Middlewares globais
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requisicoes em desenvolvimento
if (config.isDev) {
  app.use((req, _res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/auto-replies', autoReplyRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/flows', flowRoutes);
app.use('/api/config', configRoutes);
app.use('/api/stats', statsRoutes);

// Rota de health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middlewares de erro
app.use(notFoundHandler);
app.use(errorHandler);

// Inicializa o servidor
async function bootstrap() {
  try {
    // Conecta ao banco de dados
    await connectDatabase();

    // Inicializa Socket.io
    initializeSocket(httpServer);

    // Inicia o servidor HTTP
    httpServer.listen(config.port, () => {
      console.log(`
🚀 Servidor Zapify iniciado!
📡 API: http://localhost:${config.port}
🌐 Frontend: ${config.frontendUrl}
      `);

      // Inicializa o WhatsApp Bot em background (nao bloqueia o servidor)
      initializeWhatsApp().catch((err) => {
        console.error('⚠️ WhatsApp nao inicializado:', err.message);
        console.log('💡 Acesse o dashboard para conectar o WhatsApp.');
      });
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido. Encerrando...');
  httpServer.close(() => {
    console.log('👋 Servidor encerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido. Encerrando...');
  httpServer.close(() => {
    console.log('👋 Servidor encerrado.');
    process.exit(0);
  });
});

bootstrap();
