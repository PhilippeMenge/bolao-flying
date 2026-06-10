'use client';

import { useState, useTransition } from 'react';
import { salvarPrazoGrupos } from '@/actions/admin';

// Brasília é UTC-3 fixo (sem horário de verão desde 2019)
const BRT_OFFSET = '-03:00';

function isoToBrtInputValue(iso: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function DeadlineForm({ deadlineIso }: { deadlineIso: string }) {
  const [value, setValue] = useState(() => isoToBrtInputValue(deadlineIso));
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await salvarPrazoGrupos(`${value}:00${BRT_OFFSET}`);
      setMessage(
        result.ok
          ? { kind: 'ok', text: 'Prazo atualizado!' }
          : { kind: 'error', text: result.error },
      );
    });
  }

  return (
    <section className="sticker p-4">
      <h2 className="font-display text-xl uppercase leading-none">Prazo da fase de grupos</h2>
      <p className="mt-1.5 text-sm text-tinta/70">
        Até quando os participantes podem editar a ordem dos grupos e os terceiros (horário de
        Brasília).
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border-2 border-tinta/25 bg-white px-3 py-2 text-sm text-tinta focus:border-verde focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || !value}
          className="shrink-0 rounded-lg border-2 border-verde-escuro bg-verde px-4 py-2 font-display text-base uppercase leading-none text-branco disabled:opacity-50"
        >
          {pending ? '…' : 'Salvar'}
        </button>
      </div>
      {message && (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-sm font-semibold ${
            message.kind === 'ok' ? 'bg-verde text-branco' : 'bg-danger text-branco'
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
