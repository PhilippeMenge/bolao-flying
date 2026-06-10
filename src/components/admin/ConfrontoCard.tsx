'use client';

import { useState, useTransition } from 'react';
import { definirConfronto } from '@/actions/admin';

export type TeamOption = { id: number; name: string; flag: string; groupLetter: string };

export type ConfrontoView = {
  id: number;
  stage: string;
  kickoffIso: string;
  finished: boolean;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeSlot: string | null;
  awaySlot: string | null;
};

const STAGE_LABELS: Record<string, string> = {
  R32: 'Fase de 32',
  R16: 'Oitavas',
  QF: 'Quartas',
  SF: 'Semifinal',
  THIRD: '3º lugar',
  FINAL: 'Final',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

function TeamSelect({
  value,
  onChange,
  slot,
  teams,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  slot: string | null;
  teams: TeamOption[];
  disabled: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={`Time do slot ${slot ?? '?'}`}
      className="min-w-0 flex-1 rounded-lg border-2 border-tinta/25 bg-white px-2 py-2 text-sm text-tinta disabled:bg-tinta/5"
    >
      <option value="">{slot ?? '—'} (a definir)</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.flag} {t.name} ({t.groupLetter})
        </option>
      ))}
    </select>
  );
}

export function ConfrontoCard({ match, teams }: { match: ConfrontoView; teams: TeamOption[] }) {
  const [home, setHome] = useState(match.homeTeamId?.toString() ?? '');
  const [away, setAway] = useState(match.awayTeamId?.toString() ?? '');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await definirConfronto({
        matchId: match.id,
        homeTeamId: home ? Number(home) : null,
        awayTeamId: away ? Number(away) : null,
      });
      if (result.ok) {
        setDirty(false);
        setMessage({ kind: 'ok', text: 'Confronto salvo!' });
      } else {
        setMessage({ kind: 'error', text: result.error });
      }
    });
  }

  return (
    <div className="sticker p-3">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-tinta/55">
        <span>
          #{match.id} · {STAGE_LABELS[match.stage] ?? match.stage}
          {match.finished && ' · encerrado'}
        </span>
        <span>{dateFormatter.format(new Date(match.kickoffIso))}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <TeamSelect value={home} onChange={(v) => { setHome(v); setDirty(true); }} slot={match.homeSlot} teams={teams} disabled={match.finished || pending} />
        <span className="shrink-0 text-tinta/40">×</span>
        <TeamSelect value={away} onChange={(v) => { setAway(v); setDirty(true); }} slot={match.awaySlot} teams={teams} disabled={match.finished || pending} />
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty || match.finished}
          className="shrink-0 rounded-lg border-2 border-verde-escuro bg-verde px-3 py-2 font-display text-sm uppercase leading-none text-branco disabled:opacity-40"
        >
          {pending ? '…' : 'OK'}
        </button>
      </div>
      {message && (
        <p
          className={`mt-2 rounded-lg px-3 py-1.5 text-xs font-bold ${
            message.kind === 'ok' ? 'bg-verde text-branco' : 'bg-danger text-branco'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
