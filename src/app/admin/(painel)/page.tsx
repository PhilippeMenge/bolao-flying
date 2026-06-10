import Link from 'next/link';
import { and, asc, eq, lt } from 'drizzle-orm';
import { db } from '@/db';
import { groupPredictions, matches, participants, teams, thirdPlacePicks } from '@/db/schema';
import { GROUP_LETTERS, THIRD_PLACE_ADVANCER_COUNT, TIMEZONE } from '@/lib/config';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIMEZONE,
});

export default async function AdminOverviewPage() {
  const now = new Date();
  const [allParticipants, allPredictions, allThirds, pendingMatches, allTeams] =
    await Promise.all([
      db.select().from(participants).orderBy(asc(participants.createdAt)),
      db.select().from(groupPredictions),
      db.select().from(thirdPlacePicks),
      db
        .select()
        .from(matches)
        .where(and(eq(matches.status, 'SCHEDULED'), lt(matches.kickoffAt, now)))
        .orderBy(asc(matches.kickoffAt)),
      db.select().from(teams),
    ]);

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const predictionCount = new Map<string, number>();
  for (const p of allPredictions) {
    predictionCount.set(p.participantId, (predictionCount.get(p.participantId) ?? 0) + 1);
  }
  const thirdsCount = new Map<string, number>();
  for (const t of allThirds) {
    thirdsCount.set(t.participantId, (thirdsCount.get(t.participantId) ?? 0) + 1);
  }
  const incomplete = allParticipants.filter(
    (p) =>
      (predictionCount.get(p.id) ?? 0) < GROUP_LETTERS.length * 4 ||
      (thirdsCount.get(p.id) ?? 0) < THIRD_PLACE_ADVANCER_COUNT,
  );

  return (
    <div className="rise space-y-4">
      <h1 className="font-display text-3xl uppercase leading-none text-tinta">Visão geral</h1>

      <section className="grid grid-cols-2 gap-3">
        <div className="sticker p-3 text-center">
          <p className="font-display text-3xl leading-none">{allParticipants.length}</p>
          <p className="mt-1 text-xs font-semibold text-tinta/60">participantes</p>
        </div>
        <div className="sticker p-3 text-center">
          <p className="font-display text-3xl leading-none">{pendingMatches.length}</p>
          <p className="mt-1 text-xs font-semibold text-tinta/60">jogos sem resultado</p>
        </div>
      </section>

      {pendingMatches.length > 0 && (
        <section className="card-azul p-4">
          <h2 className="font-display text-xl uppercase leading-none text-amarelo">
            ⚠️ Resultados pendentes
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {pendingMatches.slice(0, 8).map((m) => {
              const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
              const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
              return (
                <li key={m.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {home ? `${home.flag} ${home.name}` : m.homeSlot} ×{' '}
                    {away ? `${away.name} ${away.flag}` : m.awaySlot}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-branco/60">
                    {dateFormatter.format(m.kickoffAt)}
                  </span>
                </li>
              );
            })}
          </ul>
          <Link
            href="/admin/resultados"
            className="mt-3 block rounded-lg bg-verde px-3 py-2 text-center text-sm font-bold text-branco"
          >
            Lançar resultados →
          </Link>
        </section>
      )}

      <section className="sticker p-4">
        <h2 className="font-display text-xl uppercase leading-none">
          Quem ainda não apostou{' '}
          <span className="font-mono text-base text-danger">{incomplete.length}</span>
        </h2>
        {incomplete.length === 0 ? (
          <p className="mt-2 text-sm text-tinta/70">Todo mundo em dia! 🎉</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm font-semibold">
            {incomplete.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="font-mono text-xs text-tinta/55">
                  grupos {Math.floor((predictionCount.get(p.id) ?? 0) / 4)}/12 · 3ºs{' '}
                  {thirdsCount.get(p.id) ?? 0}/8
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
