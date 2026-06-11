// Adapter da football-data.org (free tier cobre a Copa do Mundo).
// Uma única request traz os 104 jogos: GET /v4/competitions/WC/matches
import type { ExternalMatch, ExternalStage, ResultProvider } from './provider';

const STAGE_MAP: Record<string, ExternalStage> = {
  GROUP_STAGE: 'GROUP',
  LAST_32: 'R32',
  ROUND_OF_32: 'R32',
  LAST_16: 'R16',
  ROUND_OF_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  THIRD_PLACE: 'THIRD',
  FINAL: 'FINAL',
};

// A football-data usa algumas siglas fora do padrão FIFA
const TLA_ALIASES: Record<string, string> = {
  URY: 'URU', // Uruguai
};

function normalizeTla(tla: string | null | undefined): string | null {
  if (!tla) return null;
  return TLA_ALIASES[tla] ?? tla;
}

type RawMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: { tla: string | null } | null;
  awayTeam: { tla: string | null } | null;
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT';
    fullTime: { home: number | null; away: number | null };
  };
};

export function createFootballDataProvider(token: string): ResultProvider {
  return {
    name: 'football-data.org',
    async fetchMatches(): Promise<ExternalMatch[]> {
      const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
        headers: { 'X-Auth-Token': token },
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`football-data.org respondeu ${res.status}`);
      }
      const data = (await res.json()) as { matches: RawMatch[] };
      return data.matches
        .map((m) => mapRawMatch(m))
        .filter((m): m is ExternalMatch => m !== null);
    },
  };
}

export function mapRawMatch(m: RawMatch): ExternalMatch | null {
  const stage = STAGE_MAP[m.stage];
  if (!stage) return null;
  const finished = m.status === 'FINISHED';
  const hasScore = m.score.fullTime.home != null && m.score.fullTime.away != null;
  return {
    externalId: String(m.id),
    stage,
    // A API usa 'GROUP_A' (e versões antigas, 'Group A')
    groupLetter: m.group ? m.group.replace(/^GROUP[_ ]/i, '').trim() || null : null,
    utcDate: m.utcDate,
    finished,
    homeTla: normalizeTla(m.homeTeam?.tla),
    awayTla: normalizeTla(m.awayTeam?.tla),
    fullTime: finished && hasScore ? { home: m.score.fullTime.home!, away: m.score.fullTime.away! } : null,
    penaltyWinnerSide:
      finished && m.score.duration === 'PENALTY_SHOOTOUT'
        ? m.score.winner === 'HOME_TEAM'
          ? 'HOME'
          : m.score.winner === 'AWAY_TEAM'
            ? 'AWAY'
            : null
        : null,
  };
}
