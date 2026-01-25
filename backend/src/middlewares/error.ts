import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/env.js';

// Classe de erro customizada
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware de tratamento de erros
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('❌ Erro:', error);

  // Erro de validacao Zod
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Dados invalidos',
      details: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Erro customizado da aplicacao
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
    return;
  }

  // Erro do Prisma - registro nao encontrado
  if (error.name === 'NotFoundError') {
    res.status(404).json({
      success: false,
      error: 'Registro nao encontrado',
    });
    return;
  }

  // Erro do Prisma - violacao de constraint unica
  if ((error as { code?: string }).code === 'P2002') {
    res.status(409).json({
      success: false,
      error: 'Registro duplicado',
    });
    return;
  }

  // Erro generico
  res.status(500).json({
    success: false,
    error: config.isDev ? error.message : 'Erro interno do servidor',
    ...(config.isDev && { stack: error.stack }),
  });
}

// Middleware para rotas nao encontradas
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Rota ${req.method} ${req.path} nao encontrada`,
  });
}

export default { AppError, errorHandler, notFoundHandler };
