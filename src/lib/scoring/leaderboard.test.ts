import { describe, expect, it } from 'vitest';
import { computeLeaderboard } from './leaderboard';
import { computeStandings, type GroupMatchResult } from './standings';

// Mini-torneio: 1 grupo (A: times 1..4) + 1 jogo de mata-mata
const RESULTS: GroupMatchResult[] = [
  // time 1 ganha tudo, time 2 em 2º, time 3 em 3º, time 4 zero
  { groupLetter: 'A', homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 },
  { groupLetter: 'A', homeTeamId: 1, awayTeamId: 3, homeScore: 2, awayScore: 0 },
  { groupLetter: 'A', homeTeamId: 1, awayTeamId: 4, homeScore: 2, awayScore: 0 },
  { groupLetter: 'A', homeTeamId: 2, awayTeamId: 3, homeScore: 2, awayScore: 0 },
  { groupLetter: 'A', homeTeamId: 2, awayTeamId: 4, homeScore: 2, awayScore: 0 },
  { groupLetter: 'A', homeTeamId: 3, awayTeamId: 4, homeScore: 2, awayScore: 0 },
];

function predictions(participantId: string, order: number[]) {
  return order.map((teamId, i) => ({
    participantId,
    teamId,
    groupLetter: 'A',
    position: i + 1,
  }));
}

describe('computeLeaderboard', () => {
  const standings = computeStandings(new Map([['A', [1, 2, 3, 4]]]), RESULTS);

  it('compõe grupos + terceiros + mata-mata e ordena por total', () => {
    const rows = computeLeaderboard({
      participants: [
        { id: 'ana', name: 'Ana' },
        { id: 'beto', name: 'Beto' },
      ],
      // Ana crava o grupo inteiro: (3+1)+(3+1)+3+3 = 14; Beto inverte top-2: 1+1+3+3 = 8
      groupPredictions: [
        ...predictions('ana', [1, 2, 3, 4]),
        ...predictions('beto', [2, 1, 3, 4]),
      ],
      // terceiro real = time 3; Ana marcou (+1), Beto não
      thirdPicks: [{ participantId: 'ana', teamId: 3 }],
      standings,
      thirdAdvancers: [3],
      // mata-mata: 1 x 2, deu 1×1 e o time 2 passou nos pênaltis
      knockoutResults: [
        { matchId: 73, homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1, penaltyWinnerTeamId: 2 },
      ],
      // Beto cravou (5) + pênaltis certos (+1) = 6; Ana errou tudo (2x0): 0
      knockoutPredictions: [
        { participantId: 'ana', matchId: 73, homeScore: 2, awayScore: 0, penaltyWinnerTeamId: null },
        { participantId: 'beto', matchId: 73, homeScore: 1, awayScore: 1, penaltyWinnerTeamId: 2 },
      ],
    });

    expect(rows).toEqual([
      {
        participantId: 'ana',
        name: 'Ana',
        groupPoints: 14,
        liveGroupPoints: 0,
        thirdPoints: 1,
        liveThirdPoints: 0,
        knockoutPoints: 0,
        confirmedTotal: 15,
        total: 15,
      },
      {
        participantId: 'beto',
        name: 'Beto',
        groupPoints: 8,
        liveGroupPoints: 0,
        thirdPoints: 0,
        liveThirdPoints: 0,
        knockoutPoints: 6,
        confirmedTotal: 14,
        total: 14,
      },
    ]);
  });

  it('grupo incompleto pontua AO VIVO (provisório, fora do confirmado)', () => {
    // só os 3 jogos do time 1: tabela atual = [1, 2, 3, 4] (zerados desempatam por id)
    const incomplete = computeStandings(new Map([['A', [1, 2, 3, 4]]]), RESULTS.slice(0, 3));
    const rows = computeLeaderboard({
      participants: [{ id: 'ana', name: 'Ana' }],
      groupPredictions: predictions('ana', [1, 2, 3, 4]),
      thirdPicks: [{ participantId: 'ana', teamId: 3 }],
      standings: incomplete,
      thirdAdvancers: null,
      knockoutResults: [],
      knockoutPredictions: [],
    });
    // grupo cravado contra a tabela parcial = 14; 3º atual = time 3, marcado → +1 ao vivo
    expect(rows[0].liveGroupPoints).toBe(14);
    expect(rows[0].liveThirdPoints).toBe(1);
    expect(rows[0].groupPoints).toBe(0);
    expect(rows[0].thirdPoints).toBe(0);
    expect(rows[0].confirmedTotal).toBe(0);
    expect(rows[0].total).toBe(15);
  });

  it('grupo sem nenhum jogo não pontua nem ao vivo', () => {
    const untouched = computeStandings(new Map([['A', [1, 2, 3, 4]]]), []);
    const rows = computeLeaderboard({
      participants: [{ id: 'ana', name: 'Ana' }],
      groupPredictions: predictions('ana', [1, 2, 3, 4]),
      thirdPicks: [{ participantId: 'ana', teamId: 3 }],
      standings: untouched,
      thirdAdvancers: null,
      knockoutResults: [],
      knockoutPredictions: [],
    });
    expect(rows[0].total).toBe(0);
  });

  it('ranking ordena pelo total ao vivo (provisório incluso)', () => {
    const incomplete = computeStandings(new Map([['A', [1, 2, 3, 4]]]), RESULTS.slice(0, 3));
    const rows = computeLeaderboard({
      participants: [
        { id: 'ana', name: 'Ana' },
        { id: 'beto', name: 'Beto' },
      ],
      // Ana crava a tabela parcial (14 ao vivo); Beto inverte top-2 (8 ao vivo)
      groupPredictions: [
        ...predictions('ana', [1, 2, 3, 4]),
        ...predictions('beto', [2, 1, 3, 4]),
      ],
      thirdPicks: [],
      standings: incomplete,
      thirdAdvancers: null,
      knockoutResults: [],
      knockoutPredictions: [],
    });
    expect(rows.map((r) => r.participantId)).toEqual(['ana', 'beto']);
    expect(rows[0].total).toBe(14);
    expect(rows[1].total).toBe(8);
  });

  it('participante sem palpites fica com 0 e entra no ranking', () => {
    const rows = computeLeaderboard({
      participants: [{ id: 'zeca', name: 'Zeca' }],
      groupPredictions: [],
      thirdPicks: [],
      standings,
      thirdAdvancers: [3],
      knockoutResults: [],
      knockoutPredictions: [],
    });
    expect(rows).toEqual([
      {
        participantId: 'zeca',
        name: 'Zeca',
        groupPoints: 0,
        liveGroupPoints: 0,
        thirdPoints: 0,
        liveThirdPoints: 0,
        knockoutPoints: 0,
        confirmedTotal: 0,
        total: 0,
      },
    ]);
  });
});
