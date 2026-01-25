import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import prisma from '../config/database.js';

// Extende o tipo Request para incluir o usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
}

// Middleware de autenticacao
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Token de autenticacao nao fornecido',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Usuario nao encontrado',
        });
        return;
      }

      req.user = user;
      next();
    } catch {
      res.status(401).json({
        success: false,
        error: 'Token invalido ou expirado',
      });
    }
  } catch (error) {
    next(error);
  }
}

// Middleware para verificar se e admin
export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Acesso negado. Apenas administradores.',
    });
    return;
  }
  next();
}

// Gera token JWT
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

export default { authMiddleware, adminMiddleware, generateToken };
