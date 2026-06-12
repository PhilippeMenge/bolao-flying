'use client';

import { useEffect, useRef, useState } from 'react';

// Compartilha o PDF via Web Share API (entra direto no WhatsApp como documento).
// O blob é pré-buscado no mount: navigator.share exige user-activation transitória
// (~5s) e a geração do PDF no servidor poderia estourar essa janela.
export function SharePdfButton({ doc, label }: { doc: 'resumo' | 'completo'; label: string }) {
  const url = `/api/pdf/${doc}`;
  const blobRef = useRef<Promise<Blob> | null>(null);
  const [busy, setBusy] = useState(false);

  const warm = () =>
    (blobRef.current ??= fetch(url).then((r) => {
      if (!r.ok) throw new Error(`PDF respondeu ${r.status}`);
      return r.blob();
    }).catch((e) => {
      blobRef.current = null; // permite tentar de novo no clique
      throw e;
    }));

  useEffect(() => {
    warm().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onClick() {
    setBusy(true);
    // não travar a UI esperando navigator.share resolver (quirk do iOS)
    const reset = setTimeout(() => setBusy(false), 4000);
    try {
      const blob = await warm();
      const file = new File([blob], `bolao-do-flying-${doc}.pdf`, { type: 'application/pdf' });
      // sem text/url junto: o WhatsApp no iOS descarta o arquivo se tiver os dois
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Bolão do Flying' });
          return;
        } catch (e) {
          if ((e as DOMException).name === 'AbortError') return; // usuário cancelou
        }
      }
      window.open(url, '_blank'); // fallback: abre/baixa o PDF
    } catch {
      window.open(url, '_blank');
    } finally {
      clearTimeout(reset);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="sticker flex items-center justify-center gap-1.5 px-3 py-2.5 font-display text-base uppercase leading-none text-tinta active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--azul)] disabled:opacity-60"
    >
      {busy ? '⏳' : '📤'} {label}
    </button>
  );
}
