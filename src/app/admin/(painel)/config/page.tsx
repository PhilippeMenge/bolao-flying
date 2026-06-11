import { CONFIG_KEYS } from '@/lib/config';
import { getConfigValue, getGroupStageDeadline } from '@/lib/app-config';
import type { SyncSummary } from '@/lib/sync/run-sync';
import { DeadlineForm } from '@/components/admin/DeadlineForm';
import { SyncControls } from '@/components/admin/SyncControls';

export const dynamic = 'force-dynamic';

export default async function AdminConfigPage() {
  const [deadline, syncEnabled, lastSync] = await Promise.all([
    getGroupStageDeadline(),
    getConfigValue<boolean>(CONFIG_KEYS.syncEnabled),
    getConfigValue<SyncSummary>(CONFIG_KEYS.lastSync),
  ]);

  return (
    <div className="rise space-y-4">
      <h1 className="font-display text-3xl uppercase leading-none text-tinta">Config</h1>
      <DeadlineForm deadlineIso={deadline.toISOString()} />
      <SyncControls
        enabled={syncEnabled === true}
        hasToken={Boolean(process.env.FOOTBALL_DATA_TOKEN)}
        lastSync={lastSync}
      />
    </div>
  );
}
