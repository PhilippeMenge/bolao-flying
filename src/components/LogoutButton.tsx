'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push('/entrar');
        router.refresh();
      }}
      className="text-xs text-tinta/60 underline underline-offset-4"
    >
      Sair da conta
    </button>
  );
}
