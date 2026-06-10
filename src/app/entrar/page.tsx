import Image from 'next/image';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { AuthForm } from '@/components/AuthForm';

export const dynamic = 'force-dynamic';

export default async function EntrarPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect('/');

  return (
    <div className="rise">
      {/* Foto do grupo: estilo foto colada no álbum */}
      <div className="mx-auto mb-5 max-w-sm -rotate-1 rounded-md border-2 border-verde bg-branco p-2 pb-3 shadow-[5px_5px_0_var(--azul)]">
        <Image
          src="/foto-flying.JPG"
          alt="O grupo Flying reunido"
          width={1536}
          height={1024}
          priority
          className="rounded-sm"
        />
        <p className="mt-2 text-center font-display text-lg uppercase leading-none text-tinta">
          Essa é a nossa seleção 🎠
        </p>
      </div>

      <h1 className="font-display text-4xl uppercase leading-none text-tinta">
        Bem-vindo ao bolão!
      </h1>
      <p className="mt-2 text-sm text-tinta/70">
        Entre com seu username ou crie sua conta pra apostar.
      </p>
      <AuthForm />
    </div>
  );
}
