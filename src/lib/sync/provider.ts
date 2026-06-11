// Interface do provedor de resultados — isola a fonte externa para o app
// funcionar 100% sem sync (admin manual) e para o provedor ser trocável.

export type ExternalStage = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD' | 'FINAL';

export type ExternalMatch = {
  externalId: string;
  stage: ExternalStage;
  /** 'A'..'L' quando fase de grupos */
  groupLetter: string | null;
  /** ISO UTC do kickoff */
  utcDate: string;
  /** Só agimos em FINISHED */
  finished: boolean;
  /** Código FIFA (TLA) de cada lado, quando o confronto já é conhecido */
  homeTla: string | null;
  awayTla: string | null;
  /** Placar ao fim do jogo (inclui prorrogação, exclui pênaltis) */
  fullTime: { home: number; away: number } | null;
  /** Lado vencedor dos pênaltis, quando houve disputa */
  penaltyWinnerSide: 'HOME' | 'AWAY' | null;
};

export interface ResultProvider {
  name: string;
  fetchMatches(): Promise<ExternalMatch[]>;
}
