import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono, Passion_One } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/BottomNav';
import { Bandeirinhas } from '@/components/Bandeirinhas';

const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'] });
const passionOne = Passion_One({
  variable: '--font-passion',
  weight: ['700', '900'],
  subsets: ['latin'],
});
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  weight: ['400', '600'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Bolão do Flying',
  description: 'O bolão da Copa do Mundo 2026 do Flying',
};

export const viewport: Viewport = {
  themeColor: '#009739',
  // Necessário pro env(safe-area-inset-bottom) funcionar no iPhone
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${passionOne.variable} ${plexMono.variable} h-full antialiased`}
    >
      {/* App shell: coluna de 100dvh (acompanha a barra do navegador mobile);
          só o <main> rola, então header e menu nunca ficam atrás do chrome do browser */}
      <body className="flex h-dvh flex-col overflow-hidden">
        <header className="z-20 shrink-0">
          <div className="bg-verde">
            <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2.5">
              <a href="/" className="font-display text-2xl uppercase leading-none text-branco">
                Bolão do <span className="text-amarelo">Flying</span>
                <span className="ml-1.5 align-middle text-lg">🎠</span>
              </a>
              <span className="rounded-full border border-branco/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-branco/90">
                Copa 2026
              </span>
            </div>
          </div>
          <Bandeirinhas />
        </header>
        <main className="app-scroll min-h-0 flex-1">
          <div className="mx-auto w-full max-w-lg px-4 pb-8 pt-5">{children}</div>
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
