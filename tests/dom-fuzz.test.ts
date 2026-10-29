// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/engine/engine.js';
import { seededUnit } from '../src/engine/events.js';
import { TimelineState } from '../src/engine/types.js';

const errors: string[] = [];

beforeAll(async () => {
  vi.useFakeTimers();
  Element.prototype.scrollIntoView = () => undefined; // not implemented by jsdom
  vi.stubGlobal('confirm', () => true);
  vi.stubGlobal('alert', () => undefined);
  window.addEventListener('error', (event) => errors.push(String(event.error ?? event.message)));
  const s: TimelineState = {
    ...createInitialState(),
    rung: 'city',
    tick: 160,
    year: 41,
    insight: 60,
    prestigeCounts: { 1: 2, 2: 0, 3: 0, 4: 0 },
    features: ['ancestral_hands', 'rising_tide'],
  };
  s.population = { total: 12, max: 30, roles: { unassigned: 4, forager: 3, builder: 3, scholar: 2, healer: 0 } };
  s.resources = { food: 120, materials: 120, knowledge: 120, stability: 80 };
  localStorage.setItem('omt.devMode', 'true');
  localStorage.setItem('omt.save.v1', JSON.stringify(s));
  localStorage.setItem('omt.welcomed', 'true');
  localStorage.setItem('omt.lastSeen', String(Date.now()));
  const html = readFileSync('index.html', 'utf8');
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  await import('../src/main.js');
});

const SKIP = new Set(['btn-reset-game', 'btn-toggle-dev', 'btn-disable-dev', 'btn-open-proposal']);

describe('fuzz: random clicking never breaks the page', () => {
  it('survives 300 random clicks across every tab, with time passing', async () => {
    for (let step = 0; step < 300; step++) {
      const r = (salt: number): number => seededUnit(4242, step, salt);
      const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')].filter(
        (b) => !b.disabled && !b.hidden && !SKIP.has(b.id) && !b.closest('[hidden]')
      );
      if (buttons.length === 0) continue;
      buttons[Math.floor(r(1) * buttons.length)].click();
      if (r(2) < 0.25) await vi.advanceTimersByTimeAsync(1000 + Math.floor(r(3) * 4000));
      if (step % 100 === 0) {
        const screen = document.body.textContent ?? '';
        expect(screen, `step ${step}`).not.toMatch(/NaN|undefined|\[object Object\]/);
      }
    }
    expect(errors).toEqual([]);
    const screen = document.body.textContent ?? '';
    expect(screen).not.toMatch(/NaN|undefined|\[object Object\]/);
    expect(document.querySelectorAll('.tab-panel:not([hidden])').length).toBe(1);
  }, 120_000);
});
