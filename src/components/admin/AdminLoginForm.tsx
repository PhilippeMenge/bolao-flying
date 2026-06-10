'use client';

import { useState, useTransition } from 'react';
import { loginAdmin } from '@/actions/admin';

export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await loginAdmin(formData);
      // Em caso de sucesso a action redireciona; só chega aqui com erro
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <form action={submit} className="sticker mt-5 space-y-3 p-4">
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-xs font-bold uppercase tracking-wide text-tinta/60"
        >
          Senha do admin
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          className="w-full rounded-lg border-2 border-tinta/25 bg-white px-3 py-2.5 text-[15px] text-tinta focus:border-verde focus:outline-none"
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
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
