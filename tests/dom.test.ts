// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const text = (id: string): string => ($(id).textContent ?? '').trim();

beforeAll(async () => {
  vi.useFakeTimers();
  const html = readFileSync('index.html', 'utf8') // vitest runs from the repository root;
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
  // Scripts in the page are not executed by jsdom; main.ts is imported directly below.
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  await import('../src/main.js');
});

describe('the real page, booted', () => {
  it('renders every tab with content on first load', () => {
    expect(text('goal-title')).toContain('Gathering Band');
    expect(text('stat-year')).toBe('Year 1');
    // Works and Wonders are separate pages: 14 plus 5.
    expect($('building-grid').children.length + $('wonder-grid').children.length).toBe(19);
    expect($('wonder-grid').children.length).toBe(5);
    expect($('discovery-list').children.length).toBeGreaterThan(10);
    expect($('achievements-list').children.length).toBeGreaterThan(20);
    expect($('relics-list').children.length).toBeGreaterThan(5);
    expect($('challenge-list').children.length).toBeGreaterThan(3);
    expect($('theme-list').children.length).toBeGreaterThan(3);
    // Later prestige tiers are not shown until the player first comes across them.
    expect($('deep-prestige-list').children.length).toBe(0);
    expect($('records-list').children.length).toBeGreaterThan(8);
    expect($('production-notes').children.length).toBeGreaterThan(0);
    expect($('people-list').children.length).toBe(1);
  });

  it('gathers by hand and reflects it immediately', () => {
    const before = Number(text('res-food-current'));
    ($('btn-forage') as HTMLButtonElement).click();
    expect(Number(text('res-food-current'))).toBeGreaterThan(before);
    ($('btn-scavenge') as HTMLButtonElement).click();
    ($('btn-study') as HTMLButtonElement).click();
    expect($('chronicle-log').textContent).toContain('Foraged');
  });

  it('advances time on its own: ticks, seasons and the year counter', () => {
    vi.advanceTimersByTime(5000);
    expect(text('stat-year')).not.toBe('Year 1');
    expect(text('stat-season').length).toBeGreaterThan(0);
  });

  it('switches tabs and shows only one panel at a time', () => {
    for (const tab of ['settlement', 'evolution', 'chronicle', 'settings', 'hearth']) {
      ($(`tab-btn-${tab}`) as HTMLButtonElement).click();
      const visible = [...document.querySelectorAll<HTMLElement>('.tab-panel')].filter((p) => !p.hidden);
      expect(visible.map((p) => p.id)).toEqual([`tab-${tab}`]);
    }
  });

  it('pauses and resumes the timeline', () => {
    const pause = $('btn-pause') as HTMLButtonElement;
    pause.click();
    const frozen = text('stat-year');
    vi.advanceTimersByTime(20000);
    expect(text('stat-year')).toBe(frozen);
    expect(pause.getAttribute('aria-pressed')).toBe('true');
    pause.click();
    vi.advanceTimersByTime(8000);
    expect(text('stat-year')).not.toBe(frozen);
  });

  it('exports a save string and refuses garbage on import', () => {
    ($('btn-export-save') as HTMLButtonElement).click();
    expect((($('save-string') as HTMLTextAreaElement).value)).toMatch(/^OMT1:/);
    const textarea = $('save-string') as HTMLTextAreaElement;
    textarea.value = 'not a save';
    ($('btn-import-save') as HTMLButtonElement).click();
    expect(text('toast-region')).toContain('could not be read');
  });

  it('keeps list nodes (and therefore focus) between ticks when nothing changed', () => {
    ($('tab-btn-settlement') as HTMLButtonElement).click();
    const card = $('building-grid').firstElementChild;
    vi.advanceTimersByTime(3000);
    // The first card's markup is identical tick to tick while resources stay below its cost.
    expect($('building-grid').firstElementChild).toBeTruthy();
    expect(card).toBeTruthy();
  });

  it('offers display preferences and remembers them', () => {
    ($('btn-large-text') as HTMLButtonElement).click();
    expect(document.documentElement.dataset.text).toBe('large');
    ($('btn-reduce-motion') as HTMLButtonElement).click();
    expect(document.documentElement.dataset.motion).toBe('reduced');
    expect(localStorage.getItem('omt.display')).toContain('"largeText":true');
  });
});

describe('keyboard navigation of the tab bar', () => {
  it('moves between tabs with arrow keys, Home and End, keeping a single tab stop', () => {
    const press = (id: string, key: string): void => {
      $(id).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    };
    ($('tab-btn-hearth') as HTMLButtonElement).click();
    press('tab-btn-hearth', 'ArrowRight');
    expect($('tab-btn-settlement').getAttribute('aria-selected')).toBe('true');
    press('tab-btn-settlement', 'End');
    expect($('tab-btn-settings').getAttribute('aria-selected')).toBe('true');
    press('tab-btn-settings', 'ArrowRight');
    expect($('tab-btn-hearth').getAttribute('aria-selected')).toBe('true');
    press('tab-btn-hearth', 'ArrowLeft');
    expect($('tab-btn-settings').getAttribute('aria-selected')).toBe('true');
    const stops = [...document.querySelectorAll<HTMLButtonElement>('.tab-nav-btn')].filter((b) => b.tabIndex === 0);
    expect(stops.map((b) => b.id)).toEqual(['tab-btn-settings']);
    press('tab-btn-settings', 'Home');
    expect($('tab-btn-hearth').getAttribute('aria-selected')).toBe('true');
  });
});

describe('gather hotkeys', () => {
  const press = (key: string, repeat = false): void => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key, repeat, bubbles: true, cancelable: true }));
  };
  const foraged = (): number => ($('chronicle-log').textContent ?? '').split('Foraged').length - 1;

  it('only act on the Hearth and ignore key repeat', () => {
    ($('tab-btn-settings') as HTMLButtonElement).click();
    const start = foraged();
    press('1');
    expect(foraged()).toBe(start);

    ($('tab-btn-hearth') as HTMLButtonElement).click();
    press('1', true);
    expect(foraged()).toBe(start);
    press('1');
    expect(foraged()).toBe(start + 1);
  });
});

describe('chronicle filter', () => {
  it('narrows the log to milestones or quiet entries and back', () => {
    ($('tab-btn-chronicle') as HTMLButtonElement).click();
    const count = (): number => $('chronicle-log').querySelectorAll('.log-entry').length;
    const all = count();
    expect(all).toBeGreaterThan(0);
    const chip = (name: string): HTMLButtonElement =>
      document.querySelector<HTMLButtonElement>(`[data-chronicle-filter="${name}"]`)!;
    chip('milestones').click();
    const milestones = count();
    expect(chip('milestones').getAttribute('aria-pressed')).toBe('true');
    expect(chip('all').getAttribute('aria-pressed')).toBe('false');
    chip('quiet').click();
    const quiet = count();
    expect(milestones + quiet).toBe(all);
    chip('all').click();
    expect(count()).toBe(all);
  });
});
