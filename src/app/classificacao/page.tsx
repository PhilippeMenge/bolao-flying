import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { participants } from '@/db/schema';

export const dynamic = 'force-dynamic';

export default async function ClassificacaoPage() {
  const allParticipants = await db.select().from(participants).orderBy(asc(participants.name));

  return (
    <div className="rise">
      <h1 className="font-display text-4xl uppercase leading-none text-tinta">Ranking</h1>
      <div className="card-azul mt-4 p-4 text-sm text-branco/80">
        A pontuação aparece aqui quando a bola rolar. 🏆 Enquanto isso, espia os palpites da
        concorrência (liberados conforme travam):
      </div>
      <ul className="mt-4 space-y-2">
        {allParticipants.map((p, i) => (
          <li key={p.id} className="rise" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
            <Link
              href={`/participante/${p.id}`}
              className="sticker flex items-center justify-between px-4 py-3 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--azul)]"
            >
              <span className="font-display text-lg uppercase leading-none">{p.name}</span>
              <span className="text-tinta/40">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
