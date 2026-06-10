// Ponto único de ajuste da pontuação do bolão.
export const SCORING = {
  group: {
    // Seleção na posição exata do grupo
    exactPosition: 3,
    // Bônus por acertar que a seleção termina no top-2 (acumula com a posição
    // exata: cravar 1º/2º = 4 pts; top-2 na ordem errada = 1 pt)
    qualifiedTop2: 1,
    // Por terceiro colocado marcado que realmente avançou como terceiro
    thirdPlaceAdvancer: 1,
  },
  knockout: {
    // Placar exato (após prorrogação). Não acumula com correctResult/goalCount.
    exactScore: 5,
    // Resultado certo (vencedor, ou empate previsto e ocorrido) sem placar exato
    correctResult: 2,
    // Nº de gols de um dos times certo, sem placar exato (acumula com correctResult)
    goalCountOneTeam: 1,
    // Acertar quem avança de fase — sempre avaliado (cobre pênaltis)
    correctAdvancer: 1,
  },
} as const;

// Chaves da tabela app_config
export const CONFIG_KEYS = {
  // ISO string — prazo único de toda a aposta da fase de grupos
  groupStageDeadline: 'groupStageDeadline',
  // teamId[] — override do admin para os 8 terceiros que avançaram
  thirdPlaceAdvancersOverride: 'thirdPlaceAdvancersOverride',
  // { [groupLetter]: teamId[4] } — override da classificação final de um grupo
  groupPositionOverrides: 'groupPositionOverrides',
  // boolean — liga/desliga o sync automático de resultados
  syncEnabled: 'syncEnabled',
} as const;

export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
export type GroupLetter = (typeof GROUP_LETTERS)[number];

export const THIRD_PLACE_ADVANCER_COUNT = 8;

export const TIMEZONE = 'America/Sao_Paulo';
