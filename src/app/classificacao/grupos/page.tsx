import { redirect } from 'next/navigation';

// As tabelinhas moraram aqui até 12/06/2026 — agora vivem em /grupos (junto de Jogos)
export default function GruposAntigoPage() {
  redirect('/grupos');
}
