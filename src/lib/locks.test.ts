import { describe, expect, it } from 'vitest';
import { isLocked } from './locks';

describe('isLocked', () => {
  const deadline = new Date('2026-06-11T19:00:00Z');

  it('antes do prazo: aberto', () => {
    expect(isLocked(deadline, new Date('2026-06-11T18:59:00Z'))).toBe(false);
  });

  it('exatamente no prazo: travado', () => {
    expect(isLocked(deadline, new Date('2026-06-11T19:00:00Z'))).toBe(true);
  });

  it('depois do prazo: travado', () => {
    expect(isLocked(deadline, new Date('2026-06-11T19:01:00Z'))).toBe(true);
  });
});
