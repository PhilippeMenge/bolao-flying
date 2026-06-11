'use client';

import { useState, useTransition } from 'react';
import { excluirConta, gerarLinkResetSenha, renomearParticipante } from '@/actions/admin';

export function ParticipanteRow({
  participant,
  groupsComplete,
  thirdsComplete,
}: {
  participant: { id: string; name: string };
  groupsComplete: boolean;
  thirdsComplete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(participant.name);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function rename() {
    setError(null);
    startTransition(async () => {
      const result = await renomearParticipante({ participantId: participant.id, name });
      if (!result.ok) setError(result.error);
      else setEditing(false);
    });
  }

  function generateResetLink() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await gerarLinkResetSenha(participant.id);
      if (result.ok) setResetLink(result.url);
      else setError(result.error);
    });
  }

  async function copyLink() {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink);
      setCopied(true);
    } catch {
      // clipboard indisponível (http na rede local) — o campo fica selecionável
    }
  }

  function remove() {
    if (
      !confirm(
        `Excluir a conta de ${participant.name}? Apaga o login E os palpites — sem volta.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await excluirConta(participant.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li className="sticker p-3">
      <div className="flex items-center gap-2">
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border-2 border-tinta/25 bg-white px-2 py-1.5 text-sm font-semibold text-tinta focus:border-verde focus:outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
            {participant.name}
          </span>
        )}
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
            groupsComplete && thirdsComplete
              ? 'bg-verde text-branco'
              : 'bg-amarelo-vivo text-tinta'
          }`}
        >
          {groupsComplete && thirdsComplete ? 'completo' : 'incompleto'}
        </span>
        {editing ? (
          <button
            type="button"
            onClick={rename}
            disabled={pending}
            className="shrink-0 rounded-lg bg-verde px-2.5 py-1.5 text-xs font-bold text-branco disabled:opacity-50"
          >
            Salvar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg border-2 border-tinta/25 px-2.5 py-1 text-xs font-bold text-tinta/70"
          >
            Renomear
          </button>
        )}
        <button
          type="button"
          onClick={generateResetLink}
          disabled={pending}
          title="Gerar link de redefinição de senha"
          aria-label={`Gerar link de senha para ${participant.name}`}
          className="shrink-0 rounded-lg border-2 border-tinta/25 px-2 py-1 text-xs disabled:opacity-50"
        >
          🔑
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={`Excluir conta de ${participant.name}`}
          className="shrink-0 rounded-lg border-2 border-danger px-2 py-1 text-xs font-bold text-danger disabled:opacity-50"
        >
          ✕
        </button>
      </div>

      {resetLink && (
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={resetLink}
            onFocus={(e) => e.target.select()}
            aria-label="Link de redefinição de senha"
            className="min-w-0 flex-1 rounded-lg border-2 border-tinta/20 bg-tinta/5 px-2 py-1.5 font-mono text-[11px] text-tinta"
          />
          <button
            type="button"
            onClick={copyLink}
            className="shrink-0 rounded-lg bg-azul px-2.5 py-1.5 text-xs font-bold text-amarelo"
          >
            {copied ? 'Copiado ✓' : 'Copiar'}
          </button>
        </div>
      )}
      {resetLink && (
        <p className="mt-1 text-[11px] text-tinta/55">
          Vale por 24h. Manda pro dono da conta — quem abrir define a nova senha.
        </p>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-branco">
          {error}
        </p>
      )}
    </li>
  );
}
