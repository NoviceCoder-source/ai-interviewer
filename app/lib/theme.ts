// Inline styles bound to the white-label colors set in site_settings
// (exposed as CSS variables on <html> by app/layout.tsx).
import type { CSSProperties } from 'react';

const tint = (variable: string, pct: number): CSSProperties => ({
  backgroundColor: `color-mix(in srgb, var(${variable}) ${pct}%, transparent)`,
});

export const primaryBg: CSSProperties = { backgroundColor: 'var(--color-primary)' };
export const secondaryBg: CSSProperties = { backgroundColor: 'var(--color-secondary)' };
export const secondaryText: CSSProperties = { color: 'var(--color-secondary)' };
export const primaryTint = (pct: number) => tint('--color-primary', pct);
export const secondaryTint = (pct: number) => tint('--color-secondary', pct);
