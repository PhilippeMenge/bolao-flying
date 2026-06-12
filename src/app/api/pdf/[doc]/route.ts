// Gera os PDFs compartilháveis (resumo de 1 página / relatório completo).
// Mesmo gate de privacidade da aba Stats: nada antes do prazo travar.
import { createElement } from 'react';
import type { NextRequest } from 'next/server';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { TIMEZONE } from '@/lib/config';
import { loadLeaderboard } from '@/lib/scoring/load-leaderboard';
import { loadBetStats } from '@/lib/stats/load-stats';
import { CompletoPdf, ResumoPdf, registerPdfFonts, type PdfData } from '@/lib/pdf/bolao-pdf';

export const maxDuration = 60;

const DOCS = { resumo: ResumoPdf, completo: CompletoPdf } as const;

const generatedAtFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIMEZONE,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doc: string }> },
) {
  const { doc } = await params;
  const Pdf = DOCS[doc as keyof typeof DOCS];
  if (!Pdf) {
    return Response.json({ error: 'documento desconhecido' }, { status: 404 });
  }

  const [betStats, leaderboard] = await Promise.all([loadBetStats(), loadLeaderboard()]);
  if (!betStats.locked) {
    return Response.json(
      { error: 'estatísticas só ficam disponíveis após o prazo dos palpites' },
      { status: 403 },
    );
  }

  registerPdfFonts(request.nextUrl.origin);

  const data: PdfData = {
    generatedAt: generatedAtFormatter.format(new Date()),
    participantCount: betStats.participantCount,
    rows: leaderboard.rows,
    stats: betStats.stats,
    teams: betStats.allTeams.map((t) => ({ id: t.id, name: t.name, flag: t.flag })),
    liveGroupCount: leaderboard.liveGroupCount,
    finishedGroupCount: leaderboard.finishedGroupCount,
  };

  // o elemento raiz é um <Document>, mas o TS só vê as props do wrapper
  const element = createElement(Pdf, { data }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="bolao-do-flying-${doc}.pdf"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
