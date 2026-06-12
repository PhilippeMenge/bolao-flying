// Executor do sync: busca no provedor, planeja (puro) e aplica no banco.
import 'server-only';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { matches, teams } from '@/db/schema';
import { CONFIG_KEYS } from '@/lib/config';
import { getConfigValue, setConfigValue } from '@/lib/app-config';
import { planSync } from './apply';
import { createFootballDataProvider } from './football-data';
import { propagateKnockoutSlots } from './propagate';
import type { ResultProvider } from './provider';

export type SyncSummary = {
  at: string;
  provider: string;
  skipped?: 'disabled' | 'no-token';
  error?: string;
  matched?: number;
  unmatched?: number;
  teamsFilled?: number;
  resultsApplied?: number;
};

export function getDefaultProvider(): ResultProvider | null {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return null;
  return createFootballDataProvider(token);
}

export async function runSync(provider?: ResultProvider | null): Promise<SyncSummary> {
  const base = { at: new Date().toISOString() };

  const enabled = await getConfigValue<boolean>(CONFIG_KEYS.syncEnabled);
  if (!enabled) {
    return { ...base, provider: 'nenhum', skipped: 'disabled' };
  }

  const activeProvider = provider ?? getDefaultProvider();
  if (!activeProvider) {
    const summary: SyncSummary = { ...base, provider: 'nenhum', skipped: 'no-token' };
    await setConfigValue(CONFIG_KEYS.lastSync, summary);
    return summary;
  }

  try {
    const external = await activeProvider.fetchMatches();
    const [ourMatches, allTeams] = await Promise.all([
      db.select().from(matches),
      db.select().from(teams),
    ]);

    const plan = planSync(ourMatches, allTeams, external);

    for (const link of plan.linkExternal) {
      await db.update(matches).set({ externalId: link.externalId }).where(eq(matches.id, link.matchId));
    }
    for (const fill of plan.fillTeams) {
      await db
        .update(matches)
        .set({ homeTeamId: fill.homeTeamId, awayTeamId: fill.awayTeamId })
        .where(eq(matches.id, fill.matchId));
    }
    for (const result of plan.results) {
      await db
        .update(matches)
        .set({
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          penaltyWinnerTeamId: result.penaltyWinnerTeamId,
          status: 'FINISHED',
        })
        .where(eq(matches.id, result.matchId));

      if (result.isKnockout) {
        const winnerId =
          result.homeScore > result.awayScore
            ? result.homeTeamId
            : result.awayScore > result.homeScore
              ? result.awayTeamId
              : result.penaltyWinnerTeamId;
        if (winnerId) {
          const loserId = winnerId === result.homeTeamId ? result.awayTeamId : result.homeTeamId;
          await propagateKnockoutSlots(result.matchId, winnerId, loserId);
        }
      }
    }

    const summary: SyncSummary = {
      ...base,
      provider: activeProvider.name,
      matched: external.length - plan.unmatched.length,
      unmatched: plan.unmatched.length,
      teamsFilled: plan.fillTeams.length,
      resultsApplied: plan.results.length,
    };
    await setConfigValue(CONFIG_KEYS.lastSync, summary);

    if (plan.results.length > 0 || plan.fillTeams.length > 0) {
      revalidatePath('/jogos');
      revalidatePath('/grupos');
      revalidatePath('/classificacao');
      revalidatePath('/palpites/mata-mata');
      revalidatePath('/');
    }
    return summary;
  } catch (error) {
    const summary: SyncSummary = {
      ...base,
      provider: activeProvider.name,
      error: error instanceof Error ? error.message : 'erro desconhecido',
    };
    await setConfigValue(CONFIG_KEYS.lastSync, summary);
    return summary;
  }
}
