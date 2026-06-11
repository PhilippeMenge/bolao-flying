// Composição do ranking — função pura; o carregamento do banco fica em load-leaderboard.ts.
import { scoreGroup, scoreThirdPlacePicks } from './group';
import { scoreKnockoutMatch, type KnockoutResultInput } from './knockout';
import type { GroupStanding } from './standings';

export type LeaderboardRow = {
  participantId: string;
  name: string;
  groupPoints: number;
  thirdPoints: number;
  knockoutPoints: number;
  total: number;
};

export type LeaderboardInput = {
  participants: { id: string; name: string }[];
  groupPredictions: {
    participantId: string;
    teamId: number;
    groupLetter: string;
    position: number;
  }[];
  thirdPicks: { participantId: string; teamId: number }[];
  /** Classificação real por grupo (computada + overrides) */
  standings: Map<string, GroupStanding>;
  /** Os 8 terceiros que avançaram, ou null se ainda não definido */
  thirdAdvancers: number[] | null;
  /** Jogos de mata-mata FINALIZADOS com os dois times definidos */
  knockoutResults: ({ matchId: number } & KnockoutResultInput)[];
  knockoutPredictions: {
    participantId: string;
    matchId: number;
    homeScore: number;
    awayScore: number;
    penaltyWinnerTeamId: number | null;
  }[];
};

export function computeLeaderboard(input: LeaderboardInput): LeaderboardRow[] {
  // Só grupos completos pontuam (pontuação parcial conforme a Copa anda)
  const scorableGroups = [...input.standings.entries()].filter(([, s]) => s.complete);

  const predictionsByParticipant = new Map<string, typeof input.groupPredictions>();
  for (const p of input.groupPredictions) {
    let list = predictionsByParticipant.get(p.participantId);
    if (!list) predictionsByParticipant.set(p.participantId, (list = []));
    list.push(p);
  }
  const thirdsByParticipant = new Map<string, number[]>();
  for (const t of input.thirdPicks) {
    let list = thirdsByParticipant.get(t.participantId);
    if (!list) thirdsByParticipant.set(t.participantId, (list = []));
    list.push(t.teamId);
  }
  const koPredsByParticipant = new Map<string, typeof input.knockoutPredictions>();
  for (const p of input.knockoutPredictions) {
    let list = koPredsByParticipant.get(p.participantId);
    if (!list) koPredsByParticipant.set(p.participantId, (list = []));
    list.push(p);
  }
  const koResultByMatch = new Map(input.knockoutResults.map((r) => [r.matchId, r]));

  const rows = input.participants.map((participant) => {
    const myPredictions = predictionsByParticipant.get(participant.id) ?? [];

    let groupPoints = 0;
    for (const [letter, standing] of scorableGroups) {
      const predicted = myPredictions
        .filter((p) => p.groupLetter === letter)
        .sort((a, b) => a.position - b.position)
        .map((p) => p.teamId);
      if (predicted.length === 4) groupPoints += scoreGroup(predicted, standing.order);
    }

    let thirdPoints = 0;
    if (input.thirdAdvancers) {
      thirdPoints = scoreThirdPlacePicks(
        thirdsByParticipant.get(participant.id) ?? [],
        input.thirdAdvancers,
      );
    }

    let knockoutPoints = 0;
    for (const prediction of koPredsByParticipant.get(participant.id) ?? []) {
      const result = koResultByMatch.get(prediction.matchId);
      if (result) knockoutPoints += scoreKnockoutMatch(prediction, result);
    }

    return {
      participantId: participant.id,
      name: participant.name,
      groupPoints,
      thirdPoints,
      knockoutPoints,
      total: groupPoints + thirdPoints + knockoutPoints,
    };
  });

  return rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'));
}
