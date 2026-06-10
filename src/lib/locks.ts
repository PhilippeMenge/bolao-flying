// Lógica pura de prazos — `now` sempre injetado para ser testável.
export function isLocked(deadline: Date, now: Date): boolean {
  return now.getTime() >= deadline.getTime();
}
