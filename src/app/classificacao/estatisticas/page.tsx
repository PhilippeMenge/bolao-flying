import { ClassificacaoTabs } from '@/components/ClassificacaoTabs';
import { SharePdfButton } from '@/components/SharePdfButton';
import { GROUP_LETTERS } from '@/lib/config';
import { loadBetStats } from '@/lib/stats/load-stats';

export const dynamic = 'force-dynamic';

const POS_LABELS = ['1º', '2º', '3º', '4º'];

function pctLabel(pct: number) {
  return pct > 0 ? `${Math.round(pct)}%` : '–';
}

export default async function EstatisticasPage() {
  const data = await loadBetStats();

  if (!data.locked) {
    return (
      <div className="rise">
        <h1 className="font-display text-4xl uppercase leading-none text-tinta">Stats</h1>
        <div className="mt-4">
          <ClassificacaoTabs />
        </div>
        <div className="card-azul p-5 text-center">
          <p className="text-3xl">🔒</p>
          <p className="mt-2 text-sm text-branco/85">
            As estatísticas das apostas abrem quando os palpites travarem — senão ia dar pra
            colar do vizinho, né?
          </p>
        </div>
      </div>
    );
  }

  const { stats, allTeams, participantCount } = data;
  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const name = (teamId: number) => {
    const t = teamById.get(teamId);
    return t ? `${t.flag} ${t.name}` : '?';
  };
  const maisOusado = stats.ousadia[0];
  const maisCareta = stats.ousadia[stats.ousadia.length - 1];
  const discordia = stats.discordia[0];
  const zen = stats.discordia[stats.discordia.length - 1];
  const esquecidos = allTeams.length - stats.terceiros.length;

  return (
    <div className="rise">
      <h1 className="font-display text-4xl uppercase leading-none text-tinta">Stats</h1>
      <p className="mt-2 text-sm text-tinta/70">
        Os números por trás dos palpites de {participantCount} corajosos.
      </p>

      <div className="mt-4">
        <ClassificacaoTabs />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SharePdfButton doc="resumo" label="Resumo (PDF)" />
        <SharePdfButton doc="completo" label="Completo (PDF)" />
      </div>

      {/* Destaques */}
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {maisOusado && (
          <div className="sticker px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-tinta/55">
              🌶️ Mais ousado
            </p>
            <p className="mt-1 truncate font-display text-lg uppercase leading-tight">
              {maisOusado.name}
            </p>
            <p className="font-mono text-[11px] text-tinta/55">
              {Math.round(maisOusado.zebraPct)}% contra o consenso
            </p>
          </div>
        )}
        {maisCareta && stats.ousadia.length > 1 && (
          <div className="sticker px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-tinta/55">
              🐑 Maria-vai-com-as-outras
            </p>
            <p className="mt-1 truncate font-display text-lg uppercase leading-tight">
              {maisCareta.name}
            </p>
            <p className="font-mono text-[11px] text-tinta/55">
              só {Math.round(maisCareta.zebraPct)}% de zebra
            </p>
          </div>
        )}
        {discordia && (
          <div className="sticker px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-tinta/55">
              🔥 Grupo da discórdia
            </p>
            <p className="mt-1 font-display text-lg uppercase leading-tight">
              Grupo {discordia.groupLetter}
            </p>
            <p className="font-mono text-[11px] text-tinta/55">
              {discordia.distinctOrders} ordens diferentes
            </p>
          </div>
        )}
        {zen && stats.discordia.length > 1 && (
          <div className="sticker px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-tinta/55">
              🧘 Grupo zen
            </p>
            <p className="mt-1 font-display text-lg uppercase leading-tight">
              Grupo {zen.groupLetter}
            </p>
            <p className="font-mono text-[11px] text-tinta/55">
              {Math.round(zen.topShare)}% apostaram igual
            </p>
          </div>
        )}
      </div>

      {/* Consenso × realidade */}
      {stats.zebrasNoRadar.length > 0 && (
        <section className="card-azul mt-4 px-3 py-3">
          <h2 className="font-display text-xl uppercase leading-none text-amarelo">
            🦓 Zebras no radar
          </h2>
          <p className="mt-1 text-xs text-branco/70">
            Onde a tabela ao vivo está desmentindo o bolão.
          </p>
          <ul className="mt-3 space-y-2">
            {stats.zebrasNoRadar.map((z) => (
              <li key={`${z.groupLetter}-${z.teamId}`} className="text-[13px] text-branco/90">
                <span className="font-semibold">{name(z.teamId)}</span> era {POS_LABELS[z.consensusPos - 1]} do
                grupo {z.groupLetter} pra {Math.round(z.consensusPct)}% — tá em{' '}
                <span className="font-semibold text-amarelo">{POS_LABELS[z.livePos - 1]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Unanimidades + contramão */}
      {(stats.unanimidades.length > 0 || stats.contramao.length > 0) && (
        <section className="sticker mt-3 px-3 py-3">
          <h2 className="font-display text-xl uppercase leading-none text-tinta">
            🤝 Unanimidades &amp; teimosos
          </h2>
          {stats.unanimidades.length > 0 && (
            <ul className="mt-2 space-y-1 text-[13px]">
              {stats.unanimidades.map((u) => (
                <li key={`${u.groupLetter}-${u.teamId}-${u.position}`}>
                  Todo mundo pôs <span className="font-semibold">{name(u.teamId)}</span> em{' '}
                  {POS_LABELS[u.position - 1]} do grupo {u.groupLetter}
                </li>
              ))}
            </ul>
          )}
          {stats.unanimidades.length === 0 && (
            <p className="mt-2 text-[13px] text-tinta/70">
              Nenhuma unanimidade — bolão dividido até o talo. 🍿
            </p>
          )}
          {stats.contramao.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-tinta/10 pt-2 text-[13px]">
              {stats.contramao.map((c) => (
                <li key={`${c.groupLetter}-${c.teamId}`}>
                  Só <span className="font-semibold">{c.participantName}</span> acredita em{' '}
                  {name(c.teamId)} em 1º do grupo {c.groupLetter} 🫡
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Heatmap por grupo */}
      <section className="mt-4">
        <h2 className="font-display text-2xl uppercase leading-none text-tinta">
          O bolão por posição
        </h2>
        <p className="mt-1 text-xs text-tinta/60">
          % de apostas em cada posição. Times na ordem do consenso.
        </p>
        <div className="mt-3 space-y-3 lg:grid lg:grid-cols-3 lg:items-start lg:gap-3 lg:space-y-0">
          {GROUP_LETTERS.map((letter) => {
            const matrix = stats.matrices.get(letter);
            if (!matrix) return null;
            return (
              <div key={letter} className="sticker px-3 py-2.5">
                <h3 className="font-display text-lg uppercase leading-none text-tinta">
                  Grupo {letter}
                </h3>
                <table className="mt-2 w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="font-mono text-[10px] uppercase tracking-wider text-tinta/45">
                      <th className="pb-1 text-left font-normal">Seleção</th>
                      {POS_LABELS.map((p) => (
                        <th key={p} className="w-10 pb-1 text-center font-normal">
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map((row) => {
                      const team = teamById.get(row.teamId);
                      return (
                        <tr key={row.teamId} className="border-t border-tinta/10">
                          <td className="max-w-0 truncate py-1 pr-1">
                            {team ? (
                              <>
                                <span>{team.flag}</span>{' '}
                                <span className="font-semibold">{team.name}</span>
                              </>
                            ) : (
                              '?'
                            )}
                          </td>
                          {row.pct.map((pct, i) => (
                            <td key={i} className="px-0.5 py-1">
                              <span
                                className="block rounded py-0.5 text-center font-mono text-[11px] font-semibold"
                                style={{
                                  backgroundColor: `rgba(0, 151, 57, ${(pct / 100) * 0.9})`,
                                  color: pct >= 55 ? '#fffdf5' : 'rgba(10, 35, 100, 0.75)',
                                }}
                              >
                                {pctLabel(pct)}
                              </span>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </section>

      {/* No desktop, as três listas finais ficam lado a lado */}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-3">
      {/* Termômetro da ousadia */}
      <section className="card-azul mt-4 px-3 py-3">
        <h2 className="font-display text-xl uppercase leading-none text-amarelo">
          🌡️ Termômetro da ousadia
        </h2>
        <p className="mt-1 text-xs text-branco/70">
          % dos palpites na contramão do consenso do bolão.
        </p>
        <ol className="mt-3 space-y-1.5">
          {stats.ousadia.map((o, i) => (
            <li key={o.participantId} className="flex items-center gap-2 text-[13px] text-branco/90">
              <span className="w-5 shrink-0 text-center">
                {i === 0 ? '🌶️' : i === stats.ousadia.length - 1 ? '🐑' : ''}
              </span>
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              <span className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-branco/15">
                <span
                  className="block h-full rounded-full bg-amarelo"
                  style={{ width: `${Math.min(100, o.zebraPct)}%` }}
                />
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-[11px]">
                {Math.round(o.zebraPct)}%
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Raio-X dos terceiros */}
      <section className="sticker mt-3 px-3 py-3">
        <h2 className="font-display text-xl uppercase leading-none text-tinta">
          🔍 Raio-X dos terceiros
        </h2>
        <p className="mt-1 text-xs text-tinta/60">
          % do bolão que confia no time pra avançar como 3º.
        </p>
        <ol className="mt-3 space-y-1.5">
          {stats.terceiros.map((t) => (
            <li key={t.teamId} className="flex items-center gap-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate">{name(t.teamId)}</span>
              <span className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-tinta/10">
                <span
                  className="block h-full rounded-full bg-verde"
                  style={{ width: `${Math.min(100, t.pct)}%` }}
                />
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-[11px] text-tinta/60">
                {Math.round(t.pct)}%
              </span>
            </li>
          ))}
        </ol>
        {esquecidos > 0 && (
          <p className="mt-2 border-t border-tinta/10 pt-2 text-xs text-tinta/55">
            {esquecidos} seleções não foram lembradas por ninguém. 🥲
          </p>
        )}
      </section>

      {/* Discórdia */}
      <section className="sticker mt-3 px-3 py-3">
        <h2 className="font-display text-xl uppercase leading-none text-tinta">
          🔥 Ranking da discórdia
        </h2>
        <p className="mt-1 text-xs text-tinta/60">
          Quantas ordenações diferentes cada grupo recebeu.
        </p>
        <ol className="mt-3 space-y-1 text-[13px]">
          {stats.discordia.map((d, i) => (
            <li key={d.groupLetter} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-center">
                {i === 0 ? '🔥' : i === stats.discordia.length - 1 ? '🧘' : ''}
              </span>
              <span className="flex-1">Grupo {d.groupLetter}</span>
              <span className="font-mono text-[11px] text-tinta/60">
                {d.distinctOrders} {d.distinctOrders === 1 ? 'ordem' : 'ordens'} · top{' '}
                {Math.round(d.topShare)}%
              </span>
            </li>
          ))}
        </ol>
      </section>
      </div>
    </div>
  );
}
