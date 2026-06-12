import { asc } from 'drizzle-orm';
import { GruposTabs } from '@/components/GruposTabs';
import { db } from '@/db';
import { matches, teams, type Match, type Team } from '@/db/schema';
import { TIMEZONE } from '@/lib/config';

export const dynamic = 'force-dynamic';

const STAGE_LABELS: Record<Match['stage'], string> = {
  GROUP: 'Grupo',
  R32: 'Fase de 32',
  R16: 'Oitavas',
  QF: 'Quartas',
  SF: 'Semifinal',
  THIRD: '3º lugar',
  FINAL: 'Final',
};

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TIMEZONE,
});
const dayLabelFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  timeZone: TIMEZONE,
});
const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIMEZONE,
});

function TeamLabel({ team, slot, align }: { team: Team | null; slot: string | null; align: 'left' | 'right' }) {
  const content = team ? (
    align === 'left' ? (
      <>
        <span>{team.flag}</span> <span className="font-semibold">{team.name}</span>
      </>
    ) : (
      <>
        <span className="font-semibold">{team.name}</span> <span>{team.flag}</span>
      </>
    )
  ) : (
    <span className="font-mono text-xs text-tinta/50">{slot ?? '?'}</span>
  );
  return <span className={`flex-1 truncate text-[14px] ${align === 'right' ? 'text-right' : ''}`}>{content}</span>;
}

export default async function JogosPage() {
  const [allMatches, allTeams] = await Promise.all([
    db.select().from(matches).orderBy(asc(matches.kickoffAt), asc(matches.id)),
    db.select().from(teams),
  ]);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const todayKey = dayKeyFormatter.format(new Date());

  const days: { key: string; label: string; matches: Match[] }[] = [];
  for (const match of allMatches) {
    const key = dayKeyFormatter.format(match.kickoffAt);
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      day = { key, label: dayLabelFormatter.format(match.kickoffAt), matches: [] };
      days.push(day);
    }
    day.matches.push(match);
  }

  return (
    <div className="rise">
      <h1 className="font-display text-4xl uppercase leading-none text-tinta">Jogos</h1>
      <p className="mt-2 text-sm text-tinta/70">Horários de Brasília.</p>

      <div className="mt-4">
        <GruposTabs />
      </div>

      <div className="space-y-5">
        {days.map((day) => (
          <section key={day.key} id={day.key === todayKey ? 'hoje' : undefined}>
            <h2
              className={`sticky top-0 z-10 -mx-1 rounded-lg border-2 px-3 py-1 font-display text-base uppercase capitalize leading-snug ${
                day.key === todayKey
                  ? 'border-verde-escuro bg-verde text-branco'
                  : 'border-azul-escuro bg-azul text-branco/90'
              }`}
            >
              {day.label}
              {day.key === todayKey && <span className="text-amarelo"> — hoje</span>}
            </h2>
            <ul className="mt-2 space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
              {day.matches.map((m) => {
                const home = m.homeTeamId ? teamById.get(m.homeTeamId) ?? null : null;
                const away = m.awayTeamId ? teamById.get(m.awayTeamId) ?? null : null;
                const finished = m.status === 'FINISHED';
                const penaltyWinner = m.penaltyWinnerTeamId
                  ? teamById.get(m.penaltyWinnerTeamId)
                  : null;
                return (
                  <li key={m.id} className="sticker px-3 py-2.5">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-tinta/55">
                      <span>
                        {m.stage === 'GROUP' ? `Grupo ${m.groupLetter}` : STAGE_LABELS[m.stage]}
                      </span>
                      <span>{finished ? 'encerrado' : timeFormatter.format(m.kickoffAt)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <TeamLabel team={home} slot={m.homeSlot} align="left" />
                      <span className="shrink-0 rounded-md bg-azul px-2 py-0.5 font-mono text-sm font-semibold text-amarelo">
                        {finished ? `${m.homeScore} × ${m.awayScore}` : '×'}
                      </span>
                      <TeamLabel team={away} slot={m.awaySlot} align="right" />
                    </div>
                    {finished && penaltyWinner && (
                      <p className="mt-1 text-right text-[11px] font-semibold text-verde">
                        {penaltyWinner.flag} {penaltyWinner.name} venceu nos pênaltis
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
