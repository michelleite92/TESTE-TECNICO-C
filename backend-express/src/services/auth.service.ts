import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAsync } from '../database/db';
import { Usuario } from '../types';

export async function autenticar(email: string, senha: string): Promise<string> {
  const usuario = await getAsync<Usuario>(
    'SELECT * FROM usuarios WHERE email = ?',
    [email]
  );

  if (!usuario) {
    throw new Error('Credenciais inválidas');
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaValida) {
    throw new Error('Credenciais inválidas');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado');

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as any }
  );

  return token;
}
