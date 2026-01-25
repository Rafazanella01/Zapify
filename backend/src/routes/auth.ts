import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/database.js';
import { authMiddleware, generateToken } from '../middlewares/auth.js';
import { AppError } from '../middlewares/error.js';

const router = Router();

// Schema de validacao para login
const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

// Schema de validacao para registro
const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Credenciais invalidas', 401);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new AppError('Credenciais invalidas', 401);
    }

    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('Email ja cadastrado', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Verifica se e o primeiro usuario (sera admin)
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'OPERATOR';

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    const token = generateToken(user.id, user.email);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: { user: req.user },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/password
router.put('/password', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6),
    }).parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw new AppError('Usuario nao encontrado', 404);
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      throw new AppError('Senha atual incorreta', 401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Senha alterada com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
