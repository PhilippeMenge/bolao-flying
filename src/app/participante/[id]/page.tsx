import { notFound, redirect } from 'next/navigation';
import { asc, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import {
  groupPredictions,
  knockoutPredictions,
  matches,
  participants,
  teams,
  thirdPlacePicks,
} from '@/db/schema';
import { GROUP_LETTERS } from '@/lib/config';
import { getGroupStageDeadline } from '@/lib/app-config';
import { isLocked } from '@/lib/locks';
import { getCurrentParticipant } from '@/lib/session';

export const dynamic = 'force-dynamic';

const STAGE_LABELS: Record<string, string> = {
  R32: 'Fase de 32',
  R16: 'Oitavas',
  QF: 'Quartas',
  SF: 'Semifinal',
  THIRD: '3º lugar',
  FINAL: 'Final',
};

export default async function ParticipantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getCurrentParticipant();
  if (!viewer) redirect('/entrar');

  const { id } = await params;
  const [participant] = await db.select().from(participants).where(eq(participants.id, id));
  if (!participant) notFound();

  const now = new Date();
  const deadline = await getGroupStageDeadline();
  const groupsLocked = isLocked(deadline, now);
  const isSelf = viewer.id === participant.id;

  // Visibilidade: palpites alheios só aparecem depois que travam (filtro AQUI, no servidor)
  const canSeeGroups = isSelf || groupsLocked;

  const [allTeams, preds, thirds, koPreds, koMatches] = await Promise.all([
    db.select().from(teams),
    canSeeGroups
      ? db.select().from(groupPredictions).where(eq(groupPredictions.participantId, participant.id))
      : Promise.resolve([]),
    canSeeGroups
      ? db.select().from(thirdPlacePicks).where(eq(thirdPlacePicks.participantId, participant.id))
      : Promise.resolve([]),
    db
      .select()
      .from(knockoutPredictions)
      .where(eq(knockoutPredictions.participantId, participant.id)),
    db.select().from(matches).where(ne(matches.stage, 'GROUP')).orderBy(asc(matches.kickoffAt)),
  ]);

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const positionByTeam = new Map(preds.map((p) => [p.teamId, p.position]));
  const thirdTeamIds = new Set(thirds.map((t) => t.teamId));

  // Mata-mata: mostra só palpites de jogos já travados (ou os próprios)
  const matchById = new Map(koMatches.map((m) => [m.id, m]));
  const visibleKoPreds = koPreds.filter((p) => {
    const match = matchById.get(p.matchId);
    return match && (isSelf || isLocked(match.kickoffAt, now));
  });

  return (
    <div className="rise space-y-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-tinta/60">
          Palpites de
        </p>
        <h1 className="font-display text-4xl uppercase leading-none text-tinta">
          {participant.name}
        </h1>
      </div>

      {!canSeeGroups ? (
        <div className="card-azul p-4 text-sm text-branco/80">
          Os palpites da fase de grupos ficam secretos até o prazo travar. 🤫
        </div>
      ) : preds.length === 0 ? (
        <div className="card-azul p-4 text-sm text-branco/80">
          {participant.name} não fez palpites da fase de grupos. 😴
        </div>
      ) : (
        <section>
          <h2 className="font-display text-xl uppercase text-tinta">Fase de grupos</h2>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            {GROUP_LETTERS.map((letter) => {
              const groupTeams = allTeams
                .filter((t) => t.groupLetter === letter && positionByTeam.has(t.id))
                .sort((a, b) => positionByTeam.get(a.id)! - positionByTeam.get(b.id)!);
              if (groupTeams.length === 0) return null;
              return (
                <div key={letter} className="sticker overflow-hidden">
                  <p className="bg-verde px-2.5 py-1 font-display text-sm uppercase leading-none text-branco">
                    Grupo <span className="text-amarelo">{letter}</span>
                  </p>
                  <ul className="px-2.5 py-1.5">
                    {groupTeams.map((t, i) => (
                      <li key={t.id} className="flex items-center gap-1.5 py-0.5 text-[13px]">
                        <span className="font-mono text-[10px] text-tinta/50">{i + 1}º</span>
                        <span>{t.flag}</span>
                        <span className="truncate font-semibold">{t.name}</span>
                        {i === 2 && thirdTeamIds.has(t.id) && (
                          <span title="marcado pra avançar como terceiro">⭐</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-tinta/55">⭐ = terceiro marcado pra avançar</p>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl uppercase text-tinta">Mata-mata</h2>
        {visibleKoPreds.length === 0 ? (
          <p className="mt-2 text-sm text-tinta/60">
            Nenhum palpite de mata-mata visível ainda (aparecem quando cada jogo trava).
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {visibleKoPreds.map((p) => {
              const match = matchById.get(p.matchId)!;
              const home = match.homeTeamId ? teamById.get(match.homeTeamId) : null;
              const away = match.awayTeamId ? teamById.get(match.awayTeamId) : null;
              const penaltyTeam = p.penaltyWinnerTeamId ? teamById.get(p.penaltyWinnerTeamId) : null;
              return (
                <li key={p.matchId} className="sticker px-3 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-tinta/55">
                    #{match.id} · {STAGE_LABELS[match.stage] ?? match.stage}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {home ? `${home.flag} ${home.name}` : match.homeSlot}{' '}
                    <span className="rounded bg-azul px-1.5 py-0.5 font-mono text-amarelo">
                      {p.homeScore} × {p.awayScore}
                    </span>{' '}
                    {away ? `${away.name} ${away.flag}` : match.awaySlot}
                    {penaltyTeam && (
                      <span className="text-xs text-tinta/60"> · pênaltis: {penaltyTeam.name}</span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
