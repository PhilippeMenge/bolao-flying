import { describe, expect, it } from 'vitest';
import { scoreGroup, scoreThirdPlacePicks } from './group';

// teamIds fictícios: 1, 2, 3, 4
describe('scoreGroup', () => {
  it('grupo cravado inteiro: 4 + 4 + 3 + 3 = 14', () => {
    expect(scoreGroup([1, 2, 3, 4], [1, 2, 3, 4])).toBe(14);
  });

  it('top-2 invertido: 1 + 1 + 3 + 3 = 8', () => {
    expect(scoreGroup([1, 2, 3, 4], [2, 1, 3, 4])).toBe(8);
  });

  it('tudo errado: 0', () => {
    expect(scoreGroup([1, 2, 3, 4], [3, 4, 1, 2])).toBe(0);
  });

  it('1º cravado, 2º caiu pra 3º, 4º cravado: (3+1) + 0 + 0 + 3 = 7', () => {
    expect(scoreGroup([1, 2, 3, 4], [1, 3, 2, 4])).toBe(7);
  });

  it('previu 3º mas terminou 2º: sem bônus de classificado (bônus exige prever top-2)', () => {
    // predicted: 1º=1, 2º=2, 3º=3, 4º=4 | actual: 1º=1, 2º=3, 3º=4, 4º=2
    // time 1 cravado (3+1)=4; time 2 previsto 2º terminou 4º = 0;
    // time 3 previsto 3º terminou 2º = 0 (sem bônus); time 4 previsto 4º terminou 3º = 0
    expect(scoreGroup([1, 2, 3, 4], [1, 3, 4, 2])).toBe(4);
  });

  it('cravou 3º e 4º mas inverteu top-2: 1 + 1 + 3 + 3 = 8 (igual ao invertido)', () => {
    expect(scoreGroup([2, 1, 3, 4], [1, 2, 3, 4])).toBe(8);
  });
});

describe('scoreThirdPlacePicks', () => {
  it('+1 por terceiro marcado que avançou', () => {
    expect(scoreThirdPlacePicks([1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 99, 98, 97])).toBe(5);
  });

  it('nenhum acerto: 0', () => {
    expect(scoreThirdPlacePicks([1, 2], [3, 4])).toBe(0);
  });

  it('todos os 8: 8', () => {
    const picks = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(scoreThirdPlacePicks(picks, picks)).toBe(8);
  });
});
