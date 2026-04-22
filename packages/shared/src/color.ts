// Returns the best foreground color (`#000000` or `#FFFFFF`) for text placed on
// top of the given hex background. Uses the YIQ perceptual-brightness formula.
export function contrastForeground(hex: string): '#000000' | '#FFFFFF' {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) return '#FFFFFF';
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return '#FFFFFF';
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
}
