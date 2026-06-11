import Link from 'next/link';
import { loadLeaderboard } from '@/lib/scoring/load-leaderboard';

export const dynamic = 'force-dynamic';

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function ClassificacaoPage() {
  const { rows, finishedGroupCount, finishedKnockoutCount } = await loadLeaderboard();
  const nothingScored = finishedGroupCount === 0 && finishedKnockoutCount === 0;

  return (
    <div className="rise">
      <h1 className="font-display text-4xl uppercase leading-none text-tinta">Ranking</h1>
      <p className="mt-2 text-sm text-tinta/70">
        {nothingScored
          ? 'A pontuação entra conforme os resultados saem — grupos pontuam quando fecham os 6 jogos.'
          : `Pontuando: ${finishedGroupCount}/12 grupos fechados · ${finishedKnockoutCount} jogos de mata-mata.`}
      </p>

      {rows.length === 0 ? (
        <div className="card-azul mt-4 p-4 text-sm text-branco/80">
          Ninguém se cadastrou ainda. Compartilha o link no grupo! 🎠
        </div>
      ) : (
        <ol className="mt-4 space-y-2">
          {rows.map((row, i) => (
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
                    grupos {row.groupPoints + row.thirdPoints} · mata-mata {row.knockoutPoints}
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-azul px-2.5 py-1 font-mono text-lg font-semibold text-amarelo">
                  {row.total}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-center text-xs text-tinta/55">
        Toque em alguém pra ver os palpites (liberados conforme travam).
      </p>
    </div>
  );
}
