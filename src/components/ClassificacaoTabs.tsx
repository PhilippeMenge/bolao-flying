'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/classificacao', label: 'Ranking' },
  { href: '/classificacao/grupos', label: 'Grupos' },
  { href: '/classificacao/estatisticas', label: 'Stats' },
] as const;

export function ClassificacaoTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-azul p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-md py-2 text-center font-display text-lg uppercase leading-none ${
            pathname === tab.href ? 'bg-amarelo text-tinta' : 'text-branco/70'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
