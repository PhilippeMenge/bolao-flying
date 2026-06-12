'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { matches, participants, teams } from '@/db/schema';
import { user } from '@/db/auth-schema';
import { CONFIG_KEYS } from '@/lib/config';
import { setConfigValue } from '@/lib/app-config';
import { createResetToken } from '@/lib/reset-token';
import { propagateKnockoutSlots } from '@/lib/sync/propagate';
import { runSync, type SyncSummary } from '@/lib/sync/run-sync';
import {
  checkAdminPassword,
  clearAdminCookie,
  requireAdmin,
  setAdminCookie,
} from '@/lib/admin-auth';

export type AdminResult = { ok: true } | { ok: false; error: string };

export async function loginAdmin(formData: FormData): Promise<AdminResult> {
  const password = String(formData.get('password') ?? '');
  if (!checkAdminPassword(password)) {
    return { ok: false, error: 'Senha incorreta.' };
  }
  await setAdminCookie();
  redirect('/admin');
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminCookie();
  redirect('/admin/login');
}

const resultadoSchema = z.object({
  matchId: z.number().int().min(1).max(104),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  penaltyWinnerTeamId: z.number().int().positive().nullable(),
  resultLockedByAdmin: z.boolean(),
});

export async function salvarResultado(
  payload: z.infer<typeof resultadoSchema>,
): Promise<AdminResult> {
  await requireAdmin();
  const parsed = resultadoSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
  const { matchId, homeScore, awayScore, penaltyWinnerTeamId, resultLockedByAdmin } = parsed.data;

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) return { ok: false, error: 'Jogo não encontrado.' };
  if (!match.homeTeamId || !match.awayTeamId) {
    return { ok: false, error: 'Defina os times do confronto antes do resultado.' };
  }

  const isKnockout = match.stage !== 'GROUP';
  const isDraw = homeScore === awayScore;
  if (isKnockout && isDraw) {
    if (!penaltyWinnerTeamId) {
      return { ok: false, error: 'Empate no mata-mata: informe quem venceu nos pênaltis.' };
    }
    if (penaltyWinnerTeamId !== match.homeTeamId && penaltyWinnerTeamId !== match.awayTeamId) {
      return { ok: false, error: 'O vencedor dos pênaltis precisa ser um dos dois times.' };
    }
  }
  const effectivePenaltyWinner = isKnockout && isDraw ? penaltyWinnerTeamId : null;

  await db
    .update(matches)
    .set({
      homeScore,
      awayScore,
      penaltyWinnerTeamId: effectivePenaltyWinner,
      status: 'FINISHED',
      resultLockedByAdmin,
    })
    .where(eq(matches.id, matchId));

  // Propaga vencedor/perdedor para os slots do mata-mata (ex: 'W89', 'L101')
  if (isKnockout) {
    const winnerId = isDraw
      ? effectivePenaltyWinner!
      : homeScore > awayScore
        ? match.homeTeamId
        : match.awayTeamId;
    const loserId = winnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
    await propagateKnockoutSlots(matchId, winnerId, loserId);
  }

  revalidatePath('/jogos');
  revalidatePath('/grupos');
  revalidatePath('/');
  revalidatePath('/admin/resultados');
  return { ok: true };
}

export async function limparResultado(matchId: number): Promise<AdminResult> {
  await requireAdmin();
  await db
    .update(matches)
    .set({
      homeScore: null,
      awayScore: null,
      penaltyWinnerTeamId: null,
      status: 'SCHEDULED',
      resultLockedByAdmin: false,
    })
    .where(eq(matches.id, matchId));
  revalidatePath('/jogos');
  revalidatePath('/grupos');
  revalidatePath('/admin/resultados');
  return { ok: true };
}

const renomearSchema = z.object({
  participantId: z.uuid(),
  name: z.string().trim().min(2).max(40),
});

export async function renomearParticipante(
  payload: z.infer<typeof renomearSchema>,
): Promise<AdminResult> {
  await requireAdmin();
  const parsed = renomearSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: 'Nome inválido (2 a 40 caracteres).' };
  try {
    await db
      .update(participants)
      .set({ name: parsed.data.name })
      .where(eq(participants.id, parsed.data.participantId));
  } catch {
    return { ok: false, error: 'Já existe um participante com esse nome.' };
  }
  revalidatePath('/admin/participantes');
  revalidatePath('/classificacao');
  return { ok: true };
}

export async function excluirConta(participantId: string): Promise<AdminResult> {
  await requireAdmin();
  const parsed = z.uuid().safeParse(participantId);
  if (!parsed.success) return { ok: false, error: 'Id inválido.' };

  const [participant] = await db.select().from(participants).where(eq(participants.id, parsed.data));
  if (!participant) return { ok: false, error: 'Participante não encontrado.' };

  // Cascata remove os palpites; depois a conta de login (cascata remove sessões/credenciais).
  await db.delete(participants).where(eq(participants.id, participant.id));
  if (participant.userId) {
    await db.delete(user).where(eq(user.id, participant.userId));
  }

  revalidatePath('/admin/participantes');
  revalidatePath('/classificacao');
  return { ok: true };
}

export type LinkResetResult = { ok: true; url: string } | { ok: false; error: string };

export async function gerarLinkResetSenha(participantId: string): Promise<LinkResetResult> {
  await requireAdmin();
  const parsed = z.uuid().safeParse(participantId);
  if (!parsed.success) return { ok: false, error: 'Id inválido.' };

  const [participant] = await db.select().from(participants).where(eq(participants.id, parsed.data));
  if (!participant) return { ok: false, error: 'Participante não encontrado.' };
  if (!participant.userId) {
    return { ok: false, error: 'Esse participante não tem conta de login (registro antigo).' };
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false, error: 'Configuração de auth ausente.' };

  const token = createResetToken(participant.userId, secret, Date.now());
  const origin =
    (await headers()).get('origin') ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  return { ok: true, url: `${origin}/resetar-senha?token=${encodeURIComponent(token)}` };
}

const confrontoSchema = z.object({
  matchId: z.number().int().min(73).max(104),
  homeTeamId: z.number().int().positive().nullable(),
  awayTeamId: z.number().int().positive().nullable(),
});

export async function definirConfronto(
  payload: z.infer<typeof confrontoSchema>,
): Promise<AdminResult> {
  await requireAdmin();
  const parsed = confrontoSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' };
  const { matchId, homeTeamId, awayTeamId } = parsed.data;

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match || match.stage === 'GROUP') return { ok: false, error: 'Jogo não encontrado.' };
  if (match.status === 'FINISHED') {
    return { ok: false, error: 'Jogo já tem resultado — limpe o resultado antes de mudar o confronto.' };
  }
  if (homeTeamId && awayTeamId && homeTeamId === awayTeamId) {
    return { ok: false, error: 'Os dois lados não podem ser o mesmo time.' };
  }

  await db.update(matches).set({ homeTeamId, awayTeamId }).where(eq(matches.id, matchId));

  revalidatePath('/palpites/mata-mata');
  revalidatePath('/jogos');
  revalidatePath('/admin/confrontos');
  return { ok: true };
}

export async function salvarPrazoGrupos(deadlineIso: string): Promise<AdminResult> {
  await requireAdmin();
  const date = new Date(deadlineIso);
  if (Number.isNaN(date.getTime())) return { ok: false, error: 'Data inválida.' };
  await setConfigValue(CONFIG_KEYS.groupStageDeadline, date.toISOString());
  revalidatePath('/');
  revalidatePath('/palpites/grupos');
  revalidatePath('/admin/config');
  return { ok: true };
}

export async function alternarSync(enabled: boolean): Promise<AdminResult> {
  await requireAdmin();
  await setConfigValue(CONFIG_KEYS.syncEnabled, enabled === true);
  revalidatePath('/admin/config');
  return { ok: true };
}

export async function sincronizarAgora(): Promise<SyncSummary> {
  await requireAdmin();
  const summary = await runSync();
  revalidatePath('/admin/config');
  return summary;
}
