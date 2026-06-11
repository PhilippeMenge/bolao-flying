'use client';

import { useState, useTransition } from 'react';
import { alternarSync, sincronizarAgora } from '@/actions/admin';
import type { SyncSummary } from '@/lib/sync/run-sync';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

function summaryLine(s: SyncSummary): string {
  const when = dateFormatter.format(new Date(s.at));
  if (s.skipped === 'disabled') return `${when} — pulado (sync desligado)`;
  if (s.skipped === 'no-token') return `${when} — pulado (FOOTBALL_DATA_TOKEN não configurado)`;
  if (s.error) return `${when} — erro: ${s.error}`;
  return `${when} — ${s.resultsApplied} resultado(s), ${s.teamsFilled} confronto(s) preenchido(s), ${s.unmatched} sem mapeamento`;
}

export function SyncControls({
  enabled: initialEnabled,
  hasToken,
  lastSync,
}: {
  enabled: boolean;
  hasToken: boolean;
  lastSync: SyncSummary | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [summary, setSummary] = useState<SyncSummary | null>(lastSync);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    setError(null);
    const next = !enabled;
    startTransition(async () => {
      const result = await alternarSync(next);
      if (result.ok) setEnabled(next);
      else setError(result.error);
    });
  }

  function syncNow() {
    setError(null);
    startTransition(async () => {
      const result = await sincronizarAgora();
      setSummary(result);
    });
  }

  return (
    <section className="sticker p-4">
      <h2 className="font-display text-xl uppercase leading-none">Sync automático ⚙️</h2>
      <p className="mt-1.5 text-sm text-tinta/70">
        Puxa resultados da football-data.org a cada 20 min (GitHub Actions) e preenche placares e
        confrontos. Resultados travados por você nunca são sobrescritos.
      </p>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Token da football-data.org</span>
          <span className={`font-mono text-xs ${hasToken ? 'text-verde' : 'text-danger'}`}>
            {hasToken ? 'configurado ✓' : 'faltando'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Sync ligado</span>
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className={`rounded-full border-2 px-3 py-1 font-mono text-xs font-bold disabled:opacity-50 ${
              enabled ? 'border-verde-escuro bg-verde text-branco' : 'border-tinta/25 bg-tinta/5 text-tinta/60'
            }`}
          >
            {enabled ? 'LIGADO' : 'DESLIGADO'}
          </button>
        </div>
      </div>

      {summary && (
        <p className="mt-3 rounded-lg bg-azul px-3 py-2 font-mono text-[11px] text-branco/85">
          Última execução: {summaryLine(summary)}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-branco">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={syncNow}
        disabled={pending}
        className="mt-3 w-full rounded-lg border-2 border-verde-escuro bg-verde py-2.5 font-display text-base uppercase leading-none text-branco disabled:opacity-50"
      >
        {pending ? 'Rodando…' : 'Sincronizar agora'}
      </button>
    </section>
  );
}
