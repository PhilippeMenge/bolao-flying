// Identidade do participante via sessão do Better Auth.
// getCurrentParticipant() continua sendo o ÚNICO ponto de auth que o resto do app usa.
import 'server-only';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { participants, type Participant } from '@/db/schema';
import { auth } from './auth';

export async function getCurrentParticipant(): Promise<Participant | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [existing] = await db
    .select()
    .from(participants)
    .where(eq(participants.userId, session.user.id));
  if (existing) return existing;

  // Primeiro acesso pós-cadastro: cria o participante com o nome do signup.
  // Se o nome já existir (unique), desambigua com o username (que é único).
  const baseName = session.user.name.trim() || 'Sem nome';
  const usernameSuffix =
    (session.user as { username?: string | null }).username ?? session.user.id.slice(0, 6);
  const candidates = [baseName, `${baseName} (@${usernameSuffix})`];
  for (const name of candidates) {
    try {
      const [created] = await db
        .insert(participants)
        .values({ name, userId: session.user.id })
        .onConflictDoNothing({ target: participants.name })
        .returning();
      if (created) return created;
    } catch {
      // Conflito no unique de userId (corrida com outra request) — re-busca abaixo
    }
    const [raced] = await db
      .select()
      .from(participants)
      .where(eq(participants.userId, session.user.id));
    if (raced) return raced;
  }
  throw new Error('Não foi possível criar o participante');
}
