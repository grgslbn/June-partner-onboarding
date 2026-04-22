import { describe, expect, test } from 'vitest';
import { contrastForeground } from '../color';

describe('contrastForeground', () => {
  test('returns white on dark backgrounds', () => {
    expect(contrastForeground('#E53935')).toBe('#FFFFFF'); // IHPO red
    expect(contrastForeground('#000000')).toBe('#FFFFFF');
    expect(contrastForeground('#0055AA')).toBe('#FFFFFF'); // deep blue
  });

  test('returns black on light backgrounds', () => {
    expect(contrastForeground('#FFFFFF')).toBe('#000000');
    expect(contrastForeground('#F5F5F5')).toBe('#000000');
    expect(contrastForeground('#FFD700')).toBe('#000000'); // gold
  });

  test('accepts hex with or without leading #', () => {
    expect(contrastForeground('E53935')).toBe('#FFFFFF');
  });

  test('falls back to white on malformed input', () => {
    expect(contrastForeground('not-a-color')).toBe('#FFFFFF');
    expect(contrastForeground('#xyz')).toBe('#FFFFFF');
  });
});
