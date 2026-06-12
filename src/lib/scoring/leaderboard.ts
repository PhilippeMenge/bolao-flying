// Composição do ranking — função pura; o carregamento do banco fica em load-leaderboard.ts.
import { scoreGroup, scoreThirdPlacePicks } from './group';
import { scoreKnockoutMatch, type KnockoutResultInput } from './knockout';
import { computeLiveThirdRanking, type GroupStanding } from './standings';

export type LeaderboardRow = {
  participantId: string;
  name: string;
  /** Grupos fechados (6 jogos) — confirmado */
  groupPoints: number;
  /** Grupos em andamento, pontuados contra a tabela parcial — provisório */
  liveGroupPoints: number;
  /** Terceiros contra os 8 definitivos (12 grupos fechados ou override) */
  thirdPoints: number;
  /** Terceiros contra o top-8 ao vivo, enquanto não há definitivo */
  liveThirdPoints: number;
  knockoutPoints: number;
  /** Só o que já não muda mais */
  confirmedTotal: number;
  /** Tudo, incluindo o provisório — é o número que manda no ranking */
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
  // Todo grupo que já teve jogo pontua: fechado conta como confirmado,
  // em andamento conta como provisório ("se o grupo terminasse hoje").
  const scorableGroups = [...input.standings.entries()].filter(([, s]) => s.playedMatches > 0);
  // Sem os 8 terceiros definitivos, pontua contra o top-8 ao vivo.
  const liveThirdAdvancers = input.thirdAdvancers
    ? null
    : computeLiveThirdRanking(input.standings).slice(0, 8).map((t) => t.teamId);

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
    let liveGroupPoints = 0;
    for (const [letter, standing] of scorableGroups) {
      const predicted = myPredictions
        .filter((p) => p.groupLetter === letter)
        .sort((a, b) => a.position - b.position)
        .map((p) => p.teamId);
      if (predicted.length !== 4) continue;
      const points = scoreGroup(predicted, standing.order);
      if (standing.complete) groupPoints += points;
      else liveGroupPoints += points;
    }

    const myThirds = thirdsByParticipant.get(participant.id) ?? [];
    let thirdPoints = 0;
    let liveThirdPoints = 0;
    if (input.thirdAdvancers) {
      thirdPoints = scoreThirdPlacePicks(myThirds, input.thirdAdvancers);
    } else if (liveThirdAdvancers) {
      liveThirdPoints = scoreThirdPlacePicks(myThirds, liveThirdAdvancers);
    }

    let knockoutPoints = 0;
    for (const prediction of koPredsByParticipant.get(participant.id) ?? []) {
      const result = koResultByMatch.get(prediction.matchId);
      if (result) knockoutPoints += scoreKnockoutMatch(prediction, result);
    }

    const confirmedTotal = groupPoints + thirdPoints + knockoutPoints;
    return {
      participantId: participant.id,
      name: participant.name,
      groupPoints,
      liveGroupPoints,
      thirdPoints,
      liveThirdPoints,
      knockoutPoints,
      confirmedTotal,
      total: confirmedTotal + liveGroupPoints + liveThirdPoints,
    };
  });

  return rows.sort(
    (a, b) =>
      b.total - a.total ||
      b.confirmedTotal - a.confirmedTotal ||
      a.name.localeCompare(b.name, 'pt-BR'),
  );
}
