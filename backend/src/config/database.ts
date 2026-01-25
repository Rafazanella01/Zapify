import { PrismaClient } from '@prisma/client';

// Singleton do Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Funcao para conectar ao banco
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('📦 Conectado ao banco de dados PostgreSQL');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

// Funcao para desconectar do banco
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('📦 Desconectado do banco de dados');
}

export default prisma;
