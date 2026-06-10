'use client';

import { useState, useTransition } from 'react';
import { salvarPalpiteMataMata } from '@/actions/knockout-predictions';

export type KnockoutMatchView = {
  id: number;
  stage: 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD' | 'FINAL';
  kickoffIso: string;
  locked: boolean;
  home: { id: number; name: string; flag: string } | null;
  away: { id: number; name: string; flag: string } | null;
  homeSlot: string | null;
  awaySlot: string | null;
  prediction: { homeScore: number; awayScore: number; penaltyWinnerTeamId: number | null } | null;
};

const STAGE_ORDER: KnockoutMatchView['stage'][] = ['R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL'];
const STAGE_LABELS: Record<KnockoutMatchView['stage'], string> = {
  R32: 'Fase de 32',
  R16: 'Oitavas de final',
  QF: 'Quartas de final',
  SF: 'Semifinais',
  THIRD: 'Disputa de 3º lugar',
  FINAL: 'A grande final',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

function MatchCard({ match }: { match: KnockoutMatchView }) {
  const [homeScore, setHomeScore] = useState(match.prediction?.homeScore?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(match.prediction?.awayScore?.toString() ?? '');
  const [penaltyWinner, setPenaltyWinner] = useState(
    match.prediction?.penaltyWinnerTeamId?.toString() ?? '',
  );
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  const tbd = !match.home || !match.away;
  const isDraw = homeScore !== '' && homeScore === awayScore;

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await salvarPalpiteMataMata({
        matchId: match.id,
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        penaltyWinnerTeamId: penaltyWinner ? Number(penaltyWinner) : null,
      });
      if (result.ok) {
        setDirty(false);
        setMessage({ kind: 'ok', text: 'Palpite salvo! ⚽' });
      } else {
        setMessage({ kind: 'error', text: result.error });
      }
    });
  }

  if (tbd) {
    return (
      <div className="sticker p-3 opacity-70">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-tinta/55">
          <span>#{match.id}</span>
          <span>{dateFormatter.format(new Date(match.kickoffIso))}</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold text-tinta/60">
          {match.homeSlot ?? '?'} <span className="text-tinta/35">×</span> {match.awaySlot ?? '?'}
        </p>
        <p className="mt-1 text-xs text-tinta/50">Aguardando definição do confronto 🔭</p>
      </div>
    );
  }

  const inputClass =
    'h-11 w-14 rounded-lg border-2 border-tinta/25 bg-white text-center font-mono text-lg font-semibold text-tinta focus:border-verde focus:outline-none disabled:bg-tinta/5';

  return (
    <div className="sticker p-3">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-tinta/55">
        <span>#{match.id}</span>
        <span>
          {match.locked ? '🔒 travado' : dateFormatter.format(new Date(match.kickoffIso))}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2.5">
        <span className="flex-1 truncate text-right text-sm font-semibold">
          {match.home!.flag} {match.home!.name}
        </span>
        {match.locked ? (
          <span className="shrink-0 rounded-md bg-azul px-2.5 py-1 font-mono text-base font-semibold text-amarelo">
            {match.prediction ? `${match.prediction.homeScore} × ${match.prediction.awayScore}` : '— × —'}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={homeScore}
              onChange={(e) => { setHomeScore(e.target.value); setDirty(true); setMessage(null); }}
              aria-label={`Gols ${match.home!.name}`}
              className={inputClass}
            />
            <span className="text-tinta/40">×</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={awayScore}
              onChange={(e) => { setAwayScore(e.target.value); setDirty(true); setMessage(null); }}
              aria-label={`Gols ${match.away!.name}`}
              className={inputClass}
            />
          </span>
        )}
        <span className="flex-1 truncate text-sm font-semibold">
          {match.away!.name} {match.away!.flag}
        </span>
      </div>

      {match.locked && match.prediction?.penaltyWinnerTeamId && (
        <p className="mt-1.5 text-center text-xs text-tinta/60">
          Pênaltis:{' '}
          {match.prediction.penaltyWinnerTeamId === match.home!.id
            ? match.home!.name
            : match.away!.name}{' '}
          passa
        </p>
      )}

      {!match.locked && isDraw && (
        <div className="mt-2.5">
          <p className="mb-1 text-center text-xs font-bold uppercase tracking-wide text-tinta/60">
            Quem passa nos pênaltis?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[match.home!, match.away!].map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => { setPenaltyWinner(team.id.toString()); setDirty(true); setMessage(null); }}
                className={`rounded-lg border-2 px-2 py-1.5 text-[13px] font-semibold ${
                  penaltyWinner === team.id.toString()
                    ? 'border-verde bg-verde text-branco'
                    : 'border-tinta/25 bg-white text-tinta/70'
                }`}
              >
                {team.flag} {team.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {message && (
        <p
          className={`mt-2 rounded-lg px-3 py-1.5 text-center text-xs font-bold ${
            message.kind === 'ok' ? 'bg-verde text-branco' : 'bg-danger text-branco'
          }`}
        >
          {message.text}
        </p>
      )}

      {!match.locked && (
        <button
          type="button"
          onClick={save}
          disabled={pending || homeScore === '' || awayScore === '' || (isDraw && !penaltyWinner) || (!dirty && !!match.prediction)}
          className="mt-2.5 w-full rounded-lg border-2 border-verde-escuro bg-verde py-2 font-display text-base uppercase leading-none text-branco disabled:opacity-50"
        >
          {pending
            ? 'Salvando…'
            : match.prediction && !dirty
              ? 'Palpite salvo ✓'
              : 'Salvar palpite'}
        </button>
      )}
    </div>
  );
}

export function KnockoutBetting({ matches }: { matches: KnockoutMatchView[] }) {
  return (
    <div className="mt-5 space-y-6">
      {STAGE_ORDER.map((stage) => {
        const stageMatches = matches.filter((m) => m.stage === stage);
        if (stageMatches.length === 0) return null;
        return (
          <section key={stage}>
            <h2 className="font-display text-xl uppercase leading-none text-tinta">
              {STAGE_LABELS[stage]}
            </h2>
            <div className="mt-2 space-y-2.5">
              {stageMatches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
