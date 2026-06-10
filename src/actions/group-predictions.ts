'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { groupPredictions, teams, thirdPlacePicks } from '@/db/schema';
import { GROUP_LETTERS, THIRD_PLACE_ADVANCER_COUNT } from '@/lib/config';
import { getGroupStageDeadline } from '@/lib/app-config';
import { isLocked } from '@/lib/locks';
import { getCurrentParticipant } from '@/lib/session';

const groupLetterSchema = z.enum(GROUP_LETTERS);

const payloadSchema = z.object({
  // Ordem apostada (1º..4º) de cada um dos 12 grupos, por teamId
  groups: z.record(groupLetterSchema, z.array(z.number().int().positive()).length(4)),
  // Grupos cujo 3º previsto o participante marcou como classificado (até 8)
  thirdGroups: z.array(groupLetterSchema).max(THIRD_PLACE_ADVANCER_COUNT),
});

export type SalvarPalpitesResult = { ok: true } | { ok: false; error: string };

export type SalvarPalpitesInput = {
  groups: Record<string, number[]>;
  thirdGroups: string[];
};

export async function salvarPalpitesGrupos(
  payload: SalvarPalpitesInput,
): Promise<SalvarPalpitesResult> {
  const participant = await getCurrentParticipant();
  if (!participant) return { ok: false, error: 'Você precisa se identificar primeiro.' };

  const deadline = await getGroupStageDeadline();
  if (isLocked(deadline, new Date())) {
    return { ok: false, error: 'O prazo já encerrou — os palpites estão travados.' };
  }

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: 'Palpite inválido.' };
  const { groups, thirdGroups } = parsed.data;

  if (Object.keys(groups).length !== GROUP_LETTERS.length) {
    return { ok: false, error: 'Envie a ordem completa dos 12 grupos.' };
  }
  if (new Set(thirdGroups).size !== thirdGroups.length) {
    return { ok: false, error: 'Terceiros repetidos.' };
  }

  // Cada grupo precisa ser uma permutação exata das 4 seleções daquele grupo
  const allTeams = await db.select().from(teams);
  for (const letter of GROUP_LETTERS) {
    const submitted = groups[letter]!;
    const actual = allTeams.filter((t) => t.groupLetter === letter).map((t) => t.id);
    const submittedSet = new Set(submitted);
    if (submittedSet.size !== 4 || actual.length !== 4 || !actual.every((id) => submittedSet.has(id))) {
      return { ok: false, error: `Ordem inválida no grupo ${letter}.` };
    }
  }

  const predictionRows = GROUP_LETTERS.flatMap((letter) =>
    groups[letter]!.map((teamId, index) => ({
      participantId: participant.id,
      teamId,
      groupLetter: letter,
      position: index + 1,
    })),
  );
  // O 3º marcado é sempre o 3º previsto do próprio participante naquele grupo
  const thirdRows = thirdGroups.map((letter) => ({
    participantId: participant.id,
    teamId: groups[letter]![2],
  }));

  await db.delete(groupPredictions).where(eq(groupPredictions.participantId, participant.id));
  await db.delete(thirdPlacePicks).where(eq(thirdPlacePicks.participantId, participant.id));
  await db.insert(groupPredictions).values(predictionRows);
  if (thirdRows.length > 0) await db.insert(thirdPlacePicks).values(thirdRows);

  revalidatePath('/palpites/grupos');
  revalidatePath('/');
  return { ok: true };
}
