import { ClassificacaoTabs } from '@/components/ClassificacaoTabs';
import { GROUP_LETTERS, THIRD_PLACE_ADVANCER_COUNT } from '@/lib/config';
import { loadStandings } from '@/lib/scoring/load-leaderboard';

export const dynamic = 'force-dynamic';

function sg(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

export default async function GruposPage() {
  const { standings, liveThirdRanking, allTeams } = await loadStandings();
  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const anyPlayed = [...standings.values()].some((s) => s.playedMatches > 0);

  return (
    <div className="rise">
      <h1 className="font-display text-4xl uppercase leading-none text-tinta">Grupos</h1>
      <p className="mt-2 text-sm text-tinta/70">
        Tabela ao vivo — os 2 primeiros avançam; os {THIRD_PLACE_ADVANCER_COUNT} melhores 3ºs também.
      </p>

      <div className="mt-4">
        <ClassificacaoTabs />
      </div>

      <div className="space-y-3">
        {GROUP_LETTERS.map((letter) => {
          const standing = standings.get(letter);
          if (!standing) return null;
          const played = standing.playedMatches > 0;
          return (
            <section key={letter} className="sticker px-3 py-2.5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl uppercase leading-none text-tinta">
                  Grupo {letter}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                    standing.complete
                      ? 'bg-verde text-branco'
                      : played
                        ? 'bg-amarelo text-tinta'
                        : 'bg-tinta/10 text-tinta/55'
                  }`}
                >
                  {standing.complete
                    ? 'fechado'
                    : played
                      ? `${standing.playedMatches}/6 jogos`
                      : 'aguardando jogos'}
                </span>
              </div>
              <table className="mt-2 w-full border-collapse text-[13px]">
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-wider text-tinta/45">
                    <th className="w-6 pb-1 text-left font-normal">#</th>
                    <th className="pb-1 text-left font-normal">Seleção</th>
                    <th className="w-7 pb-1 text-right font-normal">P</th>
                    <th className="w-7 pb-1 text-right font-normal">J</th>
                    <th className="w-8 pb-1 text-right font-normal">SG</th>
                    <th className="w-8 pb-1 text-right font-normal">GP</th>
                  </tr>
                </thead>
                <tbody>
                  {standing.order.map((teamId, i) => {
                    const team = teamById.get(teamId);
                    const stats = standing.stats.get(teamId)!;
                    const tone = !played
                      ? 'text-tinta/55'
                      : i < 2
                        ? 'text-tinta'
                        : i === 2
                          ? 'text-tinta'
                          : 'text-tinta/55';
                    return (
                      <tr key={teamId} className={`border-t border-tinta/10 ${tone}`}>
                        <td className="py-1">
                          <span
                            className={`inline-block w-5 rounded text-center font-mono text-[11px] font-semibold ${
                              !played
                                ? 'text-tinta/40'
                                : i < 2
                                  ? 'bg-verde text-branco'
                                  : i === 2
                                    ? 'bg-amarelo text-tinta'
                                    : 'text-tinta/40'
                            }`}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="max-w-0 truncate py-1 pr-2">
                          {team ? (
                            <>
                              <span>{team.flag}</span>{' '}
                              <span className={i < 3 && played ? 'font-semibold' : ''}>
                                {team.name}
                              </span>
                            </>
                          ) : (
                            '?'
                          )}
                        </td>
                        <td className="py-1 text-right font-mono font-semibold">{stats.points}</td>
                        <td className="py-1 text-right font-mono text-tinta/55">{stats.played}</td>
                        <td className="py-1 text-right font-mono">{sg(stats.gd)}</td>
                        <td className="py-1 text-right font-mono">{stats.gf}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      <section className="card-azul mt-4 px-3 py-3">
        <h2 className="font-display text-xl uppercase leading-none text-amarelo">Melhores 3ºs</h2>
        <p className="mt-1 text-xs text-branco/70">
          Os {THIRD_PLACE_ADVANCER_COUNT} primeiros daqui avançam. Só entram grupos que já jogaram
          — tabela parcial, muda a cada rodada.
        </p>
        {!anyPlayed ? (
          <p className="mt-3 text-sm text-branco/80">Aguardando os primeiros jogos. ⚽</p>
        ) : (
          <ol className="mt-3 space-y-1">
            {liveThirdRanking.map((third, i) => {
              const team = teamById.get(third.teamId);
              const advancing = i < THIRD_PLACE_ADVANCER_COUNT;
              return (
                <li
                  key={third.teamId}
                  className={`flex items-center gap-2 rounded-md px-2 py-1 text-[13px] ${
                    advancing ? 'bg-branco/10 text-branco' : 'text-branco/45'
                  }`}
                >
                  <span
                    className={`w-5 shrink-0 text-center font-mono text-[11px] font-semibold ${
                      advancing ? 'text-amarelo' : ''
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {team ? (
                      <>
                        <span>{team.flag}</span>{' '}
                        <span className={advancing ? 'font-semibold' : ''}>{team.name}</span>
                      </>
                    ) : (
                      '?'
                    )}
                    <span className="ml-1 font-mono text-[10px] uppercase opacity-60">
                      gr. {third.groupLetter}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px]">
                    {third.stats.points} pts · {sg(third.stats.gd)} · {third.stats.gf} gp
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
