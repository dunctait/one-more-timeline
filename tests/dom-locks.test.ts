// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

beforeAll(async () => {
  vi.useFakeTimers();
  localStorage.setItem('omt.welcomed', 'true');
  localStorage.setItem('omt.lastSeen', String(Date.now()));
  const html = readFileSync('index.html', 'utf8');
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  await import('../src/main.js');
});

describe('pages one rung away are shown greyed out, and nothing else locked is drawn', () => {
  it('greys out Edicts before the Gathering Band, says when it opens, and does not open it', () => {
    ($('tab-btn-settlement') as HTMLButtonElement).click();
    const locked = document.querySelector<HTMLButtonElement>('#subnav .subnav-btn.locked[data-sub="edicts"]')!;
    expect(locked).toBeTruthy();
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(locked.dataset.lock).toContain('Gathering Band');
    expect(document.querySelectorAll('#subnav > *')).toHaveLength(5);
    locked.click();
    expect(($('toast-region').textContent ?? '')).toContain('Gathering Band');
    expect(document.querySelector('#tab-settlement .subpanel[data-sub="edicts"]')!.hasAttribute('hidden')).toBe(true);
  });

  it('does not name pages further away than the next rung', () => {
    const names = [...document.querySelectorAll('#subnav .subnav-btn')].map((b) => b.textContent ?? '');
    expect(names.some((n) => n.includes('Market'))).toBe(false);
    expect(names.some((n) => n.includes('Wonders'))).toBe(false);
  });

  it('draws no locked building cards', () => {
    expect(document.querySelectorAll('.building-card.locked')).toHaveLength(0);
  });
});
