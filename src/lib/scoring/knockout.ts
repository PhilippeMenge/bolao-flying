// Pontuação do mata-mata — funções puras, sem acesso a banco.
//
// Regras (por jogo, mesmos valores em todas as fases):
// - placar exato (após prorrogação): 5 pts (não acumula com resultado/gols)
// - resultado certo sem placar exato (vencedor, ou empate previsto e ocorrido): 2 pts
// - nº de gols de um dos times certo, sem placar exato: +1 (acumula com resultado:
//   previu 2x1 e deu 2x0 → 2 + 1 = 3)
// - acertar quem avança: +1, sempre avaliado (cobre pênaltis). Máx por jogo: 6.
import { SCORING } from '../config';

export type KnockoutPredictionInput = {
  homeScore: number;
  awayScore: number;
  /** Obrigatório quando o palpite é empate */
  penaltyWinnerTeamId: number | null;
};

export type KnockoutResultInput = {
  homeTeamId: number;
  awayTeamId: number;
  /** Placar após prorrogação */
  homeScore: number;
  awayScore: number;
  /** Preenchido quando o jogo foi para os pênaltis */
  penaltyWinnerTeamId: number | null;
};

function advancerOf(
  homeTeamId: number,
  awayTeamId: number,
  homeScore: number,
  awayScore: number,
  penaltyWinnerTeamId: number | null,
): number | null {
  if (homeScore > awayScore) return homeTeamId;
  if (awayScore > homeScore) return awayTeamId;
  return penaltyWinnerTeamId;
}

export function scoreKnockoutMatch(
  prediction: KnockoutPredictionInput,
  result: KnockoutResultInput,
): number {
  let points = 0;

  const exact =
    prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore;
  if (exact) {
    points += SCORING.knockout.exactScore;
  } else {
    const predictedOutcome = Math.sign(prediction.homeScore - prediction.awayScore);
    const actualOutcome = Math.sign(result.homeScore - result.awayScore);
    if (predictedOutcome === actualOutcome) points += SCORING.knockout.correctResult;
    if (
      prediction.homeScore === result.homeScore ||
      prediction.awayScore === result.awayScore
    ) {
      points += SCORING.knockout.goalCountOneTeam;
    }
  }

  const predictedAdvancer = advancerOf(
    result.homeTeamId,
    result.awayTeamId,
    prediction.homeScore,
    prediction.awayScore,
    prediction.penaltyWinnerTeamId,
  );
  const actualAdvancer = advancerOf(
    result.homeTeamId,
    result.awayTeamId,
    result.homeScore,
    result.awayScore,
    result.penaltyWinnerTeamId,
  );
  if (predictedAdvancer !== null && predictedAdvancer === actualAdvancer) {
    points += SCORING.knockout.correctAdvancer;
  }

  return points;
}
