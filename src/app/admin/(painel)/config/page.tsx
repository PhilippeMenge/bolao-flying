import { getGroupStageDeadline } from '@/lib/app-config';
import { DeadlineForm } from '@/components/admin/DeadlineForm';

export const dynamic = 'force-dynamic';

export default async function AdminConfigPage() {
  const deadline = await getGroupStageDeadline();

  return (
    <div className="rise space-y-4">
      <h1 className="font-display text-3xl uppercase leading-none text-tinta">Config</h1>
      <DeadlineForm deadlineIso={deadline.toISOString()} />
      <section className="card-azul p-4 text-sm text-branco/75">
        <p>
          <strong className="text-branco">Sync automático de resultados:</strong> ainda não
          configurado (entra numa próxima etapa, via football-data.org). Por enquanto os
          resultados são lançados manualmente na aba Resultados.
        </p>
      </section>
    </div>
  );
}
