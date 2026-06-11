import { describe, expect, it } from 'vitest';
import { createResetToken, verifyResetToken } from './reset-token';

const SECRET = 'segredo-de-teste';
const NOW = 1_750_000_000_000;

describe('reset token', () => {
  it('token válido devolve o userId', () => {
    const token = createResetToken('user-abc123', SECRET, NOW);
    expect(verifyResetToken(token, SECRET, NOW + 1000)).toBe('user-abc123');
  });

  it('token expirado é rejeitado', () => {
    const token = createResetToken('user-abc123', SECRET, NOW, 60_000);
    expect(verifyResetToken(token, SECRET, NOW + 60_001)).toBeNull();
  });

  it('assinatura adulterada é rejeitada', () => {
    const token = createResetToken('user-abc123', SECRET, NOW);
    expect(verifyResetToken(token.slice(0, -2) + 'ff', SECRET, NOW)).toBeNull();
    // trocar o userId invalida a assinatura
    expect(verifyResetToken(token.replace('user-abc123', 'user-xyz999'), SECRET, NOW)).toBeNull();
  });

  it('segredo diferente é rejeitado', () => {
    const token = createResetToken('user-abc123', SECRET, NOW);
    expect(verifyResetToken(token, 'outro-segredo', NOW)).toBeNull();
  });

  it('lixo não explode', () => {
    expect(verifyResetToken('', SECRET, NOW)).toBeNull();
    expect(verifyResetToken('a.b', SECRET, NOW)).toBeNull();
  });
});
