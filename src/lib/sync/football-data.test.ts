import { describe, expect, it } from 'vitest';
import { mapRawMatch } from './football-data';

// Shape real da API (capturado em 11/06/2026, México × África do Sul)
const RAW = {
  id: 537327,
  utcDate: '2026-06-11T19:00:00Z',
  status: 'FINISHED',
  stage: 'GROUP_STAGE',
  group: 'GROUP_A',
  homeTeam: { tla: 'MEX' },
  awayTeam: { tla: 'RSA' },
  score: {
    winner: null,
    duration: 'REGULAR' as const,
    fullTime: { home: null, away: null },
  },
};

describe('mapRawMatch', () => {
  it('parseia GROUP_A e trata placar ainda não publicado (FINISHED sem score)', () => {
    const m = mapRawMatch(RAW as never)!;
    expect(m.stage).toBe('GROUP');
    expect(m.groupLetter).toBe('A');
    expect(m.finished).toBe(true);
    expect(m.fullTime).toBeNull(); // sem placar → planSync não aplica nada
  });

  it('placar publicado vira fullTime', () => {
    const m = mapRawMatch({
      ...RAW,
      score: { winner: 'HOME_TEAM', duration: 'REGULAR', fullTime: { home: 2, away: 1 } },
    } as never)!;
    expect(m.fullTime).toEqual({ home: 2, away: 1 });
    expect(m.penaltyWinnerSide).toBeNull();
  });

  it('pênaltis: lado vencedor extraído de winner + duration', () => {
    const m = mapRawMatch({
      ...RAW,
      stage: 'LAST_32',
      group: null,
      score: { winner: 'AWAY_TEAM', duration: 'PENALTY_SHOOTOUT', fullTime: { home: 1, away: 1 } },
    } as never)!;
    expect(m.stage).toBe('R32');
    expect(m.penaltyWinnerSide).toBe('AWAY');
  });

  it('fase desconhecida é descartada', () => {
    expect(mapRawMatch({ ...RAW, stage: 'PLAYOFFS' } as never)).toBeNull();
  });
});
