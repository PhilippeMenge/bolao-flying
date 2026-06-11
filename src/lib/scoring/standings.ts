// Classificação real dos grupos a partir dos resultados — funções puras, sem DB.
//
// Critérios: pontos, saldo de gols, gols pró. Desempates mais profundos da FIFA
// (confronto direto, fair play, sorteio) não são deriváveis dos placares; quando o
// oficial divergir do computado, o admin crava via override (app_config).

export type GroupMatchResult = {
  groupLetter: string;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
};

export type TeamStats = { points: number; gd: number; gf: number };

export type GroupStanding = {
  /** teamIds do 1º ao 4º */
  order: number[];
  /** true quando os 6 jogos do grupo terminaram */
  complete: boolean;
  stats: Map<number, TeamStats>;
};

const MATCHES_PER_GROUP = 6;

export function computeStandings(
  teamsByGroup: Map<string, number[]>,
  finishedResults: GroupMatchResult[],
  /** { [groupLetter]: teamId[4] } — substitui a ordem computada do grupo */
  positionOverrides: Record<string, number[]> = {},
): Map<string, GroupStanding> {
  const standings = new Map<string, GroupStanding>();

  for (const [letter, teamIds] of teamsByGroup) {
    const stats = new Map<number, TeamStats>(
      teamIds.map((id) => [id, { points: 0, gd: 0, gf: 0 }]),
    );
    const groupResults = finishedResults.filter((r) => r.groupLetter === letter);

    for (const r of groupResults) {
      const home = stats.get(r.homeTeamId);
      const away = stats.get(r.awayTeamId);
      if (!home || !away) continue;
      home.gf += r.homeScore;
      away.gf += r.awayScore;
      home.gd += r.homeScore - r.awayScore;
      away.gd += r.awayScore - r.homeScore;
      if (r.homeScore > r.awayScore) home.points += 3;
      else if (r.awayScore > r.homeScore) away.points += 3;
      else {
        home.points += 1;
        away.points += 1;
      }
    }

    const override = positionOverrides[letter];
    const order =
      override && override.length === 4
        ? [...override]
        : [...teamIds].sort((a, b) => {
            const sa = stats.get(a)!;
            const sb = stats.get(b)!;
            return (
              sb.points - sa.points || sb.gd - sa.gd || sb.gf - sa.gf || a - b
            );
          });

    standings.set(letter, {
      order,
      complete: groupResults.length === MATCHES_PER_GROUP,
      stats,
    });
  }

  return standings;
}

/**
 * Os 8 melhores terceiros (pts, SG, GP). Só é computável quando TODOS os grupos
 * terminaram; antes disso retorna null — a menos que o admin tenha cravado override.
 */
export function computeThirdPlaceAdvancers(
  standings: Map<string, GroupStanding>,
  advancersOverride: number[] | null = null,
): number[] | null {
  if (advancersOverride && advancersOverride.length > 0) return advancersOverride;

  const groups = [...standings.values()];
  if (groups.length === 0 || groups.some((g) => !g.complete)) return null;

  const thirds = groups.map((g) => ({ teamId: g.order[2], stats: g.stats.get(g.order[2])! }));
  thirds.sort(
    (a, b) =>
      b.stats.points - a.stats.points ||
      b.stats.gd - a.stats.gd ||
      b.stats.gf - a.stats.gf ||
      a.teamId - b.teamId,
  );
  return thirds.slice(0, 8).map((t) => t.teamId);
}
