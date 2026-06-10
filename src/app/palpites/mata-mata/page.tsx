import { asc, eq, ne } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { knockoutPredictions, matches, teams } from '@/db/schema';
import { isLocked } from '@/lib/locks';
import { getCurrentParticipant } from '@/lib/session';
import { PalpitesTabs } from '@/components/PalpitesTabs';
import { KnockoutBetting, type KnockoutMatchView } from '@/components/KnockoutBetting';

export const dynamic = 'force-dynamic';

export default async function PalpitesMataMataPage() {
  const participant = await getCurrentParticipant();
  if (!participant) redirect('/entrar');

  const now = new Date();
  const [koMatches, allTeams, myPredictions] = await Promise.all([
    db
      .select()
      .from(matches)
      .where(ne(matches.stage, 'GROUP'))
      .orderBy(asc(matches.kickoffAt), asc(matches.id)),
    db.select().from(teams),
    db
      .select()
      .from(knockoutPredictions)
      .where(eq(knockoutPredictions.participantId, participant.id)),
  ]);

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const predictionByMatch = new Map(myPredictions.map((p) => [p.matchId, p]));

  const views: KnockoutMatchView[] = koMatches.map((m) => {
    const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
    const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
    const prediction = predictionByMatch.get(m.id);
    return {
      id: m.id,
      stage: m.stage as KnockoutMatchView['stage'],
      kickoffIso: m.kickoffAt.toISOString(),
      locked: isLocked(m.kickoffAt, now),
      home: home ? { id: home.id, name: home.name, flag: home.flag } : null,
      away: away ? { id: away.id, name: away.name, flag: away.flag } : null,
      homeSlot: m.homeSlot,
      awaySlot: m.awaySlot,
      prediction: prediction
        ? {
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
            penaltyWinnerTeamId: prediction.penaltyWinnerTeamId,
          }
        : null,
    };
  });

  const anyOpen = views.some((v) => v.home && v.away && !v.locked);

  return (
    <div className="rise">
      <PalpitesTabs />
      <h1 className="font-display text-4xl uppercase leading-none text-tinta">Mata-mata</h1>
      <p className="mt-2 text-sm text-tinta/70">
        Placar exato (vale o placar após a prorrogação). Empate? Escolha quem passa nos pênaltis.
        Cada palpite trava no horário do jogo.
      </p>

      {!anyOpen && (
        <div className="card-azul mt-4 p-4 text-sm text-branco/80">
          Nenhum confronto aberto pra palpite ainda — eles aparecem aqui conforme a fase de
          grupos define os classificados. ⏳
        </div>
      )}

      <KnockoutBetting matches={views} />
    </div>
  );
}
