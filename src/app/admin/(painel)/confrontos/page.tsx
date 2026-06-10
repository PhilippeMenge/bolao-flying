import { asc, ne } from 'drizzle-orm';
import { db } from '@/db';
import { matches, teams } from '@/db/schema';
import { ConfrontoCard, type ConfrontoView, type TeamOption } from '@/components/admin/ConfrontoCard';

export const dynamic = 'force-dynamic';

export default async function AdminConfrontosPage() {
  const [koMatches, allTeams] = await Promise.all([
    db
      .select()
      .from(matches)
      .where(ne(matches.stage, 'GROUP'))
      .orderBy(asc(matches.kickoffAt), asc(matches.id)),
    db.select().from(teams).orderBy(asc(teams.name)),
  ]);

  const teamOptions: TeamOption[] = allTeams.map((t) => ({
    id: t.id,
    name: t.name,
    flag: t.flag,
    groupLetter: t.groupLetter,
  }));

  const views: ConfrontoView[] = koMatches.map((m) => ({
    id: m.id,
    stage: m.stage,
    kickoffIso: m.kickoffAt.toISOString(),
    finished: m.status === 'FINISHED',
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeSlot: m.homeSlot,
    awaySlot: m.awaySlot,
  }));

  const pendingCount = views.filter((v) => !v.homeTeamId || !v.awayTeamId).length;

  return (
    <div className="rise">
      <h1 className="font-display text-3xl uppercase leading-none text-tinta">Confrontos</h1>
      <p className="mt-1 text-sm text-tinta/70">
        Atribua os classificados aos slots do mata-mata. Vencedores de jogos do mata-mata são
        preenchidos automaticamente quando você lança o resultado; aqui você define quem vem dos
        grupos (1ºA, 2ºC, terceiros…) e corrige o que precisar.
      </p>
      <p className="mt-2 font-mono text-xs text-tinta/60">
        {pendingCount} de {views.length} confrontos ainda sem os dois times.
      </p>

      <div className="mt-4 space-y-3">
        {views.map((v) => (
          <ConfrontoCard key={v.id} match={v} teams={teamOptions} />
        ))}
      </div>
    </div>
  );
}
