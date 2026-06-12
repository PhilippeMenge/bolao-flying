'use client';

import { memo, useCallback, useMemo, useState, useTransition } from 'react';
import { salvarPalpitesGrupos } from '@/actions/group-predictions';
import { Countdown } from '@/components/Countdown';

type TeamLite = { id: number; name: string; flag: string };
type Group = { letter: string; teams: TeamLite[] };

const THIRDS_TARGET = 8;

const POSITION_STYLES = [
  'bg-verde text-branco', // 1º
  'bg-verde text-branco', // 2º
  'bg-amarelo-vivo text-tinta', // 3º
  'bg-tinta/10 text-tinta/50', // 4º
];

// Memoizado: um toque em ▲▼ re-renderiza só o grupo afetado, não os 12
const GroupSection = memo(function GroupSection({
  letter,
  teams,
  locked,
  animationDelayMs,
  onMove,
}: {
  letter: string;
  teams: TeamLite[];
  locked: boolean;
  animationDelayMs: number;
  onMove: (letter: string, index: number, delta: -1 | 1) => void;
}) {
  return (
    <section
      className="sticker overflow-hidden rise"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <h2 className="flex items-baseline justify-between bg-verde px-4 py-1.5">
        <span className="font-display text-xl uppercase leading-none text-branco">
          Grupo <span className="text-amarelo">{letter}</span>
        </span>
      </h2>
      <ul>
        {teams.map((team, i) => (
          <li
            key={team.id}
            className={`flex items-center gap-3 px-3 py-2 ${i < 3 ? 'border-b border-tinta/10' : ''}`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${POSITION_STYLES[i]}`}
            >
              {i + 1}º
            </span>
            <span className="text-lg leading-none">{team.flag}</span>
            <span className="flex-1 truncate text-[15px] font-semibold">{team.name}</span>
            {!locked && (
              <span className="flex gap-1.5">
                <button
                  type="button"
                  aria-label={`Subir ${team.name}`}
                  onClick={() => onMove(letter, i, -1)}
                  disabled={i === 0}
                  className="h-9 w-9 rounded-md border-2 border-tinta/25 bg-white font-semibold text-tinta active:border-verde active:bg-verde active:text-branco disabled:opacity-25"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Descer ${team.name}`}
                  onClick={() => onMove(letter, i, 1)}
                  disabled={i === 3}
                  className="h-9 w-9 rounded-md border-2 border-tinta/25 bg-white font-semibold text-tinta active:border-verde active:bg-verde active:text-branco disabled:opacity-25"
                >
                  ▼
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
});

export function GroupBettingEditor({
  groups,
  initialThirds,
  hasSaved,
  locked,
  deadlineIso,
}: {
  groups: Group[];
  initialThirds: string[];
  hasSaved: boolean;
  locked: boolean;
  deadlineIso: string;
}) {
  const [order, setOrder] = useState<Record<string, TeamLite[]>>(() =>
    Object.fromEntries(groups.map((g) => [g.letter, g.teams])),
  );
  const [thirds, setThirds] = useState<Set<string>>(() => new Set(initialThirds));
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const thirdTeams = useMemo(
    () => groups.map((g) => ({ letter: g.letter, team: order[g.letter]![2] })),
    [groups, order],
  );

  // useCallback + setState funcional: referência estável pro memo do GroupSection
  const move = useCallback(
    (letter: string, index: number, delta: -1 | 1) => {
      if (locked) return;
      setOrder((prev) => {
        const current = prev[letter]!;
        const target = index + delta;
        if (target < 0 || target >= current.length) return prev;
        const next = [...current];
        [next[index], next[target]] = [next[target], next[index]];
        return { ...prev, [letter]: next };
      });
      setDirty(true);
      setMessage(null);
    },
    [locked],
  );

  function toggleThird(letter: string) {
    if (locked) return;
    const next = new Set(thirds);
    if (next.has(letter)) {
      next.delete(letter);
    } else {
      if (next.size >= THIRDS_TARGET) return;
      next.add(letter);
    }
    setThirds(next);
    setDirty(true);
    setMessage(null);
  }

  function save() {
    startTransition(async () => {
      const result = await salvarPalpitesGrupos({
        groups: Object.fromEntries(
          groups.map((g) => [g.letter, order[g.letter]!.map((t) => t.id)]),
        ),
        thirdGroups: [...thirds],
      });
      if (result.ok) {
        setDirty(false);
        setMessage({ kind: 'ok', text: 'Palpites salvos! 🎉' });
      } else {
        setMessage({ kind: 'error', text: result.error });
      }
    });
  }

  return (
    <>
    <div className="rise">
      <h1 className="font-display text-4xl uppercase leading-none text-tinta">Fase de grupos</h1>
      <p className="mt-2 text-sm text-tinta/70">
        Ordene cada grupo do 1º ao 4º e marque os 8 terceiros que avançam.
      </p>

      <div
        className={`card-azul mt-4 flex items-center justify-between px-4 py-3 text-sm ${
          locked ? 'border-danger' : ''
        }`}
      >
        {locked ? (
          <span className="font-bold text-amarelo">🔒 Palpites travados</span>
        ) : (
          <>
            <span className="text-branco/80">Prazo</span>
            <span className="text-amarelo">
              <Countdown deadlineIso={deadlineIso} />
            </span>
          </>
        )}
      </div>

      {!hasSaved && !locked && (
        <div className="sticker mt-4 border-amarelo-vivo bg-amarelo-vivo px-4 py-3 text-sm font-bold text-tinta">
          Você ainda não salvou nenhum palpite — não esquece de salvar lá embaixo! 👇
        </div>
      )}

      <div className="mt-5 space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        {groups.map((g, gi) => (
          <GroupSection
            key={g.letter}
            letter={g.letter}
            teams={order[g.letter]!}
            locked={locked}
            animationDelayMs={Math.min(gi * 40, 300)}
            onMove={move}
          />
        ))}
      </div>

      <section className="card-azul mt-6 p-4">
        <h2 className="font-display text-2xl uppercase leading-none">
          Melhores terceiros{' '}
          <span className={`font-mono text-base ${thirds.size === THIRDS_TARGET ? 'text-verde' : 'text-amarelo'}`}>
            {thirds.size}/{THIRDS_TARGET}
          </span>
        </h2>
        <p className="mt-1.5 text-xs text-branco/70">
          Destes 12 terceiros colocados (segundo o seu palpite), marque os 8 que avançam.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {thirdTeams.map(({ letter, team }) => {
            const selected = thirds.has(letter);
            return (
              <button
                key={letter}
                type="button"
                onClick={() => toggleThird(letter)}
                disabled={locked}
                className={`flex items-center gap-2 rounded-lg border-2 px-2.5 py-2 text-left text-[13px] font-semibold transition-colors ${
                  selected
                    ? 'border-amarelo-vivo bg-amarelo-vivo text-tinta'
                    : 'border-branco/25 bg-azul-escuro text-branco/75'
                }`}
              >
                <span className="text-base leading-none">{team.flag}</span>
                <span className="flex-1 truncate">{team.name}</span>
                <span className="font-mono text-[10px] opacity-70">{letter}</span>
              </button>
            );
          })}
        </div>
      </section>

    </div>

      {/* Sticky no fim do conteúdo: flutua no rodapé do scroll enquanto rola
          e assenta no lugar natural quando chega ao fim da página */}
      {!locked && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-4">
          <div className="mx-auto max-w-lg px-4 pb-2 lg:max-w-5xl">
            {message && (
              <div
                className={`mb-2 rounded-lg border-2 px-4 py-2.5 text-sm font-bold ${
                  message.kind === 'ok'
                    ? 'border-verde-escuro bg-verde text-branco'
                    : 'border-danger bg-danger text-branco'
                }`}
              >
                {message.text}
              </div>
            )}
            <button
              type="button"
              onClick={save}
              disabled={isPending || (!dirty && hasSaved)}
              className="w-full rounded-lg border-2 border-verde-escuro bg-verde py-3 font-display text-xl uppercase leading-none text-branco shadow-[4px_4px_0_var(--azul)] disabled:opacity-60 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--azul)]"
            >
              {isPending ? 'Salvando…' : dirty || !hasSaved ? 'Salvar palpites' : 'Palpites salvos ✓'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
