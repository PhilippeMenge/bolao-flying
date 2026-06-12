// Estatísticas das apostas — funções puras, sem DB.
//
// Tudo aqui é computado SÓ com palpites já travados (o gate fica no loader/página):
// matriz de % por posição, consenso do bolão, zebras, ousadia por participante,
// discórdia por grupo e raio-X dos terceiros.
import type { GroupStanding } from '../scoring/standings';

export type BetStatsInput = {
  participants: { id: string; name: string }[];
  groupPredictions: {
    participantId: string;
    teamId: number;
    groupLetter: string;
    position: number;
  }[];
  thirdPicks: { participantId: string; teamId: number }[];
  /** Classificação ao vivo (computeStandings) — usada no consenso × realidade */
  standings: Map<string, GroupStanding>;
};

export type PositionMatrixRow = {
  teamId: number;
  /** counts[i] = quantos apostaram o time na posição i+1 */
  counts: [number, number, number, number];
  /** pct[i] = % (0–100, sem arredondar) */
  pct: [number, number, number, number];
};

export type GroupMatrix = {
  /** participantes com palpite completo (4 times) nesse grupo */
  n: number;
  /** ordem do consenso (1º ao 4º) */
  consensusOrder: number[];
  /** linhas na ordem do consenso */
  rows: PositionMatrixRow[];
};

export type Favorito = { teamId: number; groupLetter: string; pct: number };
export type Unanimidade = { groupLetter: string; teamId: number; position: number };
export type Contramao = {
  groupLetter: string;
  teamId: number;
  participantId: string;
  participantName: string;
};
export type ZebraNoRadar = {
  teamId: number;
  groupLetter: string;
  consensusPos: number;
  /** % de quem apostou o time exatamente na posição do consenso */
  consensusPct: number;
  livePos: number;
};
export type OusadiaRow = {
  participantId: string;
  name: string;
  /** 0–100: % dos pares de times invertidos em relação ao consenso */
  zebraPct: number;
  groupsCounted: number;
};
export type DiscordiaRow = {
  groupLetter: string;
  n: number;
  /** quantas ordenações diferentes foram apostadas */
  distinctOrders: number;
  /** share (0–100) da ordenação mais comum */
  topShare: number;
};
export type TerceiroConfianca = { teamId: number; count: number; pct: number };

export type BetStats = {
  matrices: Map<string, GroupMatrix>;
  favoritos: Favorito[];
  unanimidades: Unanimidade[];
  contramao: Contramao[];
  zebrasNoRadar: ZebraNoRadar[];
  ousadia: OusadiaRow[];
  /** ordenado: 1º = grupo da discórdia, último = grupo zen */
  discordia: DiscordiaRow[];
  terceiros: TerceiroConfianca[];
  /** participantes com palpite dos terceiros */
  terceirosPickers: number;
};

const POSITIONS = 4;
const PAIRS_PER_GROUP = 6; // C(4,2)

/** Pares (i<j) em ordem relativa diferente entre duas ordenações dos mesmos 4 times. */
export function countInversions(order: number[], reference: number[]): number {
  const refIndex = new Map(reference.map((id, i) => [id, i]));
  let inversions = 0;
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const ri = refIndex.get(order[i]);
      const rj = refIndex.get(order[j]);
      if (ri === undefined || rj === undefined) continue;
      if (ri > rj) inversions++;
    }
  }
  return inversions;
}

export function computeBetStats(input: BetStatsInput): BetStats {
  const nameById = new Map(input.participants.map((p) => [p.id, p.name]));

  // ordem apostada por grupo/participante (só palpites completos de 4 times)
  const byGroup = new Map<string, Map<string, number[]>>();
  for (const p of input.groupPredictions) {
    let group = byGroup.get(p.groupLetter);
    if (!group) byGroup.set(p.groupLetter, (group = new Map()));
    let order = group.get(p.participantId);
    if (!order) group.set(p.participantId, (order = []));
    order[p.position - 1] = p.teamId;
  }
  for (const group of byGroup.values()) {
    for (const [pid, order] of group) {
      if (order.length !== POSITIONS || order.some((t) => t == null)) group.delete(pid);
    }
  }

  const matrices = new Map<string, GroupMatrix>();
  const favoritos: Favorito[] = [];
  const unanimidades: Unanimidade[] = [];
  const contramao: Contramao[] = [];
  const discordia: DiscordiaRow[] = [];

  const letters = [...byGroup.keys()].sort();
  for (const letter of letters) {
    const orders = byGroup.get(letter)!;
    const n = orders.size;
    if (n === 0) continue;

    // contagem por time × posição
    const countsByTeam = new Map<number, [number, number, number, number]>();
    for (const order of orders.values()) {
      order.forEach((teamId, i) => {
        let counts = countsByTeam.get(teamId);
        if (!counts) countsByTeam.set(teamId, (counts = [0, 0, 0, 0]));
        counts[i]++;
      });
    }

    // consenso: posição média asc, desempate % de 1º desc, teamId asc
    const consensusOrder = [...countsByTeam.keys()].sort((a, b) => {
      const ca = countsByTeam.get(a)!;
      const cb = countsByTeam.get(b)!;
      const avg = (c: number[]) => c.reduce((sum, count, i) => sum + count * (i + 1), 0) / n;
      return avg(ca) - avg(cb) || cb[0] - ca[0] || a - b;
    });

    matrices.set(letter, {
      n,
      consensusOrder,
      rows: consensusOrder.map((teamId) => {
        const counts = countsByTeam.get(teamId)!;
        return {
          teamId,
          counts,
          pct: counts.map((c) => (c / n) * 100) as PositionMatrixRow['pct'],
        };
      }),
    });

    for (const [teamId, counts] of countsByTeam) {
      favoritos.push({ teamId, groupLetter: letter, pct: (counts[0] / n) * 100 });
      if (n >= 2) {
        counts.forEach((count, i) => {
          if (count === n) unanimidades.push({ groupLetter: letter, teamId, position: i + 1 });
        });
      }
      // zebra solitária: só 1 pessoa cravou esse time em 1º
      if (n >= 3 && counts[0] === 1) {
        const lone = [...orders.entries()].find(([, order]) => order[0] === teamId);
        if (lone) {
          contramao.push({
            groupLetter: letter,
            teamId,
            participantId: lone[0],
            participantName: nameById.get(lone[0]) ?? '???',
          });
        }
      }
    }

    // discórdia: ordenações distintas + share da mais comum
    const orderCounts = new Map<string, number>();
    for (const order of orders.values()) {
      const key = order.join('-');
      orderCounts.set(key, (orderCounts.get(key) ?? 0) + 1);
    }
    discordia.push({
      groupLetter: letter,
      n,
      distinctOrders: orderCounts.size,
      topShare: (Math.max(...orderCounts.values()) / n) * 100,
    });
  }

  favoritos.sort((a, b) => b.pct - a.pct || a.teamId - b.teamId);
  discordia.sort(
    (a, b) =>
      b.distinctOrders - a.distinctOrders ||
      a.topShare - b.topShare ||
      a.groupLetter.localeCompare(b.groupLetter),
  );

  // consenso × realidade: onde a tabela ao vivo desmente o bolão
  const zebrasNoRadar: ZebraNoRadar[] = [];
  for (const [letter, matrix] of matrices) {
    const standing = input.standings.get(letter);
    if (!standing || standing.playedMatches === 0) continue;
    matrix.consensusOrder.forEach((teamId, i) => {
      const livePos = standing.order.indexOf(teamId) + 1;
      if (livePos === 0 || livePos === i + 1) return;
      const row = matrix.rows[i];
      zebrasNoRadar.push({
        teamId,
        groupLetter: letter,
        consensusPos: i + 1,
        consensusPct: row.pct[i],
        livePos,
      });
    });
  }
  zebrasNoRadar.sort(
    (a, b) =>
      b.consensusPct * Math.abs(b.consensusPos - b.livePos) -
      a.consensusPct * Math.abs(a.consensusPos - a.livePos),
  );

  // ousadia: distância média do consenso (inversões de pares, 0..6 por grupo)
  const ousadia: OusadiaRow[] = [];
  for (const participant of input.participants) {
    let inversions = 0;
    let groupsCounted = 0;
    for (const [letter, orders] of byGroup) {
      const order = orders.get(participant.id);
      const matrix = matrices.get(letter);
      if (!order || !matrix) continue;
      groupsCounted++;
      inversions += countInversions(order, matrix.consensusOrder);
    }
    if (groupsCounted === 0) continue;
    ousadia.push({
      participantId: participant.id,
      name: participant.name,
      zebraPct: (inversions / (PAIRS_PER_GROUP * groupsCounted)) * 100,
      groupsCounted,
    });
  }
  ousadia.sort((a, b) => b.zebraPct - a.zebraPct || a.name.localeCompare(b.name, 'pt-BR'));

  // raio-X dos terceiros: % de participantes que confiaram em cada time
  const pickers = new Set(input.thirdPicks.map((t) => t.participantId));
  const thirdCounts = new Map<number, number>();
  for (const pick of input.thirdPicks) {
    thirdCounts.set(pick.teamId, (thirdCounts.get(pick.teamId) ?? 0) + 1);
  }
  const terceiros: TerceiroConfianca[] = [...thirdCounts.entries()]
    .map(([teamId, count]) => ({
      teamId,
      count,
      pct: pickers.size > 0 ? (count / pickers.size) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.teamId - b.teamId);

  return {
    matrices,
    favoritos: favoritos.slice(0, 5),
    unanimidades,
    contramao,
    zebrasNoRadar: zebrasNoRadar.slice(0, 6),
    ousadia,
    discordia,
    terceiros,
    terceirosPickers: pickers.size,
  };
}
