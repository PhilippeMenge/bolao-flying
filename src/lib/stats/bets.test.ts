import { describe, expect, it } from 'vitest';
import { computeStandings } from '../scoring/standings';
import { computeBetStats, countInversions, type BetStatsInput } from './bets';

// Fixture: 2 grupos (A: 1–4, B: 5–8), 3 participantes
const PARTICIPANTS = [
  { id: 'ana', name: 'Ana' },
  { id: 'beto', name: 'Beto' },
  { id: 'caio', name: 'Caio' },
];

function order(participantId: string, groupLetter: string, teamIds: number[]) {
  return teamIds.map((teamId, i) => ({ participantId, teamId, groupLetter, position: i + 1 }));
}

const GROUP_PREDICTIONS = [
  // grupo A: consenso = [1,2,3,4]
  ...order('ana', 'A', [1, 2, 3, 4]),
  ...order('beto', 'A', [1, 2, 4, 3]),
  ...order('caio', 'A', [2, 1, 3, 4]),
  // grupo B: quase unânime
  ...order('ana', 'B', [5, 6, 7, 8]),
  ...order('beto', 'B', [5, 6, 7, 8]),
  ...order('caio', 'B', [5, 6, 8, 7]),
];

// tabela ao vivo: só o grupo A jogou (2 venceu 1 por 2×0 → ordem atual [2,3,4,1])
const STANDINGS = computeStandings(
  new Map([
    ['A', [1, 2, 3, 4]],
    ['B', [5, 6, 7, 8]],
  ]),
  [{ groupLetter: 'A', homeTeamId: 2, awayTeamId: 1, homeScore: 2, awayScore: 0 }],
);

const INPUT: BetStatsInput = {
  participants: PARTICIPANTS,
  groupPredictions: GROUP_PREDICTIONS,
  thirdPicks: [
    { participantId: 'ana', teamId: 3 },
    { participantId: 'ana', teamId: 7 },
    { participantId: 'beto', teamId: 3 },
  ],
  standings: STANDINGS,
};

describe('countInversions', () => {
  it('0 para ordem igual, 6 para ordem invertida, 1 para troca adjacente', () => {
    expect(countInversions([1, 2, 3, 4], [1, 2, 3, 4])).toBe(0);
    expect(countInversions([4, 3, 2, 1], [1, 2, 3, 4])).toBe(6);
    expect(countInversions([1, 2, 4, 3], [1, 2, 3, 4])).toBe(1);
  });
});

describe('computeBetStats', () => {
  const stats = computeBetStats(INPUT);

  it('matriz de posições: contagens, % e ordem do consenso', () => {
    const a = stats.matrices.get('A')!;
    expect(a.n).toBe(3);
    expect(a.consensusOrder).toEqual([1, 2, 3, 4]);
    expect(a.rows[0]).toMatchObject({ teamId: 1, counts: [2, 1, 0, 0] });
    expect(a.rows[0].pct[0]).toBeCloseTo(66.67, 1);
    expect(a.rows[1].counts).toEqual([1, 2, 0, 0]);
  });

  it('palpite incompleto não conta no n do grupo', () => {
    const withPartial = computeBetStats({
      ...INPUT,
      participants: [...PARTICIPANTS, { id: 'dani', name: 'Dani' }],
      groupPredictions: [
        ...GROUP_PREDICTIONS,
        { participantId: 'dani', teamId: 1, groupLetter: 'A', position: 1 },
      ],
    });
    expect(withPartial.matrices.get('A')!.n).toBe(3);
  });

  it('favoritos: maiores % de 1º lugar', () => {
    expect(stats.favoritos[0]).toMatchObject({ teamId: 5, groupLetter: 'B' });
    expect(stats.favoritos[0].pct).toBe(100);
    expect(stats.favoritos[1].teamId).toBe(1);
    expect(stats.favoritos[2].teamId).toBe(2);
  });

  it('unanimidades: só células com 100% (grupo B, 1º e 2º)', () => {
    expect(stats.unanimidades).toEqual([
      { groupLetter: 'B', teamId: 5, position: 1 },
      { groupLetter: 'B', teamId: 6, position: 2 },
    ]);
  });

  it('contramão: só o Caio acredita no time 2 em 1º', () => {
    expect(stats.contramao).toEqual([
      { groupLetter: 'A', teamId: 2, participantId: 'caio', participantName: 'Caio' },
    ]);
  });

  it('zebra no radar: consenso 1º do A está em 4º na tabela ao vivo; grupo sem jogos fica fora', () => {
    expect(stats.zebrasNoRadar[0]).toMatchObject({
      teamId: 1,
      groupLetter: 'A',
      consensusPos: 1,
      livePos: 4,
    });
    expect(stats.zebrasNoRadar.every((z) => z.groupLetter === 'A')).toBe(true);
  });

  it('ousadia: Caio (2 inversões) > Beto (1) > Ana (0)', () => {
    expect(stats.ousadia.map((o) => o.name)).toEqual(['Caio', 'Beto', 'Ana']);
    expect(stats.ousadia[0].zebraPct).toBeCloseTo((2 / 12) * 100, 5);
    expect(stats.ousadia[2].zebraPct).toBe(0);
    expect(stats.ousadia[0].groupsCounted).toBe(2);
  });

  it('discórdia: A (3 ordenações) na frente de B (2)', () => {
    expect(stats.discordia.map((d) => d.groupLetter)).toEqual(['A', 'B']);
    expect(stats.discordia[0].distinctOrders).toBe(3);
    expect(stats.discordia[1].topShare).toBeCloseTo(66.67, 1);
  });

  it('terceiros: % sobre quem fez picks (Caio não fez → 2 pickers)', () => {
    expect(stats.terceirosPickers).toBe(2);
    expect(stats.terceiros).toEqual([
      { teamId: 3, count: 2, pct: 100 },
      { teamId: 7, count: 1, pct: 50 },
    ]);
  });
});
