'use client';

import { useEffect, useState } from 'react';

function format(ms: number): string {
  if (ms <= 0) return 'encerrado';
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const min = totalMin % 60;
  const sec = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h ${min}min`;
  if (hours > 0) return `${hours}h ${min}min ${sec}s`;
  return `${min}min ${sec}s`;
}

export function Countdown({ deadlineIso }: { deadlineIso: string }) {
  const deadline = new Date(deadlineIso).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Evita mismatch de hidratação: só renderiza no cliente
  if (now === null) return <span className="font-mono">…</span>;
  return <span className="font-mono font-semibold">{format(deadline - now)}</span>;
}
