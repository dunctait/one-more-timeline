import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/main.css', 'utf8');

function vars(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2];
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const root = vars(/:root\s*\{([^}]*)\}/.exec(css)![1]);
const themes: Record<string, Record<string, string>> = { default: root };
for (const m of css.matchAll(/html\[data-theme='([a-z]+)'\]\s*\{([^}]*)\}/g)) {
  themes[m[1]] = { ...root, ...vars(m[2]) };
}

describe('text contrast meets WCAG AA (4.5:1) on card-level surfaces in every theme', () => {
  for (const [name, v] of Object.entries(themes)) {
    it(name, () => {
      for (const text of ['text-main', 'text-muted', 'text-dim']) {
        for (const bg of ['bg-dark', 'bg-surface', 'bg-card', 'bg-card-hover']) {
          expect(contrast(v[text], v[bg]), `${name}: ${text} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }

  it('covers every theme the game offers', () => {
    expect(Object.keys(themes).length).toBeGreaterThanOrEqual(7);
  });
});
