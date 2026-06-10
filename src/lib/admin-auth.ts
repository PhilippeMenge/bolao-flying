// Auth do painel admin: conta com role 'admin' (Better Auth) OU senha única
// (ADMIN_PASSWORD -> cookie HMAC) como acesso de emergência.
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { auth } from './auth';

const COOKIE_NAME = 'bf_admin';
const COOKIE_PAYLOAD = 'admin-v1';

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET não configurado');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(`admin:${payload}`).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(password, expected);
}

export async function setAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${COOKIE_PAYLOAD}.${sign(COOKIE_PAYLOAD)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 120,
    path: '/',
  });
}

export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

async function hasAdminCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const dotIndex = raw.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const payload = raw.slice(0, dotIndex);
  const signature = raw.slice(dotIndex + 1);
  return payload === COOKIE_PAYLOAD && safeEqual(signature, sign(payload));
}

async function hasAdminRole(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
}

export async function isAdmin(): Promise<boolean> {
  return (await hasAdminRole()) || (await hasAdminCookie());
}

/** Usar no início de TODA server action de admin. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error('Acesso negado');
}
