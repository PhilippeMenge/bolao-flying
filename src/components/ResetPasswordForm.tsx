'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { redefinirSenha } from '@/actions/reset-password';

const inputClass =
  'w-full rounded-lg border-2 border-tinta/25 bg-white px-3 py-2.5 text-[15px] text-tinta placeholder:text-tinta/35 focus:border-verde focus:outline-none';

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    startTransition(async () => {
      const result = await redefinirSenha({ token, newPassword: password });
      if (result.ok) setDone(true);
      else setError(result.error);
    });
  }

  if (done) {
    return (
      <div className="sticker mt-5 p-4 text-center">
        <p className="font-display text-xl uppercase">Senha trocada! 🎉</p>
        <Link
          href="/entrar"
          className="mt-3 block rounded-lg border-2 border-verde-escuro bg-verde py-3 font-display text-lg uppercase leading-none text-branco shadow-[3px_3px_0_var(--azul)]"
        >
          Entrar com a nova senha
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="sticker mt-5 space-y-3 p-4">
      <div>
        <label htmlFor="new-password" className="mb-1 block text-xs font-bold uppercase tracking-wide text-tinta/60">
          Nova senha
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-xs font-bold uppercase tracking-wide text-tinta/60">
          Repita a senha
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </div>
      {error && (
        <p className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-branco">{error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg border-2 border-verde-escuro bg-verde py-3 font-display text-xl uppercase leading-none text-branco shadow-[3px_3px_0_var(--azul)] disabled:opacity-50"
      >
        {pending ? 'Salvando…' : 'Salvar nova senha'}
      </button>
    </form>
  );
}
