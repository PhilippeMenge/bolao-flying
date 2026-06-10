import { redirect } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { groupPredictions, teams, thirdPlacePicks } from '@/db/schema';
import { GROUP_LETTERS } from '@/lib/config';
import { getGroupStageDeadline } from '@/lib/app-config';
import { isLocked } from '@/lib/locks';
import { getCurrentParticipant } from '@/lib/session';
import { GroupBettingEditor } from '@/components/GroupBettingEditor';

export const dynamic = 'force-dynamic';

export default async function PalpitesGruposPage() {
  const participant = await getCurrentParticipant();
  if (!participant) redirect('/entrar');

  const [allTeams, saved, savedThirds, deadline] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.id)),
    db
      .select()
      .from(groupPredictions)
      .where(eq(groupPredictions.participantId, participant.id)),
    db.select().from(thirdPlacePicks).where(eq(thirdPlacePicks.participantId, participant.id)),
    getGroupStageDeadline(),
  ]);

  const positionByTeam = new Map(saved.map((p) => [p.teamId, p.position]));
  const groups = GROUP_LETTERS.map((letter) => {
    const groupTeams = allTeams
      .filter((t) => t.groupLetter === letter)
      .sort((a, b) => {
        const pa = positionByTeam.get(a.id);
        const pb = positionByTeam.get(b.id);
        if (pa != null && pb != null) return pa - pb;
        return a.id - b.id;
      });
    return {
      letter,
      teams: groupTeams.map((t) => ({ id: t.id, name: t.name, flag: t.flag })),
    };
  });

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const initialThirds = savedThirds
    .map((p) => teamById.get(p.teamId)?.groupLetter)
    .filter((l): l is string => l != null);

  return (
    <GroupBettingEditor
      groups={groups}
      initialThirds={initialThirds}
      hasSaved={saved.length > 0}
      locked={isLocked(deadline, new Date())}
      deadlineIso={deadline.toISOString()}
    />
  );
}
