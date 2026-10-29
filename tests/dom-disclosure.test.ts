// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createInitialState, normalizeState } from '../src/engine/engine.js';
import { ripe } from './helpers.js';

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const text = (id: string): string => ($(id).textContent ?? '').trim();
const sub = (tab: string, key: string): HTMLElement =>
  document.querySelector(`#tab-${tab} .subpanel[data-sub="${key}"]`) as HTMLElement;

beforeAll(async () => {
  vi.useFakeTimers();
  // A timeline grown enough for the first Jumpback, one tick short of a quiet achievement.
  const state = normalizeState({
    ...ripe(createInitialState()),
    stats: { ticks: 7199, gathers: 0, built: 0, researched: 0, traded: 0, events: 0 },
  });
  localStorage.setItem('omt.save.v1', JSON.stringify(state));
  localStorage.setItem('omt.welcomed', 'true');
  localStorage.setItem('omt.lastSeen', String(Date.now()));
  const html = readFileSync('index.html', 'utf8');
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  await import('../src/main.js');
});

describe('progressive disclosure, the banner and a quiet bottom of the screen', () => {
  it('offers the first Jumpback as a banner on every tab, not as a toast', () => {
    expect($('ready-banner').hidden).toBe(false);
    expect(text('ready-banner-title')).toContain('Jumpback is ready');
    expect(text('toast-region')).not.toContain('Temporal Horizon');
    for (const tab of ['hearth', 'settlement', 'evolution', 'chronicle', 'settings']) {
      ($(`tab-btn-${tab}`) as HTMLButtonElement).click();
      expect($('ready-banner').hidden).toBe(false);
    }
  });

  it('takes the player to the right sub-page, and stops pointing once they are there', () => {
    ($(`tab-btn-hearth`) as HTMLButtonElement).click();
    ($('ready-banner-go') as HTMLButtonElement).click();
    expect($('tab-evolution').hidden).toBe(false);
    expect(sub('evolution', 'jump').hidden).toBe(false);
    vi.advanceTimersByTime(1100);
    expect($('ready-banner-go').hidden).toBe(true);
  });

  it('shows a two-tier menu, and only the sub-pages the player has met', () => {
    const labels = [...document.querySelectorAll('#subnav .subnav-btn')].map((b) => b.textContent?.trim());
    expect(labels.some((l) => l?.includes('Jumpback'))).toBe(true);
    expect(labels.some((l) => l?.includes('Sent back'))).toBe(false);
    expect(labels.some((l) => l?.includes('Trials'))).toBe(false);
    expect(labels.some((l) => l?.includes('Deeper'))).toBe(false);
    expect(sub('evolution', 'deeper').hidden).toBe(true);
    // The sub-menu always has five cells, blank where a page has not been met yet.
    expect(document.querySelectorAll('#subnav > *')).toHaveLength(5);
    expect(document.querySelectorAll('#subnav .subnav-blank').length).toBeGreaterThan(0);
    // Only one sub-page of a tab is ever shown.
    const shown = [...document.querySelectorAll<HTMLElement>('#tab-evolution .subpanel')].filter((p) => !p.hidden);
    expect(shown).toHaveLength(1);
  });

  it('does not mention Insight until the Jumpback has been met', async () => {
    expect($('stat-insight-pill').hidden).toBe(false);
  });

  it('keeps achievements and events out of toasts; they live in the Chronicle', () => {
    vi.advanceTimersByTime(2500);
    expect(text('achievements-summary')).toMatch(/^[1-9]/);
    expect(text('toast-region')).toBe('');
  });
});
