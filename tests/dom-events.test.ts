// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createInitialState, normalizeState } from '../src/engine/engine.js';

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

beforeAll(async () => {
  vi.useFakeTimers();
  vi.stubGlobal('alert', () => undefined);
  const state = normalizeState({
    ...createInitialState({ seed: 3 }),
    rung: 'village',
    resources: { food: 80, materials: 80, knowledge: 80, stability: 80 },
    pendingChoice: { eventId: 'raiders_on_the_ridge', tick: 5 },
    waitingEvents: [{ eventId: 'merchant_caravan', tick: 2 }],
  });
  localStorage.setItem('omt.save.v1', JSON.stringify(state));
  localStorage.setItem('omt.welcomed', 'true');
  localStorage.setItem('omt.lastSeen', String(Date.now()));
  const html = readFileSync('index.html', 'utf8');
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  await import('../src/main.js');
});

describe('events on the page', () => {
  it('stops the timeline for an urgent event in a modal with one button per option, priced in icons', () => {
    expect($('event-modal').hidden).toBe(false);
    const buttons = $('event-modal-options').querySelectorAll('button');
    expect(buttons).toHaveLength(3);
    expect($('event-modal-options').querySelectorAll('.chip-cost').length).toBeGreaterThanOrEqual(3);
    const yearBefore = $('stat-year').textContent;
    vi.advanceTimersByTime(5000);
    expect($('stat-year').textContent).toBe(yearBefore);
  });

  it('closes the modal once chosen, and time runs again', () => {
    ($('event-modal-options').querySelector('button') as HTMLButtonElement).click();
    expect($('event-modal').hidden).toBe(true);
    const yearBefore = $('stat-year').textContent;
    vi.advanceTimersByTime(8000);
    expect($('stat-year').textContent).not.toBe(yearBefore);
  });

  it('keeps tales on their own Events page, with a button for each of their options', () => {
    const cards = $('event-list').querySelectorAll('.event-tale');
    expect(cards).toHaveLength(1);
    expect(cards[0].querySelectorAll('.btn-event')).toHaveLength(3);
    const labels = [...document.querySelectorAll('#subnav .subnav-btn')].map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.includes('Events'))).toBe(true);
    (cards[0].querySelectorAll('.btn-event')[1] as HTMLButtonElement).click();
    expect($('event-list').querySelectorAll('.event-tale')).toHaveLength(0);
    expect($('event-list').textContent).toContain('Nothing waits');
  });

  it('puts the ready banner in a row above the sub-menu, so the buttons at the top never move', () => {
    const banner = $('ready-banner');
    const subnav = $('subnav');
    const main = document.querySelector('main.tab-viewport')!;
    expect(main.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(banner.compareDocumentPosition(subnav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const subpanel = document.querySelector('#tab-hearth .subpanel[data-sub="gather"]')!;
    const order = [...subpanel.children].map((c) => c.id || c.className);
    expect(order[0]).toContain('section-box');
    expect(subpanel.querySelector('#goal-card')!.compareDocumentPosition(subpanel.querySelector('.manual-actions-grid')!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });
});
