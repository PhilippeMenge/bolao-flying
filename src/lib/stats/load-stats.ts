// Carrega palpites do banco e roda o motor de stats — com gate de privacidade:
// nada é exposto antes do prazo da fase de grupos travar.
import 'server-only';
import { db } from '@/db';
import { groupPredictions, participants, thirdPlacePicks, type Team } from '@/db/schema';
import { CONFIG_KEYS } from '@/lib/config';
import { getConfigValue } from '@/lib/app-config';
import { isLocked } from '@/lib/locks';
import { loadStandings } from '@/lib/scoring/load-leaderboard';
import type { GroupStanding } from '@/lib/scoring/standings';
import { computeBetStats, type BetStats } from './bets';

export type BetStatsData =
  | { locked: false }
  | {
      locked: true;
      stats: BetStats;
      allTeams: Team[];
      standings: Map<string, GroupStanding>;
      participantCount: number;
    };

export async function loadBetStats(): Promise<BetStatsData> {
  const deadline = await getConfigValue<string>(CONFIG_KEYS.groupStageDeadline);
  if (!deadline || !isLocked(new Date(deadline), new Date())) {
    return { locked: false };
  }

  const [standingsData, allParticipants, allGroupPredictions, allThirdPicks] = await Promise.all([
    loadStandings(),
    db.select().from(participants),
    db.select().from(groupPredictions),
    db.select().from(thirdPlacePicks),
  ]);

  const stats = computeBetStats({
    participants: allParticipants,
    groupPredictions: allGroupPredictions,
    thirdPicks: allThirdPicks,
    standings: standingsData.standings,
  });

  return {
    locked: true,
    stats,
    allTeams: standingsData.allTeams,
    standings: standingsData.standings,
    participantCount: allParticipants.length,
  };
}
