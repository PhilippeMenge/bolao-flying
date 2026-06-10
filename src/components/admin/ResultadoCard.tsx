'use client';

import { useState, useTransition } from 'react';
import { limparResultado, salvarResultado } from '@/actions/admin';

export type MatchForAdmin = {
  id: number;
  stage: 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD' | 'FINAL';
  groupLetter: string | null;
  kickoffAt: string;
  status: 'SCHEDULED' | 'FINISHED';
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinnerTeamId: number | null;
  resultLockedByAdmin: boolean;
  home: { id: number; name: string; flag: string } | null;
  away: { id: number; name: string; flag: string } | null;
  homeSlot: string | null;
  awaySlot: string | null;
};

const STAGE_LABELS: Record<MatchForAdmin['stage'], string> = {
  GROUP: 'Grupo',
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

export function ResultadoCard({
  match,
  startOpen = false,
}: {
  match: MatchForAdmin;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [homeScore, setHomeScore] = useState(match.homeScore?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(match.awayScore?.toString() ?? '');
  const [penaltyWinner, setPenaltyWinner] = useState(match.penaltyWinnerTeamId?.toString() ?? '');
  const [locked, setLocked] = useState(match.resultLockedByAdmin);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isKnockout = match.stage !== 'GROUP';
  const isDraw = homeScore !== '' && homeScore === awayScore;
  const tbd = !match.home || !match.away;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await salvarResultado({
        matchId: match.id,
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        penaltyWinnerTeamId: penaltyWinner ? Number(penaltyWinner) : null,
        resultLockedByAdmin: locked,
      });
      if (!result.ok) setError(result.error);
      else setOpen(false);
    });
  }

  function clear() {
    if (!confirm('Limpar o resultado deste jogo?')) return;
    startTransition(async () => {
      const result = await limparResultado(match.id);
      if (!result.ok) setError(result.error);
      setHomeScore('');
      setAwayScore('');
      setPenaltyWinner('');
      setLocked(false);
    });
  }

  const homeLabel = match.home ? `${match.home.flag} ${match.home.name}` : match.homeSlot ?? '?';
  const awayLabel = match.away ? `${match.away.name} ${match.away.flag}` : match.awaySlot ?? '?';

  return (
    <div className="sticker overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-tinta/55">
            #{match.id} ·{' '}
            {match.stage === 'GROUP' ? `Grupo ${match.groupLetter}` : STAGE_LABELS[match.stage]} ·{' '}
            {dateFormatter.format(new Date(match.kickoffAt))}
          </p>
          <p className="mt-0.5 truncate text-[14px] font-semibold">
            {homeLabel} <span className="text-tinta/40">×</span> {awayLabel}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-azul px-2 py-0.5 font-mono text-sm font-semibold text-amarelo">
          {match.status === 'FINISHED' ? `${match.homeScore} × ${match.awayScore}` : '—'}
        </span>
      </button>

      {open && (
        <div className="border-t border-tinta/10 px-3 py-3">
          {tbd ? (
            <p className="text-sm text-tinta/60">
              Confronto ainda sem times definidos ({match.homeSlot} × {match.awaySlot}).
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <span className="flex-1 text-right text-sm font-semibold">{homeLabel}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="h-11 w-14 rounded-lg border-2 border-tinta/25 bg-white text-center font-mono text-lg font-semibold text-tinta focus:border-verde focus:outline-none"
                />
                <span className="text-tinta/40">×</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="h-11 w-14 rounded-lg border-2 border-tinta/25 bg-white text-center font-mono text-lg font-semibold text-tinta focus:border-verde focus:outline-none"
                />
                <span className="flex-1 text-sm font-semibold">{awayLabel}</span>
              </div>

              {isKnockout && isDraw && (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-tinta/60">
                    Quem passou nos pênaltis?
                  </label>
                  <select
                    value={penaltyWinner}
                    onChange={(e) => setPenaltyWinner(e.target.value)}
                    className="w-full rounded-lg border-2 border-tinta/25 bg-white px-3 py-2 text-sm text-tinta"
                  >
                    <option value="">Selecione…</option>
                    <option value={match.home!.id}>{match.home!.name}</option>
                    <option value={match.away!.id}>{match.away!.name}</option>
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs font-semibold text-tinta/70">
                <input
                  type="checkbox"
                  checked={locked}
                  onChange={(e) => setLocked(e.target.checked)}
                  className="h-4 w-4"
                />
                Travar contra o sync automático (correção manual)
              </label>

              {error && (
                <p className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-branco">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={pending || homeScore === '' || awayScore === ''}
                  className="flex-1 rounded-lg border-2 border-verde-escuro bg-verde py-2 font-display text-base uppercase leading-none text-branco disabled:opacity-50"
                >
                  {pending ? 'Salvando…' : 'Salvar resultado'}
                </button>
                {match.status === 'FINISHED' && (
                  <button
                    type="button"
                    onClick={clear}
                    disabled={pending}
                    className="rounded-lg border-2 border-danger px-3 py-2 text-sm font-bold text-danger disabled:opacity-50"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
