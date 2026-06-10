import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { appConfig } from '@/db/schema';
import { CONFIG_KEYS } from './config';

export async function getConfigValue<T>(key: string): Promise<T | null> {
  const [row] = await db.select().from(appConfig).where(eq(appConfig.key, key));
  return (row?.value as T) ?? null;
}

export async function setConfigValue(key: string, value: unknown): Promise<void> {
  await db
    .insert(appConfig)
    .values({ key, value })
    .onConflictDoUpdate({ target: appConfig.key, set: { value } });
}

export async function getGroupStageDeadline(): Promise<Date> {
  const iso = await getConfigValue<string>(CONFIG_KEYS.groupStageDeadline);
  if (!iso) throw new Error('groupStageDeadline não configurado — rode o seed');
  return new Date(iso);
}
