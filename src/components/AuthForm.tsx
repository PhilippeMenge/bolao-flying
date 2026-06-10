'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

type Mode = 'signin' | 'signup';

const ERROR_MESSAGES: Record<string, string> = {
  USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER: 'Esse username já está em uso. Escolhe outro!',
  USERNAME_IS_ALREADY_TAKEN: 'Esse username já está em uso. Escolhe outro!',
  USER_ALREADY_EXISTS: 'Esse username já está em uso. Escolhe outro!',
  INVALID_USERNAME_OR_PASSWORD: 'Username ou senha incorretos.',
  INVALID_USERNAME: 'Username inválido — use só letras, números, "_" e ".".',
  USERNAME_TOO_SHORT: 'O username precisa ter pelo menos 3 caracteres.',
  USERNAME_TOO_LONG: 'Username longo demais (máx. 30).',
  PASSWORD_TOO_SHORT: 'A senha precisa ter pelo menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'Senha longa demais.',
};

const inputClass =
  'w-full rounded-lg border-2 border-tinta/25 bg-white px-3 py-2.5 text-[15px] text-tinta placeholder:text-tinta/35 focus:border-verde focus:outline-none';

const labelClass = 'mb-1 block text-xs font-bold uppercase tracking-wide text-tinta/60';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [usernameValue, setUsernameValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const usernameClean = usernameValue.trim().toLowerCase();
    const result =
      mode === 'signup'
        ? await authClient.signUp.email({
            name: name.trim(),
            username: usernameClean,
            // O app não usa email; o Better Auth exige um, então sintetizamos
            email: `${usernameClean}@bolao.local`,
            password,
          })
        : await authClient.signIn.username({ username: usernameClean, password });
    setPending(false);
    if (result.error) {
      setError(
        (result.error.code && ERROR_MESSAGES[result.error.code]) ??
          'Algo deu errado. Confere os dados e tenta de novo.',
      );
      return;
    }
    router.push('/');
    router.refresh();
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="sticker mt-5 p-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-tinta/10 p-1">
        {(
          [
            ['signin', 'Entrar'],
            ['signup', 'Criar conta'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={`rounded-md py-2 font-display text-lg uppercase leading-none transition-colors ${
              mode === value ? 'bg-azul text-amarelo' : 'text-tinta/55'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        {mode === 'signup' && (
          <div>
            <label htmlFor="name" className={labelClass}>
              Seu nome no bolão
            </label>
            <input
              id="name"
              type="text"
              required
              minLength={2}
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como vai aparecer no ranking"
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label htmlFor="username" className={labelClass}>
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            minLength={3}
            maxLength={30}
            autoCapitalize="none"
            autoComplete="username"
            value={usernameValue}
            onChange={(e) => setUsernameValue(e.target.value)}
            placeholder={mode === 'signup' ? 'ex: craque10' : 'Seu username'}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : 'Sua senha'}
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-branco">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg border-2 border-verde-escuro bg-verde py-3 font-display text-xl uppercase leading-none text-branco shadow-[3px_3px_0_var(--azul)] disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--azul)]"
        >
          {pending ? 'Aguenta aí…' : mode === 'signup' ? 'Criar conta e entrar' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
