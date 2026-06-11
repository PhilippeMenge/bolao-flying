'use server';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { account, session, user } from '@/db/auth-schema';
import { auth } from '@/lib/auth';
import { verifyResetToken } from '@/lib/reset-token';

const schema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(128),
});

export type RedefinirSenhaResult = { ok: true } | { ok: false; error: string };

export async function redefinirSenha(payload: {
  token: string;
  newPassword: string;
}): Promise<RedefinirSenhaResult> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: 'A senha precisa ter pelo menos 8 caracteres.' };
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false, error: 'Configuração de auth ausente.' };

  const userId = verifyResetToken(parsed.data.token, secret, Date.now());
  if (!userId) {
    return { ok: false, error: 'Link inválido ou expirado — peça um novo pro admin.' };
  }

  const [targetUser] = await db.select().from(user).where(eq(user.id, userId));
  if (!targetUser) return { ok: false, error: 'Conta não encontrada.' };

  // Hash no formato do Better Auth (scrypt), via API interna dele
  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(parsed.data.newPassword);
  await db
    .update(account)
    .set({ password: hashed })
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));

  // Derruba sessões antigas — quem tinha a senha velha perde o acesso
  await db.delete(session).where(eq(session.userId, userId));

  return { ok: true };
}
