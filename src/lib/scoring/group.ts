// Pontuação da fase de grupos — funções puras, sem acesso a banco.
//
// Regras (por seleção):
// - posição exata: 3 pts
// - bônus classificado: +1 se previu a seleção no top-2 e ela terminou no top-2
//   (acumula: cravar 1º/2º = 4 pts; top-2 na ordem errada = 1 pt; cravar 3º/4º = 3 pts)
// - terceiro marcado que avançou como terceiro: +1 cada
import { SCORING } from '../config';

/**
 * Pontua a aposta de um grupo.
 * @param predicted teamIds na ordem apostada (índice 0 = 1º lugar)
 * @param actual teamIds na ordem final real (índice 0 = 1º lugar)
 */
export function scoreGroup(predicted: number[], actual: number[]): number {
  let points = 0;
  for (let i = 0; i < predicted.length; i++) {
    const actualPosition = actual.indexOf(predicted[i]);
    if (actualPosition === -1) continue;
    if (actualPosition === i) points += SCORING.group.exactPosition;
    if (i < 2 && actualPosition < 2) points += SCORING.group.qualifiedTop2;
  }
  return points;
}

/**
 * Pontua os 8 terceiros marcados contra os 8 que realmente avançaram.
 */
export function scoreThirdPlacePicks(
  pickedTeamIds: number[],
  actualAdvancerTeamIds: number[],
): number {
  const advancers = new Set(actualAdvancerTeamIds);
  const hits = pickedTeamIds.filter((id) => advancers.has(id)).length;
  return hits * SCORING.group.thirdPlaceAdvancer;
}
