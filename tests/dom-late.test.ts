// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/engine/engine.js';
import { TimelineState } from '../src/engine/types.js';

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const text = (id: string): string => ($(id).textContent ?? '').trim();

beforeAll(async () => {
  vi.useFakeTimers();
  vi.stubGlobal('confirm', () => true);
  vi.stubGlobal('alert', () => undefined);
  // A realm-stage save: everything unlocked, a prestige tier ready.
  const s: TimelineState = {
    ...createInitialState(),
    rung: 'realm',
    tick: 1600,
    year: 401,
    furthestYear: 401,
    insight: 130,
    prestigeCounts: { 1: 3, 2: 0, 3: 0, 4: 0 },
    features: ['steady_hands', 'ancestral_hands'],
    caps: { food: 3000, materials: 3000, knowledge: 3000 },
    resources: { food: 500, materials: 500, knowledge: 500, stability: 80 },
  };
  s.population = { total: 24, max: 40, roles: { unassigned: 0, forager: 8, builder: 8, scholar: 8, healer: 0 } };
  localStorage.setItem('omt.save.v1', JSON.stringify(s));
  localStorage.setItem('omt.welcomed', 'true');
  localStorage.setItem('omt.lastSeen', String(Date.now()));
  const html = readFileSync('index.html', 'utf8');
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  await import('../src/main.js');
});

describe('the late-game page', () => {
  it('shows the realm, open edict slots, the market and affordable discoveries', () => {
    expect(text('stat-rung')).toBe('Sovereign Realm');
    expect($('edict-list').querySelectorAll('.edict-options').length).toBe(6);
    expect($('market-list').querySelectorAll('.market-row').length, 'market rows').toBe(6);
    expect($('market-list').querySelectorAll('.btn-trade:not([disabled])').length, 'enabled trades').toBeGreaterThan(0);
    expect($('discovery-list').querySelectorAll('.btn-research:not([disabled])').length).toBeGreaterThan(0);
    expect(
      $('building-grid').querySelectorAll('.building-card').length + $('wonder-grid').querySelectorAll('.building-card').length
    ).toBe(19);
  });

  it('issues an edict with one click and reflects it', () => {
    const option = $('edict-list').querySelector<HTMLButtonElement>('.btn-edict')!;
    option.click();
    expect($('edict-list').querySelector('.btn-edict[aria-pressed="true"]')).toBeTruthy();
    expect(text('production-notes')).toContain('Edicts');
  });

  it('researches a discovery and trades at the market', () => {
    const research = $('discovery-list').querySelector<HTMLButtonElement>('.btn-research:not([disabled])')!;
    research.click();
    expect($('discovery-list').querySelectorAll('.unlock-pill').length).toBeGreaterThan(0);
    const food = Number(text('res-food-current').replace(/K$/, ''));
    $('market-list').querySelector<HTMLButtonElement>('.btn-trade[data-trade-from="food"]:not([disabled])')?.click();
    expect(Number(text('res-food-current').replace(/K$/, ''))).toBeLessThan(food);
  });

  it('builds a building from the card button', () => {
    const before = $('building-grid').textContent;
    $('building-grid').querySelector<HTMLButtonElement>('.btn-build:not([disabled])')!.click();
    expect($('building-grid').textContent).not.toBe(before);
  });

  it('announces a ready prestige and performs Epoch Shift end to end', () => {
    vi.advanceTimersByTime(1500);
    ($('tab-btn-evolution') as HTMLButtonElement).click();
    const epoch = $('deep-prestige-list').querySelector<HTMLButtonElement>('[data-prestige-tier="2"]')!;
    expect(epoch.disabled).toBe(false);
    expect(epoch.textContent).toContain('Echoes');
    epoch.click();
    expect(text('stat-rung')).not.toBe('Sovereign Realm');
    expect(text('stat-deep-pill')).toContain('🌅');
    expect($('legacy-functions-list').textContent).toContain('Rising Tide');
    expect($('chronicle-log').textContent).toContain('Epoch Shift');
    expect(text('toast-region')).toContain('Epoch Shift complete');
  });

  it('shows an empty-handed new timeline with the new function switchable', () => {
    const toggle = $('legacy-functions-list').querySelector<HTMLButtonElement>('[data-automation="advance"]')!;
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    toggle.click();
    expect($('legacy-functions-list').querySelector<HTMLButtonElement>('[data-automation="advance"]')!.getAttribute('aria-pressed')).toBe('false');
  });
});
