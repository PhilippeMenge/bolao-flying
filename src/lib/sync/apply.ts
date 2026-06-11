// Planejador do sync — função pura: compara os jogos externos com os nossos e
// decide o que aplicar. Toda a I/O fica em run-sync.ts.
import type { ExternalMatch } from './provider';

export type OurMatchForSync = {
  id: number;
  stage: string;
  groupLetter: string | null;
  kickoffAt: Date;
  homeTeamId: number | null;
  awayTeamId: number | null;
  status: 'SCHEDULED' | 'FINISHED';
  resultLockedByAdmin: boolean;
  externalId: string | null;
};

export type TeamForSync = { id: number; fifaCode: string };

export type SyncPlan = {
  /** Vincula externalId aos nossos jogos (uma vez mapeado, fica estável) */
  linkExternal: { matchId: number; externalId: string }[];
  /** Preenche times de confrontos do mata-mata ainda TBD */
  fillTeams: { matchId: number; homeTeamId: number | null; awayTeamId: number | null }[];
  /** Resultados a aplicar (jogos FINISHED no provedor, não travados pelo admin) */
  results: {
    matchId: number;
    isKnockout: boolean;
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number;
    awayScore: number;
    penaltyWinnerTeamId: number | null;
  }[];
  /** Jogos externos que não conseguimos mapear (pro admin conferir) */
  unmatched: string[];
};

export function planSync(
  ourMatches: OurMatchForSync[],
  teams: TeamForSync[],
  external: ExternalMatch[],
): SyncPlan {
  const plan: SyncPlan = { linkExternal: [], fillTeams: [], results: [], unmatched: [] };

  const teamByTla = new Map(teams.map((t) => [t.fifaCode, t.id]));
  const ourByExternalId = new Map(
    ourMatches.filter((m) => m.externalId).map((m) => [m.externalId!, m]),
  );
  const claimed = new Set<number>();

  for (const ext of external) {
    const our = findOurMatch(ext, ourMatches, ourByExternalId, teamByTla, claimed);
    if (!our) {
      plan.unmatched.push(ext.externalId);
      continue;
    }
    claimed.add(our.id);

    if (our.externalId !== ext.externalId) {
      plan.linkExternal.push({ matchId: our.id, externalId: ext.externalId });
    }

    // Preenche confrontos TBD do mata-mata quando o provedor já sabe os times
    let homeTeamId = our.homeTeamId;
    let awayTeamId = our.awayTeamId;
    if (our.stage !== 'GROUP') {
      const extHome = ext.homeTla ? (teamByTla.get(ext.homeTla) ?? null) : null;
      const extAway = ext.awayTla ? (teamByTla.get(ext.awayTla) ?? null) : null;
      const newHome = homeTeamId ?? extHome;
      const newAway = awayTeamId ?? extAway;
      if (newHome !== homeTeamId || newAway !== awayTeamId) {
        plan.fillTeams.push({ matchId: our.id, homeTeamId: newHome, awayTeamId: newAway });
        homeTeamId = newHome;
        awayTeamId = newAway;
      }
    }

    if (ext.finished && ext.fullTime && !our.resultLockedByAdmin && homeTeamId && awayTeamId) {
      // Orienta o placar pelo NOSSO mandante: se o provedor listar os lados
      // invertidos, troca placar e lado dos pênaltis
      const extHomeId = ext.homeTla ? (teamByTla.get(ext.homeTla) ?? null) : null;
      const swapped = extHomeId !== null && extHomeId === awayTeamId;
      const homeScore = swapped ? ext.fullTime.away : ext.fullTime.home;
      const awayScore = swapped ? ext.fullTime.home : ext.fullTime.away;
      const penaltySide = !ext.penaltyWinnerSide
        ? null
        : swapped
          ? ext.penaltyWinnerSide === 'HOME'
            ? 'AWAY'
            : 'HOME'
          : ext.penaltyWinnerSide;
      plan.results.push({
        matchId: our.id,
        isKnockout: our.stage !== 'GROUP',
        homeTeamId,
        awayTeamId,
        homeScore,
        awayScore,
        penaltyWinnerTeamId:
          penaltySide === 'HOME' ? homeTeamId : penaltySide === 'AWAY' ? awayTeamId : null,
      });
    }
  }

  return plan;
}

function findOurMatch(
  ext: ExternalMatch,
  ourMatches: OurMatchForSync[],
  ourByExternalId: Map<string, OurMatchForSync>,
  teamByTla: Map<string, number>,
  claimed: Set<number>,
): OurMatchForSync | null {
  // 1. Já vinculado por externalId
  const linked = ourByExternalId.get(ext.externalId);
  if (linked) return linked;

  const available = ourMatches.filter((m) => !claimed.has(m.id) && !m.externalId);

  // 2. Pelo par de times (único na fase de grupos; no mata-mata desempata por horário)
  const homeId = ext.homeTla ? teamByTla.get(ext.homeTla) : undefined;
  const awayId = ext.awayTla ? teamByTla.get(ext.awayTla) : undefined;
  if (homeId && awayId) {
    const byTeams = available.filter(
      (m) =>
        m.stage === (ext.stage === 'GROUP' ? 'GROUP' : m.stage) &&
        ((m.homeTeamId === homeId && m.awayTeamId === awayId) ||
          (m.homeTeamId === awayId && m.awayTeamId === homeId)),
    );
    if (byTeams.length === 1) return byTeams[0];
    if (byTeams.length > 1) {
      byTeams.sort(
        (a, b) =>
          Math.abs(a.kickoffAt.getTime() - Date.parse(ext.utcDate)) -
          Math.abs(b.kickoffAt.getTime() - Date.parse(ext.utcDate)),
      );
      return byTeams[0];
    }
  }

  // 3. Por horário exato + fase (+ grupo) — cobre confrontos TBD
  const byTime = available.filter(
    (m) =>
      m.stage === ext.stage &&
      m.kickoffAt.getTime() === Date.parse(ext.utcDate) &&
      (ext.stage !== 'GROUP' || m.groupLetter === ext.groupLetter),
  );
  if (byTime.length === 1) return byTime[0];

  return null;
}
