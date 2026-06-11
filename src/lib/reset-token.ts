// Token de reset de senha assinado (HMAC) com validade — puro e testável.
// O admin gera o link e manda pra pessoa por fora (WhatsApp etc.); sem email.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(`reset:${payload}`).digest('hex');
}

export function createResetToken(
  userId: string,
  secret: string,
  nowMs: number,
  ttlMs: number = RESET_TOKEN_TTL_MS,
): string {
  const expiresAt = nowMs + ttlMs;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Retorna o userId se o token for válido e não expirado; senão null. */
export function verifyResetToken(token: string, secret: string, nowMs: number): string | null {
  const parts = token.split('.');
  if (parts.length < 3) return null;
  const signature = parts.pop()!;
  const expiresRaw = parts.pop()!;
  const userId = parts.join('.');
  const expiresAt = Number(expiresRaw);
  if (!userId || !Number.isFinite(expiresAt)) return null;

  const expected = Buffer.from(sign(`${userId}.${expiresRaw}`, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (nowMs >= expiresAt) return null;
  return userId;
}
