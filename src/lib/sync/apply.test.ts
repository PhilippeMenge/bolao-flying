import { describe, expect, it } from 'vitest';
import { planSync, type OurMatchForSync } from './apply';
import type { ExternalMatch } from './provider';

const TEAMS = [
  { id: 10, fifaCode: 'BRA' },
  { id: 20, fifaCode: 'ARG' },
  { id: 30, fifaCode: 'MEX' },
  { id: 40, fifaCode: 'RSA' },
];

function ourMatch(over: Partial<OurMatchForSync>): OurMatchForSync {
  return {
    id: 1,
    stage: 'GROUP',
    groupLetter: 'A',
    kickoffAt: new Date('2026-06-11T19:00:00Z'),
    homeTeamId: 30,
    awayTeamId: 40,
    status: 'SCHEDULED',
    resultLockedByAdmin: false,
    externalId: null,
    ...over,
  };
}

function extMatch(over: Partial<ExternalMatch>): ExternalMatch {
  return {
    externalId: 'fd-1',
    stage: 'GROUP',
    groupLetter: 'A',
    utcDate: '2026-06-11T19:00:00Z',
    finished: true,
    homeTla: 'MEX',
    awayTla: 'RSA',
    fullTime: { home: 2, away: 1 },
    penaltyWinnerSide: null,
    ...over,
  };
}

describe('planSync', () => {
  it('mapeia por par de times, vincula externalId e aplica resultado', () => {
    const plan = planSync([ourMatch({})], TEAMS, [extMatch({})]);
    expect(plan.linkExternal).toEqual([{ matchId: 1, externalId: 'fd-1' }]);
    expect(plan.results).toEqual([
      {
        matchId: 1,
        isKnockout: false,
        homeTeamId: 30,
        awayTeamId: 40,
        homeScore: 2,
        awayScore: 1,
        penaltyWinnerTeamId: null,
      },
    ]);
    expect(plan.unmatched).toEqual([]);
  });

  it('resultado travado pelo admin não é sobrescrito', () => {
    const plan = planSync([ourMatch({ resultLockedByAdmin: true })], TEAMS, [extMatch({})]);
    expect(plan.results).toEqual([]);
    // mas o vínculo de externalId acontece mesmo assim
    expect(plan.linkExternal).toHaveLength(1);
  });

  it('jogo não finalizado no provedor não gera resultado', () => {
    const plan = planSync([ourMatch({})], TEAMS, [extMatch({ finished: false, fullTime: null })]);
    expect(plan.results).toEqual([]);
  });

  it('mata-mata TBD: preenche os times pelo horário+fase e aplica resultado com pênaltis', () => {
    const our = ourMatch({
      id: 73,
      stage: 'R32',
      groupLetter: null,
      homeTeamId: null,
      awayTeamId: null,
      kickoffAt: new Date('2026-06-28T19:00:00Z'),
    });
    const ext = extMatch({
      externalId: 'fd-73',
      stage: 'R32',
      groupLetter: null,
      utcDate: '2026-06-28T19:00:00Z',
      homeTla: 'BRA',
      awayTla: 'ARG',
      fullTime: { home: 1, away: 1 },
      penaltyWinnerSide: 'AWAY',
    });
    const plan = planSync([our], TEAMS, [ext]);
    expect(plan.fillTeams).toEqual([{ matchId: 73, homeTeamId: 10, awayTeamId: 20 }]);
    expect(plan.results).toEqual([
      {
        matchId: 73,
        isKnockout: true,
        homeTeamId: 10,
        awayTeamId: 20,
        homeScore: 1,
        awayScore: 1,
        penaltyWinnerTeamId: 20,
      },
    ]);
  });

  it('externalId já vinculado tem prioridade sobre heurísticas', () => {
    const plan = planSync(
      [ourMatch({ externalId: 'fd-1', homeTeamId: 10, awayTeamId: 20 })],
      TEAMS,
      [extMatch({ homeTla: 'MEX', awayTla: 'RSA' })], // times diferentes não importam
    );
    expect(plan.results[0]?.matchId).toBe(1);
    expect(plan.unmatched).toEqual([]);
  });

  it('jogo externo sem correspondência vai pra unmatched', () => {
    const plan = planSync([ourMatch({})], TEAMS, [
      extMatch({ externalId: 'fd-999', utcDate: '2026-07-01T00:00:00Z', homeTla: 'XXX', awayTla: 'YYY' }),
    ]);
    expect(plan.unmatched).toEqual(['fd-999']);
  });

  it('par de times invertido (mandante trocado): mapeia e reorienta o placar', () => {
    // provedor diz RSA 1×2 MEX; nosso jogo é MEX (casa) × RSA → deve virar 2×1
    const plan = planSync([ourMatch({})], TEAMS, [
      extMatch({ homeTla: 'RSA', awayTla: 'MEX', fullTime: { home: 1, away: 2 } }),
    ]);
    expect(plan.results[0]?.matchId).toBe(1);
    expect(plan.results[0]?.homeScore).toBe(2);
    expect(plan.results[0]?.awayScore).toBe(1);
  });

  it('pênaltis com lados invertidos: vencedor aponta pro time certo', () => {
    // provedor: RSA (casa) 1×1 MEX, RSA venceu nos pênaltis → no nosso jogo, RSA é o visitante
    const our = ourMatch({ stage: 'R32', groupLetter: null });
    const plan = planSync([our], TEAMS, [
      extMatch({
        stage: 'R32',
        groupLetter: null,
        homeTla: 'RSA',
        awayTla: 'MEX',
        fullTime: { home: 1, away: 1 },
        penaltyWinnerSide: 'HOME',
      }),
    ]);
    expect(plan.results[0]?.penaltyWinnerTeamId).toBe(40); // RSA
  });
});
