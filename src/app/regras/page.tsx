import { SCORING, THIRD_PLACE_ADVANCER_COUNT } from '@/lib/config';

const { group: G, knockout: K } = SCORING;

function PointsRow({ label, points, example }: { label: string; points: string; example?: string }) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-tinta/10 py-2 last:border-0">
      <div>
        <p className="text-[14px] font-semibold">{label}</p>
        {example && <p className="mt-0.5 text-xs text-tinta/60">{example}</p>}
      </div>
      <span className="shrink-0 rounded-md bg-azul px-2 py-0.5 font-mono text-sm font-semibold text-amarelo">
        {points}
      </span>
    </li>
  );
}

export default function RegrasPage() {
  return (
    <div className="rise space-y-5 lg:mx-auto lg:max-w-2xl">
      <div>
        <h1 className="font-display text-4xl uppercase leading-none text-tinta">
          Regras do bolão
        </h1>
        <p className="mt-2 text-sm text-tinta/70">
          Copa 2026: 48 seleções, 12 grupos. Os 2 primeiros de cada grupo + os 8 melhores
          terceiros avançam para a fase de 32.
        </p>
      </div>

      <section className="sticker p-4">
        <h2 className="font-display text-2xl uppercase leading-none">1ª fase: grupos 🎯</h2>
        <p className="mt-2 text-sm text-tinta/75">
          Você ordena as 4 seleções de cada grupo (1º ao 4º) e marca quais{' '}
          {THIRD_PLACE_ADVANCER_COUNT} dos seus 12 terceiros avançam. Tudo trava de uma vez no
          prazo que aparece no painel — depois disso, ninguém edita mais nada.
        </p>
        <ul className="mt-3">
          <PointsRow
            label="Posição exata no grupo"
            points={`${G.exactPosition} pts`}
            example="Disse que a Espanha termina em 1º e ela terminou em 1º"
          />
          <PointsRow
            label="Bônus de classificação (acumula!)"
            points={`+${G.qualifiedTop2} pt`}
            example={`Previu no top-2 e terminou no top-2. Cravar 1º ou 2º vale ${
              G.exactPosition + G.qualifiedTop2
            } pts; acertar o top-2 na ordem errada vale ${G.qualifiedTop2} pt`}
          />
          <PointsRow
            label="Terceiro que avançou"
            points={`+${G.thirdPlaceAdvancer} pt`}
            example="Cada terceiro marcado por você que realmente avançou"
          />
        </ul>
        <p className="mt-3 rounded-lg bg-verde px-3 py-2 text-xs font-semibold text-branco">
          Máximo por grupo:{' '}
          {2 * (G.exactPosition + G.qualifiedTop2) + 2 * G.exactPosition} pts cravando a ordem
          inteira.
        </p>
      </section>

      <section className="sticker p-4">
        <h2 className="font-display text-2xl uppercase leading-none">Mata-mata ⚔️</h2>
        <p className="mt-2 text-sm text-tinta/75">
          Quando um confronto é definido, abre o palpite de <strong>placar exato</strong> (vale o
          placar após a prorrogação). Pode apostar em empate — aí você escolhe quem passa nos
          pênaltis. Cada palpite trava no horário do jogo. Mesma pontuação em todas as fases, da
          fase de 32 até a final.
        </p>
        <ul className="mt-3">
          <PointsRow
            label="Placar exato"
            points={`${K.exactScore} pts`}
            example="Disse 2×1 e deu 2×1"
          />
          <PointsRow
            label="Só o resultado"
            points={`${K.correctResult} pts`}
            example="Acertou o vencedor (ou o empate) mas errou o placar"
          />
          <PointsRow
            label="Gols de um dos times"
            points={`+${K.goalCountOneTeam} pt`}
            example={`Sem placar exato, acertou os gols de um lado. Disse 2×1, deu 2×0: ${K.correctResult} + ${K.goalCountOneTeam} = ${
              K.correctResult + K.goalCountOneTeam
            } pts`}
          />
          <PointsRow
            label="Quem avança"
            points={`+${K.correctAdvancer} pt`}
            example="Sempre conta — inclusive se o seu time passou nos pênaltis"
          />
        </ul>
        <p className="mt-3 rounded-lg bg-verde px-3 py-2 text-xs font-semibold text-branco">
          Máximo por jogo: {K.exactScore + K.correctAdvancer} pts (placar exato + quem avança).
        </p>
      </section>

      <section className="card-azul p-4">
        <h2 className="font-display text-2xl uppercase leading-none text-amarelo">
          Combinados 🤝
        </h2>
        <ul className="mt-2 space-y-2 text-sm text-branco/80">
          <li>
            <strong className="text-branco">Prazos valem.</strong> O sistema trava sozinho — sem
            choro no grupo.
          </li>
          <li>
            <strong className="text-branco">Privacidade até travar.</strong> Antes do prazo, cada
            um vê só os próprios palpites. Depois, fica tudo aberto pra zoeira.
          </li>
          <li>
            <strong className="text-branco">Ranking ao vivo.</strong> Os pontos entram conforme os
            resultados saem, na aba Ranking.
          </li>
        </ul>
      </section>
    </div>
  );
}
