import { describe, expect, it } from 'vitest';
import { scoreKnockoutMatch } from './knockout';

const HOME = 10;
const AWAY = 20;

function result(homeScore: number, awayScore: number, penaltyWinnerTeamId: number | null = null) {
  return { homeTeamId: HOME, awayTeamId: AWAY, homeScore, awayScore, penaltyWinnerTeamId };
}

describe('scoreKnockoutMatch', () => {
  it('placar exato com vitória: 5 + 1 (avança) = 6', () => {
    expect(
      scoreKnockoutMatch({ homeScore: 2, awayScore: 1, penaltyWinnerTeamId: null }, result(2, 1)),
    ).toBe(6);
  });

  it('empate exato + pênaltis certos: 5 + 1 = 6', () => {
    expect(
      scoreKnockoutMatch(
        { homeScore: 1, awayScore: 1, penaltyWinnerTeamId: HOME },
        result(1, 1, HOME),
      ),
    ).toBe(6);
  });

  it('empate exato + pênaltis errados: 5', () => {
    expect(
      scoreKnockoutMatch(
        { homeScore: 0, awayScore: 0, penaltyWinnerTeamId: AWAY },
        result(0, 0, HOME),
      ),
    ).toBe(5);
  });

  it('vencedor certo, placar errado, nenhum nº de gols certo: 2 + 1 = 3', () => {
    expect(
      scoreKnockoutMatch({ homeScore: 2, awayScore: 1, penaltyWinnerTeamId: null }, result(1, 0)),
    ).toBe(3);
  });

  it('vencedor certo + nº de gols de um time certo: 2 + 1 + 1 = 4 (previu 2x1, deu 2x0)', () => {
    expect(
      scoreKnockoutMatch({ homeScore: 2, awayScore: 1, penaltyWinnerTeamId: null }, result(2, 0)),
    ).toBe(4);
  });

  it('resultado errado mas nº de gols de um time certo: 1 (previu 1x0, deu 1x2)', () => {
    expect(
      scoreKnockoutMatch({ homeScore: 1, awayScore: 0, penaltyWinnerTeamId: null }, result(1, 2)),
    ).toBe(1);
  });

  it('empate certo com placar errado + pênaltis certos: 2 + 1 = 3 (previu 1x1, deu 2x2)', () => {
    expect(
      scoreKnockoutMatch(
        { homeScore: 1, awayScore: 1, penaltyWinnerTeamId: HOME },
        result(2, 2, HOME),
      ),
    ).toBe(3);
  });

  it('empate certo com placar errado + pênaltis errados: 2', () => {
    expect(
      scoreKnockoutMatch(
        { homeScore: 1, awayScore: 1, penaltyWinnerTeamId: AWAY },
        result(2, 2, HOME),
      ),
    ).toBe(2);
  });

  it('previu vitória do time que avançou nos pênaltis: 0 do placar + 1 do avanço', () => {
    // previu 1x0 home; deu 2x2 e home passou nos pênaltis
    expect(
      scoreKnockoutMatch(
        { homeScore: 1, awayScore: 0, penaltyWinnerTeamId: null },
        result(2, 2, HOME),
      ),
    ).toBe(1);
  });

  it('tudo errado: 0 (previu 3x0 home, deu 0x1 away)', () => {
    expect(
      scoreKnockoutMatch({ homeScore: 3, awayScore: 0, penaltyWinnerTeamId: null }, result(0, 1)),
    ).toBe(0);
  });
});
