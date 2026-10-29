/**
 * One-screen layout, measured in a real browser engine.
 *
 * jsdom has no layout, so this drives the system Chrome (via playwright-core) against the dev server at a typical
 * modern phone size. For every main section and every sub-page, in several game states, nothing may overflow,
 * clip, scroll, or fall below the screen. Set OMT_REQUIRE_BROWSER=1 (CI does) to fail instead of skipping when no
 * Chrome is found.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { chromium, type Browser } from 'playwright-core';
import { createInitialState, normalizeState } from '../src/engine/engine.js';
import { ACHIEVEMENTS } from '../src/engine/achievements.js';
import { RELICS } from '../src/engine/relics.js';
import { BUILDINGS, FEATURE_IDS } from '../src/engine/rules.js';
import type { TimelineState } from '../src/engine/types.js';
import { ripe } from './helpers.js';

// A Nothing Phone class device: roughly 412 CSS px wide; about 780 tall once the browser's own bars are counted.
const VIEWPORTS = [
  { name: 'Nothing Phone (412x780)', width: 412, height: 780, minPerPage: 5 },
  { name: 'compact phone (360x700)', width: 360, height: 700, minPerPage: 4 },
];

function grown(state: TimelineState): TimelineState {
  return normalizeState(state);
}

function states(): Array<{ name: string; state: TimelineState }> {
  const fresh = createInitialState();

  const early: TimelineState = grown({
    ...createInitialState(),
    rung: 'band',
    tick: 60,
    year: 16,
    resources: { food: 40, materials: 30, knowledge: 12, stability: 80 },
  });

  const village: TimelineState = grown({
    ...ripe(createInitialState()),
    resources: { food: 150, materials: 120, knowledge: 80, stability: 90 },
    buildings: { ...createInitialState().buildings, workshop: 1 },
  });

  const midLate: TimelineState = grown({
    ...createInitialState({
      insight: 40,
      prestigeCounts: { 1: 6, 2: 1, 3: 0, 4: 0 },
      echoes: 3,
      timelinesCreated: 7,
      achievements: ACHIEVEMENTS.slice(0, 12).map((a) => a.id),
      relics: RELICS.slice(0, 3).map((r) => r.id),
      features: FEATURE_IDS.filter((id) => !['lore_keepers', 'founders', 'cartographers'].includes(id)).slice(0, 5),
    }),
    rung: 'town',
    pendingBoon: ['lore_keepers', 'founders', 'cartographers'],
    tick: 400,
    year: 100,
    resources: { food: 300, materials: 300, knowledge: 200, stability: 100 },
  });

  const everything: TimelineState = grown({
    ...createInitialState({
      insight: 500,
      echoes: 40,
      resonance: 12,
      eternity: 4,
      prestigeCounts: { 1: 30, 2: 12, 3: 6, 4: 3 },
      timelinesCreated: 51,
      achievements: ACHIEVEMENTS.map((a) => a.id),
      relics: RELICS.map((r) => r.id),
      features: FEATURE_IDS,
      history: Array.from({ length: 12 }, (_, i) => ({
        number: i + 1,
        tier: 1 as const,
        year: 40 + i,
        rung: 'realm' as const,
        gained: `+${i + 3} Insight`,
      })),
    }),
    rung: 'realm',
    tick: 2000,
    year: 500,
    buildings: Object.fromEntries(
      Object.entries(BUILDINGS).map(([id, def]) => [id, def.maxCount ?? 8])
    ) as TimelineState['buildings'],
    resources: { food: 9999, materials: 9999, knowledge: 9999, stability: 100 },
  });

  return [
    { name: 'fresh', state: fresh },
    { name: 'early band', state: early },
    { name: 'first Jumpback ready', state: village },
    { name: 'mid game after jumps', state: midLate },
    { name: 'everything unlocked', state: everything },
  ];
}

interface Finding {
  where: string;
  problem: string;
}

/** Runs inside the page: reports anything that overflows, clips, scrolls, or sits off the screen. */
function auditPage(): string[] {
  const problems: string[] = [];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const doc = document.documentElement;
  if (doc.scrollHeight > vh + 1) problems.push(`page scrolls vertically (${doc.scrollHeight} > ${vh})`);
  if (doc.scrollWidth > vw + 1) problems.push(`page scrolls horizontally (${doc.scrollWidth} > ${vw})`);

  const describe = (el: Element): string => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.split(/\s+/).slice(0, 2).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  const visible = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    for (let n: Element | null = el; n; n = n.parentElement) {
      if ((n as HTMLElement).hidden) return false;
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    }
    return true;
  };

  const nav = document.querySelector('.tab-nav')?.getBoundingClientRect();
  if (!nav || nav.bottom > vh + 1) problems.push('bottom navigation is not fully on screen');
  const subnav = document.querySelector('#subnav')?.getBoundingClientRect();
  if (!subnav || !nav || subnav.bottom > nav.top + 1) problems.push('sub-menu is not sitting just above the bottom bar');
  if (document.querySelectorAll('#subnav > *').length !== 5) problems.push('sub-menu does not have exactly five cells');

  const panel = document.querySelector('.tab-panel.active');
  const sub = panel?.querySelector('.subpanel:not([hidden])');
  if (!panel || !sub) return [...problems, 'no active page'];

  // Nothing in the page is a scroll container with something to scroll (developer tools excepted).
  document.querySelectorAll('*').forEach((el) => {
    if (!visible(el) || el.closest('#dev-panel')) return;
    const cs = getComputedStyle(el);
    const scrollsY = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
    const scrollsX = cs.overflowX === 'auto' || cs.overflowX === 'scroll';
    if (scrollsY && el.scrollHeight > el.clientHeight + 1) problems.push(`${describe(el)} has a vertical scrollbar`);
    if (scrollsX && el.scrollWidth > el.clientWidth + 1) problems.push(`${describe(el)} has a horizontal scrollbar`);
  });

  // The page's own content must fit inside it without being clipped.
  const clipped = (el: Element): boolean => el.scrollHeight > el.clientHeight + 1;
  if (clipped(sub)) problems.push(`sub-page content is cut off (${sub.scrollHeight} > ${sub.clientHeight})`);
  sub.querySelectorAll('.pager-items, .section-box').forEach((el) => {
    if (visible(el) && clipped(el)) problems.push(`${describe(el)} is cut off (${el.scrollHeight} > ${el.clientHeight})`);
  });
  const subBox = sub.getBoundingClientRect();
  sub.querySelectorAll('*').forEach((el) => {
    if (!visible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) problems.push(`${describe(el)} spills sideways (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`);
    if (r.bottom > subBox.bottom + 1 && r.height > 0 && !el.closest('[hidden]')) {
      const inPager = el.closest('.pager-items');
      if (!inPager) problems.push(`${describe(el)} hangs below the page`);
    }
  });
  // Text that does not fit its own box.
  sub.querySelectorAll('button, .section-title, .res-val, strong, span, p, li').forEach((el) => {
    if (!visible(el)) return;
    const cs = getComputedStyle(el);
    if (cs.overflowX === 'hidden' && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      problems.push(`${describe(el)} clips its text (${el.scrollWidth} > ${el.clientWidth})`);
    }
  });
  // Locked things are not rendered: lists only ever hold what the player can use.
  if (document.querySelector('.building-card.locked, .discovery.locked')) problems.push('a locked card is rendered');
  // Tap targets.
  document.querySelectorAll('button').forEach((el) => {
    if (!visible(el) || el.closest('#dev-panel')) return;
    const r = el.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) problems.push(`${describe(el)} is a small tap target (${Math.round(r.width)}x${Math.round(r.height)})`);
  });
  return problems;
}

declare const process: { env: Record<string, string | undefined> };
const requireBrowser = process.env.OMT_REQUIRE_BROWSER;

let server: ViteDevServer;
let browser: Browser | null = null;
let baseUrl = '';

beforeAll(async () => {
  try {
    // The machine is busy running the other test files too, so give the browser a second chance.
    browser = await chromium.launch({ channel: 'chrome', headless: true, timeout: 60_000 }).catch(() =>
      chromium.launch({ channel: 'chrome', headless: true, timeout: 60_000 })
    );
  } catch (err) {
    if (requireBrowser) throw err;
    console.warn('mobile-fit: no Chrome found, skipping real-browser layout checks.', String(err).split('\n')[0]);
    return;
  }
  server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
  await server.listen();
  baseUrl = server.resolvedUrls?.local[0] ?? '';
}, 150_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

describe('every page fits a phone screen with no scrolling', () => {
  for (const viewport of VIEWPORTS) {
    it(`${viewport.name}`, async (ctx) => {
      if (!browser) return ctx.skip();
      const findings: Finding[] = [];
      for (const { name, state } of states()) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 2,
          hasTouch: true,
          isMobile: true,
        });
        await context.addInitScript(
          ({ save }) => {
            localStorage.setItem('omt.save.v1', save);
            localStorage.setItem('omt.welcomed', 'true');
            localStorage.setItem('omt.paused', 'true');
            localStorage.setItem('omt.lastSeen', String(Date.now()));
          },
          { save: JSON.stringify(state) }
        );
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(baseUrl);
        await page.waitForSelector('.tab-nav');
        const tabs = await page.$$eval('.tab-nav-btn', (b) => b.map((x) => (x as HTMLElement).dataset.tab ?? ''));
        for (const tab of tabs) {
          await page.click(`#tab-btn-${tab}`);
          const subs = await page.$$eval(`#subnav .subnav-btn:not(.locked)`, (b) => b.map((x) => (x as HTMLElement).dataset.sub ?? ''));
          const pages = subs.length ? subs : [''];
          for (const sub of pages) {
            if (sub) await page.click(`#subnav .subnav-btn[data-sub="${sub}"]`);
            // Page through every list too: each page of a list must fit.
            let guard = 0;
            // Long lists are paged, and each page should hold a healthy handful (5-10), not two or three.
            // Rich detail cards (a whole prestige tier) are shown one at a time, so they are exempt.
            const sizes = await page.$$eval(`#tab-${tab} .subpanel:not([hidden]) .pager[data-page-sizes]:not(.pager-flat)`, (els) =>
              els.map((el) => ((el as HTMLElement).dataset.pageSizes ?? '').split(',').map(Number))
            );
            for (const list of sizes) {
              const total = list.reduce((x, y) => x + y, 0);
              const want = total >= 2 * viewport.minPerPage ? viewport.minPerPage : Math.max(2, Math.ceil(total / 2));
              if (list.length > 1 && list.slice(0, -1).some((n) => n < want || n > 10)) {
                findings.push({ where: `${viewport.name} / ${name} / ${tab}.${sub}`, problem: `items per page are ${list.join('/')} (want ${want}-10 on every full page)` });
              }
            }
            for (;;) {
              const problems = await page.evaluate(auditPage);
              problems.forEach((problem) => findings.push({ where: `${viewport.name} / ${name} / ${tab}${sub ? '.' + sub : ''}`, problem }));
              const next = await page.$(`#tab-${tab} .subpanel:not([hidden]) .pager-btn[data-pager-dir="1"]:not([disabled])`);
              if (!next || ++guard > 12) break;
              await next.click();
            }
          }
        }
        errors.forEach((e) => findings.push({ where: `${viewport.name} / ${name}`, problem: `page error: ${e}` }));
        await context.close();
      }
      const report = findings.map((f) => `${f.where}: ${f.problem}`);
      expect([...new Set(report)].slice(0, 40)).toEqual([]);
    }, 180_000);
  }
});
