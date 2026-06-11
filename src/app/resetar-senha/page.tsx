import { ResetPasswordForm } from '@/components/ResetPasswordForm';

export const dynamic = 'force-dynamic';

export default async function ResetarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="rise">
      <h1 className="font-display text-4xl uppercase leading-none text-tinta">Nova senha 🔑</h1>
      {!token ? (
        <div className="card-azul mt-4 p-4 text-sm text-branco/80">
          Link inválido — peça um link de redefinição pro admin do bolão.
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-tinta/70">Escolha sua nova senha pra voltar ao jogo.</p>
          <ResetPasswordForm token={token} />
        </>
      )}
    </div>
  );
}
