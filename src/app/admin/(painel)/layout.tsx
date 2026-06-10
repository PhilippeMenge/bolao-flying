import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import { logoutAdmin } from '@/actions/admin';

const TABS = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/resultados', label: 'Resultados' },
  { href: '/admin/confrontos', label: 'Confrontos' },
  { href: '/admin/participantes', label: 'Participantes' },
  { href: '/admin/config', label: 'Config' },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect('/admin/login');

  return (
    <div>
      <div className="-mx-4 mb-4 border-b-2 border-azul-escuro bg-azul px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-2 text-sm">
          <span className="mr-1 shrink-0 font-display text-base uppercase leading-none text-amarelo">
            Admin
          </span>
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="shrink-0 rounded-full px-3 py-1 font-semibold text-branco/80 hover:bg-azul-escuro"
            >
              {tab.label}
            </Link>
          ))}
          <form action={logoutAdmin} className="ml-auto shrink-0">
            <button type="submit" className="px-2 py-1 text-xs text-branco/60 underline">
              Sair
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
