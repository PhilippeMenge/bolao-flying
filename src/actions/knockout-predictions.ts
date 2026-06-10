'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { knockoutPredictions, matches } from '@/db/schema';
import { isLocked } from '@/lib/locks';
import { getCurrentParticipant } from '@/lib/session';

const palpiteSchema = z.object({
  matchId: z.number().int().min(73).max(104),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  penaltyWinnerTeamId: z.number().int().positive().nullable(),
});

export type PalpiteMataMataResult = { ok: true } | { ok: false; error: string };

export async function salvarPalpiteMataMata(
  payload: z.infer<typeof palpiteSchema>,
): Promise<PalpiteMataMataResult> {
  const participant = await getCurrentParticipant();
  if (!participant) return { ok: false, error: 'Você precisa se identificar primeiro.' };

  const parsed = palpiteSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: 'Palpite inválido.' };
  const { matchId, homeScore, awayScore, penaltyWinnerTeamId } = parsed.data;

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match || match.stage === 'GROUP') return { ok: false, error: 'Jogo não encontrado.' };
  if (!match.homeTeamId || !match.awayTeamId) {
    return { ok: false, error: 'O confronto ainda não foi definido.' };
  }
  // Trava individual: cada palpite fecha no horário do jogo
  if (isLocked(match.kickoffAt, new Date())) {
    return { ok: false, error: 'Esse jogo já travou — palpite fechado.' };
  }

  const isDraw = homeScore === awayScore;
  if (isDraw) {
    if (!penaltyWinnerTeamId) {
      return { ok: false, error: 'Empate: escolha quem passa nos pênaltis.' };
    }
    if (penaltyWinnerTeamId !== match.homeTeamId && penaltyWinnerTeamId !== match.awayTeamId) {
      return { ok: false, error: 'O vencedor dos pênaltis precisa ser um dos dois times.' };
    }
  }

  await db
    .insert(knockoutPredictions)
    .values({
      participantId: participant.id,
      matchId,
      homeScore,
      awayScore,
      penaltyWinnerTeamId: isDraw ? penaltyWinnerTeamId : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [knockoutPredictions.participantId, knockoutPredictions.matchId],
      set: {
        homeScore,
        awayScore,
        penaltyWinnerTeamId: isDraw ? penaltyWinnerTeamId : null,
        updatedAt: new Date(),
      },
    });

  revalidatePath('/palpites/mata-mata');
  revalidatePath('/');
  return { ok: true };
}
