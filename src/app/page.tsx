import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, asc, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { groupPredictions, matches, teams, thirdPlacePicks } from '@/db/schema';
import { GROUP_LETTERS, THIRD_PLACE_ADVANCER_COUNT, TIMEZONE } from '@/lib/config';
import { getGroupStageDeadline } from '@/lib/app-config';
import { isLocked } from '@/lib/locks';
import { getCurrentParticipant } from '@/lib/session';
import { isAdmin } from '@/lib/admin-auth';
import { Countdown } from '@/components/Countdown';
import { LogoutButton } from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIMEZONE,
});

export default async function HomePage() {
  const participant = await getCurrentParticipant();
  if (!participant) redirect('/entrar');

  const now = new Date();
  const [saved, savedThirds, deadline, nextMatches] = await Promise.all([
    db
      .select()
      .from(groupPredictions)
      .where(eq(groupPredictions.participantId, participant.id)),
    db.select().from(thirdPlacePicks).where(eq(thirdPlacePicks.participantId, participant.id)),
    getGroupStageDeadline(),
    db
      .select()
      .from(matches)
      .where(and(eq(matches.status, 'SCHEDULED'), gt(matches.kickoffAt, now)))
      .orderBy(asc(matches.kickoffAt))
      .limit(1),
  ]);

  const locked = isLocked(deadline, now);
  const groupsComplete = saved.length === GROUP_LETTERS.length * 4;
  const thirdsComplete = savedThirds.length === THIRD_PLACE_ADVANCER_COUNT;

  const nextMatch = nextMatches[0];
  let nextMatchLabel: string | null = null;
  if (nextMatch) {
    const allTeams = await db.select().from(teams);
    const teamById = new Map(allTeams.map((t) => [t.id, t]));
    const home = nextMatch.homeTeamId ? teamById.get(nextMatch.homeTeamId) : null;
    const away = nextMatch.awayTeamId ? teamById.get(nextMatch.awayTeamId) : null;
    const homeLabel = home ? `${home.flag} ${home.name}` : nextMatch.homeSlot ?? '?';
    const awayLabel = away ? `${away.name} ${away.flag}` : nextMatch.awaySlot ?? '?';
    nextMatchLabel = `${homeLabel} × ${awayLabel} — ${dateFormatter.format(nextMatch.kickoffAt)}`;
  }

  return (
    <div className="rise space-y-4 lg:mx-auto lg:max-w-2xl">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-tinta/60">
          Fala, craque
        </p>
        <h1 className="font-display text-4xl uppercase leading-none text-tinta">
          {participant.name}
        </h1>
      </div>

      <section className="card-azul flex items-center justify-between px-4 py-3">
        <span className="text-sm text-branco/80">
          {locked ? 'Fase de grupos' : 'Prazo da fase de grupos'}
        </span>
        {locked ? (
          <span className="font-bold text-amarelo">🔒 travada</span>
        ) : (
          <span className="text-amarelo">
            <Countdown deadlineIso={deadline.toISOString()} />
          </span>
        )}
      </section>

      <Link href="/palpites/grupos" className="block">
        <section className="sticker p-4 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--azul)]">
          <h2 className="font-display text-2xl uppercase leading-none">Seus palpites 🎯</h2>
          <ul className="mt-2.5 space-y-1 text-sm font-semibold">
            <li className="flex items-center justify-between">
              <span>Grupos ordenados</span>
              <span className={`font-mono ${groupsComplete ? 'text-verde' : 'text-danger'}`}>
                {groupsComplete ? '12/12 ✓' : saved.length === 0 ? 'não começou' : 'incompleto'}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Melhores terceiros</span>
              <span className={`font-mono ${thirdsComplete ? 'text-verde' : 'text-danger'}`}>
                {savedThirds.length}/{THIRD_PLACE_ADVANCER_COUNT}
                {thirdsComplete ? ' ✓' : ''}
              </span>
            </li>
          </ul>
          {!locked && (!groupsComplete || !thirdsComplete) && (
            <p className="mt-3 rounded-lg bg-verde px-3 py-2 text-[13px] font-bold text-branco">
              Complete seus palpites antes do prazo! →
            </p>
          )}
        </section>
      </Link>

      {nextMatchLabel && (
        <section className="sticker p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-tinta/60">
            Próximo jogo
          </h2>
          <p className="mt-1.5 text-[15px] font-semibold">{nextMatchLabel}</p>
          <p className="mt-0.5 text-xs text-tinta/55">horário de Brasília</p>
        </section>
      )}

      {(await isAdmin()) && (
        <Link
          href="/admin"
          className="block rounded-lg border-2 border-azul-escuro bg-azul px-4 py-3 text-center font-display text-lg uppercase leading-none text-amarelo"
        >
          Painel do admin 🔧
        </Link>
      )}

      <div className="pt-2 text-center">
        <LogoutButton />
      </div>
    </div>
  );
}
