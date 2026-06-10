import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { matches, teams } from '@/db/schema';
import { ResultadoCard, type MatchForAdmin } from '@/components/admin/ResultadoCard';

export const dynamic = 'force-dynamic';

export default async function AdminResultadosPage() {
  const now = new Date();
  const [allMatches, allTeams] = await Promise.all([
    db.select().from(matches).orderBy(asc(matches.kickoffAt), asc(matches.id)),
    db.select().from(teams),
  ]);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  const toCard = (m: (typeof allMatches)[number]): MatchForAdmin => ({
    id: m.id,
    stage: m.stage,
    groupLetter: m.groupLetter,
    kickoffAt: m.kickoffAt.toISOString(),
    status: m.status,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    penaltyWinnerTeamId: m.penaltyWinnerTeamId,
    resultLockedByAdmin: m.resultLockedByAdmin,
    home: m.homeTeamId
      ? { id: m.homeTeamId, name: teamById.get(m.homeTeamId)!.name, flag: teamById.get(m.homeTeamId)!.flag }
      : null,
    away: m.awayTeamId
      ? { id: m.awayTeamId, name: teamById.get(m.awayTeamId)!.name, flag: teamById.get(m.awayTeamId)!.flag }
      : null,
    homeSlot: m.homeSlot,
    awaySlot: m.awaySlot,
  });

  const pending = allMatches.filter((m) => m.status === 'SCHEDULED' && m.kickoffAt <= now);
  const upcoming = allMatches.filter((m) => m.status === 'SCHEDULED' && m.kickoffAt > now);
  const finished = allMatches.filter((m) => m.status === 'FINISHED').reverse();

  return (
    <div className="rise space-y-5">
      <h1 className="font-display text-3xl uppercase leading-none text-tinta">Resultados</h1>

      <section>
        <h2 className="font-display text-xl uppercase text-tinta">
          Pendentes <span className="font-mono text-base text-danger">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="mt-1 text-sm text-tinta/60">Nenhum jogo encerrado sem resultado.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {pending.map((m) => (
              <ResultadoCard key={m.id} match={toCard(m)} startOpen />
            ))}
          </div>
        )}
      </section>

      {finished.length > 0 && (
        <section>
          <h2 className="font-display text-xl uppercase text-tinta">
            Finalizados <span className="font-mono text-base text-verde">{finished.length}</span>
          </h2>
          <div className="mt-2 space-y-3">
            {finished.map((m) => (
              <ResultadoCard key={m.id} match={toCard(m)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl uppercase text-tinta">Próximos jogos</h2>
        <div className="mt-2 space-y-3">
          {upcoming.slice(0, 12).map((m) => (
            <ResultadoCard key={m.id} match={toCard(m)} />
          ))}
        </div>
        {upcoming.length > 12 && (
          <p className="mt-2 text-xs text-tinta/55">
            … e mais {upcoming.length - 12} jogos futuros (aparecem aqui conforme chegam).
          </p>
        )}
      </section>
    </div>
  );
}
