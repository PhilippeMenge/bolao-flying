import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { groupPredictions, participants, thirdPlacePicks } from '@/db/schema';
import { GROUP_LETTERS, THIRD_PLACE_ADVANCER_COUNT } from '@/lib/config';
import { ParticipanteRow } from '@/components/admin/ParticipanteRow';

export const dynamic = 'force-dynamic';

export default async function AdminParticipantesPage() {
  const [allParticipants, allPredictions, allThirds] = await Promise.all([
    db.select().from(participants).orderBy(asc(participants.name)),
    db.select().from(groupPredictions),
    db.select().from(thirdPlacePicks),
  ]);

  const predictionCount = new Map<string, number>();
  for (const p of allPredictions) {
    predictionCount.set(p.participantId, (predictionCount.get(p.participantId) ?? 0) + 1);
  }
  const thirdsCount = new Map<string, number>();
  for (const t of allThirds) {
    thirdsCount.set(t.participantId, (thirdsCount.get(t.participantId) ?? 0) + 1);
  }

  return (
    <div className="rise">
      <h1 className="font-display text-3xl uppercase leading-none text-tinta">Participantes</h1>
      <p className="mt-1 text-sm text-tinta/70">
        As contas são criadas pelos próprios participantes no cadastro. Aqui você corrige nomes ou
        remove alguém (apaga os palpites; a conta de login continua existindo).
      </p>

      {allParticipants.length === 0 ? (
        <div className="card-azul mt-4 p-4 text-sm text-branco/80">
          Ninguém se cadastrou ainda. Compartilha o link do bolão no grupo! 🎠
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {allParticipants.map((p) => (
            <ParticipanteRow
              key={p.id}
              participant={{ id: p.id, name: p.name }}
              groupsComplete={(predictionCount.get(p.id) ?? 0) === GROUP_LETTERS.length * 4}
              thirdsComplete={(thirdsCount.get(p.id) ?? 0) === THIRD_PLACE_ADVANCER_COUNT}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
