import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: number;
  email: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ erro: 'Token de autenticação não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado');

    const payload = jwt.verify(token, secret) as JwtPayload;
    req.usuarioId = payload.id;
    req.usuarioEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}
