'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Início', icon: '🏟️', match: [] },
  { href: '/palpites/grupos', label: 'Palpites', icon: '🎯', match: ['/palpites'] },
  { href: '/grupos', label: 'Grupos', icon: '⚽', match: ['/grupos', '/jogos'] },
  { href: '/classificacao', label: 'Ranking', icon: '🏆', match: ['/classificacao'] },
  { href: '/regras', label: 'Regras', icon: '📜', match: ['/regras'] },
] as const;

// Rodapé do app shell (sem position:fixed): a coluna de 100dvh garante que ele
// fica sempre visível, acima da barra de URL do navegador mobile.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="z-20 shrink-0 border-t-2 border-azul-escuro bg-azul">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : item.match.some((prefix) => pathname.startsWith(prefix));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-[10px] font-bold uppercase tracking-wide ${
                active ? 'text-amarelo' : 'text-branco/60'
              }`}
            >
              {active && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-b bg-amarelo" aria-hidden />
              )}
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
