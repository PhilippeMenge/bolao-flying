import { NextResponse, type NextRequest } from 'next/server';
import { runSync } from '@/lib/sync/run-sync';

export const dynamic = 'force-dynamic';
// O fetch externo + escrita no banco pode passar do default
export const maxDuration = 60;

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  }
  const summary = await runSync();
  return NextResponse.json(summary);
}

export { handle as GET, handle as POST };
