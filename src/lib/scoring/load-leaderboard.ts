// Carrega tudo do banco e roda as funções puras de pontuação.
import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  groupPredictions,
  knockoutPredictions,
  matches,
  participants,
  teams,
  thirdPlacePicks,
  type Team,
} from '@/db/schema';
import { CONFIG_KEYS } from '@/lib/config';
import { getConfigValue } from '@/lib/app-config';
import { computeLeaderboard, type LeaderboardRow } from './leaderboard';
import {
  computeLiveThirdRanking,
  computeStandings,
  computeThirdPlaceAdvancers,
  type GroupMatchResult,
  type GroupStanding,
  type LiveThird,
} from './standings';

export type StandingsData = {
  standings: Map<string, GroupStanding>;
  /** Tabela ao vivo dos 3ºs (grupos que já jogaram), ranqueada */
  liveThirdRanking: LiveThird[];
  /** Os 8 terceiros definitivos (12 grupos fechados ou override), senão null */
  thirdAdvancers: number[] | null;
  allTeams: Team[];
};

export async function loadStandings(): Promise<StandingsData> {
  const [allTeams, finishedGroupMatches, positionOverrides, advancersOverride] =
    await Promise.all([
      db.select().from(teams),
      db
        .select()
        .from(matches)
        .where(and(eq(matches.status, 'FINISHED'), eq(matches.stage, 'GROUP'))),
      getConfigValue<Record<string, number[]>>(CONFIG_KEYS.groupPositionOverrides),
      getConfigValue<number[]>(CONFIG_KEYS.thirdPlaceAdvancersOverride),
    ]);

  const teamsByGroup = new Map<string, number[]>();
  for (const t of allTeams) {
    let list = teamsByGroup.get(t.groupLetter);
    if (!list) teamsByGroup.set(t.groupLetter, (list = []));
    list.push(t.id);
  }

  const groupResults: GroupMatchResult[] = finishedGroupMatches
    .filter((m) => m.homeTeamId && m.awayTeamId)
    .map((m) => ({
      groupLetter: m.groupLetter!,
      homeTeamId: m.homeTeamId!,
      awayTeamId: m.awayTeamId!,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
    }));

  const standings = computeStandings(teamsByGroup, groupResults, positionOverrides ?? {});
  return {
    standings,
    liveThirdRanking: computeLiveThirdRanking(standings),
    thirdAdvancers: computeThirdPlaceAdvancers(standings, advancersOverride),
    allTeams,
  };
}

export type LeaderboardData = {
  rows: LeaderboardRow[];
  standings: Map<string, GroupStanding>;
  finishedGroupCount: number;
  /** Grupos com 1–5 jogos encerrados (pontuando ao vivo) */
  liveGroupCount: number;
  finishedKnockoutCount: number;
};

export async function loadLeaderboard(): Promise<LeaderboardData> {
  const [
    standingsData,
    allParticipants,
    finishedMatches,
    allGroupPredictions,
    allThirdPicks,
    allKnockoutPredictions,
  ] = await Promise.all([
    loadStandings(),
    db.select().from(participants),
    db.select().from(matches).where(eq(matches.status, 'FINISHED')),
    db.select().from(groupPredictions),
    db.select().from(thirdPlacePicks),
    db.select().from(knockoutPredictions),
  ]);
  const { standings, thirdAdvancers } = standingsData;

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

  const groupList = [...standings.values()];
  return {
    rows,
    standings,
    finishedGroupCount: groupList.filter((s) => s.complete).length,
    liveGroupCount: groupList.filter((s) => s.playedMatches > 0 && !s.complete).length,
    finishedKnockoutCount: knockoutResults.length,
  };
}
