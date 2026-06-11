// Carrega tudo do banco e roda as funções puras de pontuação.
import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  groupPredictions,
  knockoutPredictions,
  matches,
  participants,
  teams,
  thirdPlacePicks,
} from '@/db/schema';
import { CONFIG_KEYS } from '@/lib/config';
import { getConfigValue } from '@/lib/app-config';
import { computeLeaderboard, type LeaderboardRow } from './leaderboard';
import {
  computeStandings,
  computeThirdPlaceAdvancers,
  type GroupMatchResult,
  type GroupStanding,
} from './standings';

export type LeaderboardData = {
  rows: LeaderboardRow[];
  standings: Map<string, GroupStanding>;
  finishedGroupCount: number;
  finishedKnockoutCount: number;
};

export async function loadLeaderboard(): Promise<LeaderboardData> {
  const [
    allParticipants,
    allTeams,
    finishedMatches,
    allGroupPredictions,
    allThirdPicks,
    allKnockoutPredictions,
    positionOverrides,
    advancersOverride,
  ] = await Promise.all([
    db.select().from(participants),
    db.select().from(teams),
    db.select().from(matches).where(eq(matches.status, 'FINISHED')),
    db.select().from(groupPredictions),
    db.select().from(thirdPlacePicks),
    db.select().from(knockoutPredictions),
    getConfigValue<Record<string, number[]>>(CONFIG_KEYS.groupPositionOverrides),
    getConfigValue<number[]>(CONFIG_KEYS.thirdPlaceAdvancersOverride),
  ]);

  const teamsByGroup = new Map<string, number[]>();
  for (const t of allTeams) {
    let list = teamsByGroup.get(t.groupLetter);
    if (!list) teamsByGroup.set(t.groupLetter, (list = []));
    list.push(t.id);
  }

  const groupResults: GroupMatchResult[] = finishedMatches
    .filter((m) => m.stage === 'GROUP' && m.homeTeamId && m.awayTeamId)
    .map((m) => ({
      groupLetter: m.groupLetter!,
      homeTeamId: m.homeTeamId!,
      awayTeamId: m.awayTeamId!,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
    }));

  const standings = computeStandings(teamsByGroup, groupResults, positionOverrides ?? {});
  const thirdAdvancers = computeThirdPlaceAdvancers(standings, advancersOverride);

  const knockoutResults = finishedMatches
    .filter((m) => m.stage !== 'GROUP' && m.homeTeamId && m.awayTeamId)
    .map((m) => ({
      matchId: m.id,
      homeTeamId: m.homeTeamId!,
      awayTeamId: m.awayTeamId!,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
      penaltyWinnerTeamId: m.penaltyWinnerTeamId,
    }));

  const rows = computeLeaderboard({
    participants: allParticipants,
    groupPredictions: allGroupPredictions,
    thirdPicks: allThirdPicks,
    standings,
    thirdAdvancers,
    knockoutResults,
    knockoutPredictions: allKnockoutPredictions,
  });

  return {
    rows,
    standings,
    finishedGroupCount: [...standings.values()].filter((s) => s.complete).length,
    finishedKnockoutCount: knockoutResults.length,
  };
}
