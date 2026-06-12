import Link from 'next/link';
import { ClassificacaoTabs } from '@/components/ClassificacaoTabs';
import { loadLeaderboard } from '@/lib/scoring/load-leaderboard';

export const dynamic = 'force-dynamic';

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function ClassificacaoPage() {
  const { rows, finishedGroupCount, liveGroupCount, finishedKnockoutCount } =
    await loadLeaderboard();
  const nothingScored =
    finishedGroupCount === 0 && liveGroupCount === 0 && finishedKnockoutCount === 0;
  const isLive = liveGroupCount > 0;

  return (
    <div className="rise">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-4xl uppercase leading-none text-tinta">Ranking</h1>
        {isLive && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-verde-escuro bg-verde px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-branco">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amarelo" />
            ao vivo
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-tinta/70">
        {nothingScored
          ? 'A pontuação entra ao vivo desde o 1º jogo — cada palpite vale contra a tabela parcial do grupo.'
          : `Pontuando: ${liveGroupCount} ${liveGroupCount === 1 ? 'grupo' : 'grupos'} ao vivo · ${finishedGroupCount}/12 fechados · ${finishedKnockoutCount} de mata-mata.`}
      </p>

      <div className="mt-4">
        <ClassificacaoTabs />
      </div>

      {rows.length === 0 ? (
        <div className="card-azul mt-4 p-4 text-sm text-branco/80">
          Ninguém se cadastrou ainda. Compartilha o link no grupo! 🎠
        </div>
      ) : (
        <ol className="space-y-2">
          {rows.map((row, i) => {
            const groupTotal =
              row.groupPoints + row.liveGroupPoints + row.thirdPoints + row.liveThirdPoints;
            const hasProvisional = row.total !== row.confirmedTotal;
            return (
              <li key={row.participantId} className="rise" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                <Link
                  href={`/participante/${row.participantId}`}
                  className="sticker flex items-center gap-3 px-3.5 py-3 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--azul)]"
                >
                  <span className="w-8 shrink-0 text-center font-display text-xl leading-none">
                    {MEDALS[i] ?? `${i + 1}º`}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg uppercase leading-tight">
                      {row.name}
                    </span>
                    <span className="block font-mono text-[11px] text-tinta/55">
                      grupos {groupTotal} · mata-mata {row.knockoutPoints}
                      {hasProvisional && (
                        <span className="text-verde"> · {row.confirmedTotal} confirmados</span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-azul px-2.5 py-1 font-mono text-lg font-semibold text-amarelo">
                    {row.total}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 text-center text-xs text-tinta/55">
        {isLive
          ? 'Pontos de grupos em andamento são provisórios — mudam a cada jogo. Toque em alguém pra ver os palpites.'
          : 'Toque em alguém pra ver os palpites (liberados conforme travam).'}
      </p>
    </div>
  );
}
