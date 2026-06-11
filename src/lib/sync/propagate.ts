// Propagação de slots do mata-mata: vencedor/perdedor de um jogo preenche os
// confrontos que referenciam 'W<num>' / 'L<num>'. Usada pelo admin e pelo sync.
import 'server-only';
import { eq, or } from 'drizzle-orm';
import { db } from '@/db';
import { matches } from '@/db/schema';

export async function propagateKnockoutSlots(
  matchId: number,
  winnerTeamId: number,
  loserTeamId: number,
): Promise<void> {
  for (const [slot, teamId] of [
    [`W${matchId}`, winnerTeamId],
    [`L${matchId}`, loserTeamId],
  ] as const) {
    const dependents = await db
      .select()
      .from(matches)
      .where(or(eq(matches.homeSlot, slot), eq(matches.awaySlot, slot)));
    for (const dep of dependents) {
      await db
        .update(matches)
        .set(dep.homeSlot === slot ? { homeTeamId: teamId } : { awayTeamId: teamId })
        .where(eq(matches.id, dep.id));
    }
  }
}
