// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/engine/engine.js';
import { TimelineState } from '../src/engine/types.js';

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const text = (id: string): string => ($(id).textContent ?? '').trim();

beforeAll(async () => {
  vi.useFakeTimers();
  const s: TimelineState = { ...createInitialState(), rung: 'town', prestigeCounts: { 1: 1, 2: 0, 3: 0, 4: 0 } };
  s.population = { total: 8, max: 12, roles: { unassigned: 0, forager: 3, builder: 3, scholar: 2, healer: 0 } };
  s.caps = { food: 300, materials: 300, knowledge: 300 };
  s.resources = { food: 40, materials: 40, knowledge: 40, stability: 80 };
  localStorage.setItem('omt.save.v1', JSON.stringify(s));
  localStorage.setItem('omt.welcomed', 'true');
  // The player left two hours ago.
  localStorage.setItem('omt.lastSeen', String(Date.now() - 2 * 3600 * 1000));
  const html = readFileSync('index.html', 'utf8');
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  await import('../src/main.js');
  // Let the sliced catch-up finish (each slice yields with setTimeout 0).
  await vi.advanceTimersByTimeAsync(50);
});

describe('returning after a long absence', () => {
  it('catches the timeline up and says so, without losing anything', () => {
    expect(Number(text('stat-year').replace('Year ', ''))).toBeGreaterThan(1500);
    expect(text('toast-region')).toContain('Welcome back');
    expect(Number(text('res-food-current'))).toBeGreaterThanOrEqual(40);
    expect($('chronicle-log').textContent).toContain('You were away for');
  });

  it('keeps the game responsive afterwards', () => {
    const yearBefore = text('stat-year');
    vi.advanceTimersByTime(8000);
    expect(text('stat-year')).not.toBe(yearBefore);
  });
});
