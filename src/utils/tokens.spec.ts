import { describe, expect, it } from 'vitest';
import { estimateTokens } from './tokens';

describe('estimateTokens', () => {
  it('uses a conservative estimate for Thai text', () => {
    expect(estimateTokens('สวัสดีครับ')).toBeGreaterThanOrEqual(4);
  });

  it('returns at least one token for non-empty text', () => {
    expect(estimateTokens('a')).toBe(1);
    expect(estimateTokens('')).toBe(0);
  });
});
