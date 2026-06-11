import { describe, expect, it } from 'vitest';
import { computeStandings, computeThirdPlaceAdvancers, type GroupMatchResult } from './standings';

// Grupo C da Copa 2022 (caso real com desempate por saldo):
// Argentina 6pts (+3), Polônia 4pts (0), México 4pts (-1), Arábia Saudita 3pts (-2)
const ARG = 1, KSA = 2, MEX = 3, POL = 4;
const RESULTS_2022_C: GroupMatchResult[] = [
  { groupLetter: 'C', homeTeamId: ARG, awayTeamId: KSA, homeScore: 1, awayScore: 2 },
  { groupLetter: 'C', homeTeamId: MEX, awayTeamId: POL, homeScore: 0, awayScore: 0 },
  { groupLetter: 'C', homeTeamId: POL, awayTeamId: KSA, homeScore: 2, awayScore: 0 },
  { groupLetter: 'C', homeTeamId: ARG, awayTeamId: MEX, homeScore: 2, awayScore: 0 },
  { groupLetter: 'C', homeTeamId: POL, awayTeamId: ARG, homeScore: 0, awayScore: 2 },
  { groupLetter: 'C', homeTeamId: KSA, awayTeamId: MEX, homeScore: 1, awayScore: 2 },
];

const TEAMS = new Map([['C', [ARG, KSA, MEX, POL]]]);

describe('computeStandings', () => {
  it('reproduz o grupo C de 2022 (desempate Polônia x México por saldo)', () => {
    const standings = computeStandings(TEAMS, RESULTS_2022_C);
    const c = standings.get('C')!;
    expect(c.complete).toBe(true);
    expect(c.order).toEqual([ARG, POL, MEX, KSA]);
    expect(c.stats.get(POL)).toEqual({ points: 4, gd: 0, gf: 2 });
    expect(c.stats.get(MEX)).toEqual({ points: 4, gd: -1, gf: 2 });
  });

  it('grupo incompleto: complete = false', () => {
    const standings = computeStandings(TEAMS, RESULTS_2022_C.slice(0, 4));
    expect(standings.get('C')!.complete).toBe(false);
  });

  it('override do admin substitui a ordem computada', () => {
    const standings = computeStandings(TEAMS, RESULTS_2022_C, { C: [ARG, MEX, POL, KSA] });
    expect(standings.get('C')!.order).toEqual([ARG, MEX, POL, KSA]);
  });
});

describe('computeThirdPlaceAdvancers', () => {
  it('null enquanto algum grupo não terminou (sem override)', () => {
    const standings = computeStandings(TEAMS, RESULTS_2022_C.slice(0, 4));
    expect(computeThirdPlaceAdvancers(standings)).toBeNull();
  });

  it('override vale mesmo com grupos incompletos', () => {
    const standings = computeStandings(TEAMS, []);
    expect(computeThirdPlaceAdvancers(standings, [MEX, POL])).toEqual([MEX, POL]);
  });

  it('com todos os grupos completos, ordena os terceiros por pts/SG/GP', () => {
    // dois grupos, terceiro do C é o MEX (4pts); grupo D inventado com terceiro pior
    const D1 = 11, D2 = 12, D3 = 13, D4 = 14;
    const resultsD: GroupMatchResult[] = [
      { groupLetter: 'D', homeTeamId: D1, awayTeamId: D2, homeScore: 1, awayScore: 0 },
      { groupLetter: 'D', homeTeamId: D3, awayTeamId: D4, homeScore: 1, awayScore: 0 },
      { groupLetter: 'D', homeTeamId: D1, awayTeamId: D3, homeScore: 1, awayScore: 0 },
      { groupLetter: 'D', homeTeamId: D2, awayTeamId: D4, homeScore: 1, awayScore: 0 },
      { groupLetter: 'D', homeTeamId: D1, awayTeamId: D4, homeScore: 1, awayScore: 0 },
      { groupLetter: 'D', homeTeamId: D2, awayTeamId: D3, homeScore: 1, awayScore: 0 },
    ];
    // D: D1 9pts, D2 6pts, D3 3pts (3º), D4 0pts
    const teams = new Map([
      ['C', [ARG, KSA, MEX, POL]],
      ['D', [D1, D2, D3, D4]],
    ]);
    const standings = computeStandings(teams, [...RESULTS_2022_C, ...resultsD]);
    const advancers = computeThirdPlaceAdvancers(standings)!;
    // só 2 grupos → os 2 terceiros entram, MEX (4pts) na frente de D3 (3pts)
    expect(advancers).toEqual([MEX, D3]);
  });
});
