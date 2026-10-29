/**
 * Two-tier navigation and fit-to-screen paging.
 *
 * The bottom bar picks a main section; a sub-menu under the header picks one page of it. Every page is sized to
 * the visible screen, and any list too long for the space left is split into pages that fit what is measured,
 * so nothing on a phone ever needs a scrollbar.
 */

interface LayoutInputs {
  /** Progressive disclosure: which gated sub-pages the player has come across. */
  disclosure: Record<string, boolean>;
  /** Which `tab.sub` pages hold work waiting for the player. */
  badges: Record<string, boolean>;
}

let inputs: LayoutInputs = { disclosure: {}, badges: {} };
const selected: Record<string, string> = {};
const pageOf = new Map<string, number>();

export function setLayoutInputs(next: LayoutInputs): void {
  inputs = next;
}

export function selectedSub(tab: string): string | undefined {
  return selected[tab];
}

function subpanelsOf(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>('.tab-inner > .subpanel'));
}

function isDisclosed(sub: HTMLElement): boolean {
  const key = sub.dataset.disclosure;
  return !key || inputs.disclosure[key] === true;
}

/** Splits a pager's items into pages that fit the room measured right now, then shows the chosen page. */
function layoutPager(pager: HTMLElement): void {
  const key = pager.dataset.pager ?? '';
  const items = pager.querySelector<HTMLElement>('.pager-items');
  const bar = pager.querySelector<HTMLElement>('.pager-bar');
  if (!items || !bar) return;
  const kids = Array.from(items.children) as HTMLElement[];
  kids.forEach((kid) => (kid.hidden = false));
  bar.hidden = true;
  const full = items.clientHeight;
  // Without a rendered layout (or with nothing to split) every item simply shows.
  if (full === 0 || kids.length < 2) return;

  const gap = parseFloat(getComputedStyle(items).rowGap) || 0;
  const heights = kids.map((kid) => kid.offsetHeight);
  const total = heights.reduce((sum, h) => sum + h, 0) + gap * (kids.length - 1);
  if (total <= full + 0.5) return;

  bar.hidden = false;
  const room = items.clientHeight;
  const pages: Array<[number, number]> = [];
  let start = 0;
  let used = 0;
  kids.forEach((_, i) => {
    const need = heights[i] + (i > start ? gap : 0);
    if (i > start && used + need > room + 0.5) {
      pages.push([start, i]);
      start = i;
      used = heights[i];
    } else {
      used += need;
    }
  });
  pages.push([start, kids.length]);

  const page = Math.min(pageOf.get(key) ?? 0, pages.length - 1);
  pageOf.set(key, page);
  kids.forEach((kid, i) => (kid.hidden = i < pages[page][0] || i >= pages[page][1]));

  const html = `<button type="button" class="pager-btn" data-pager-dir="-1" aria-label="Previous page" ${page === 0 ? 'disabled' : ''}>‹</button><span class="pager-count">${page + 1} / ${pages.length}</span><button type="button" class="pager-btn" data-pager-dir="1" aria-label="Next page" ${page === pages.length - 1 ? 'disabled' : ''}>›</button>`;
  if (bar.dataset.sig !== html) {
    bar.innerHTML = html;
    bar.dataset.sig = html;
  }
}

export function layoutPagers(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('.pager[data-pager]').forEach(layoutPager);
}

/** Shows the chosen sub-page of a tab (falling back to the first one the player has met) and fits its lists. */
export function refreshLayout(tab: string, panel: HTMLElement, choose?: string): void {
  if (choose) selected[tab] = choose;
  const subs = subpanelsOf(panel);
  const visible = subs.filter(isDisclosed);
  const current = visible.find((p) => p.dataset.sub === selected[tab]) ?? visible[0];
  selected[tab] = current?.dataset.sub ?? '';
  subs.forEach((p) => (p.hidden = p !== current));

  const nav = panel.querySelector<HTMLElement>('.subnav');
  if (nav) {
    nav.hidden = visible.length < 2;
    const html = visible
      .map((p) => {
        const sub = p.dataset.sub ?? '';
        const on = p === current;
        const badge = inputs.badges[`${tab}.${sub}`] ? '<span class="tab-badge" aria-label="needs attention"></span>' : '';
        return `<button type="button" role="tab" class="subnav-btn${on ? ' active' : ''}" data-sub="${sub}" aria-selected="${on}" tabindex="${on ? 0 : -1}"><span class="sub-icon" aria-hidden="true">${p.dataset.icon ?? ''}</span><span class="sub-label">${p.dataset.label ?? sub}</span>${badge}</button>`;
      })
      .join('');
    if (nav.dataset.sig !== html) {
      nav.innerHTML = html;
      nav.dataset.sig = html;
    }
  }
  if (current) layoutPagers(current);
}

function tabOf(el: Element): { tab: string; panel: HTMLElement } | null {
  const panel = el.closest<HTMLElement>('.tab-panel');
  return panel ? { tab: panel.id.replace('tab-', ''), panel } : null;
}

/** Wires sub-menu taps, arrow keys and page buttons once for the whole document. */
export function bindLayoutEvents(): void {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const subBtn = target.closest<HTMLElement>('.subnav-btn');
    if (subBtn) {
      const where = tabOf(subBtn);
      if (where) refreshLayout(where.tab, where.panel, subBtn.dataset.sub);
      return;
    }
    const pageBtn = target.closest<HTMLButtonElement>('.pager-btn');
    if (pageBtn) {
      const pager = pageBtn.closest<HTMLElement>('.pager');
      if (!pager?.dataset.pager) return;
      const dir = Number(pageBtn.dataset.pagerDir);
      pageOf.set(pager.dataset.pager, Math.max(0, (pageOf.get(pager.dataset.pager) ?? 0) + dir));
      layoutPager(pager);
    }
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const subBtn = target?.closest<HTMLElement>('.subnav-btn');
    if (!subBtn || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const where = tabOf(subBtn);
    if (!where) return;
    const buttons = Array.from(subBtn.parentElement?.querySelectorAll<HTMLElement>('.subnav-btn') ?? []);
    const index = buttons.indexOf(subBtn);
    const next =
      event.key === 'Home' ? 0
      : event.key === 'End' ? buttons.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    refreshLayout(where.tab, where.panel, buttons[next].dataset.sub);
    where.panel.querySelector<HTMLElement>('.subnav-btn.active')?.focus();
  });

  // Window size (rotation, a browser bar appearing) changes how much fits.
  window.addEventListener('resize', () => {
    document.querySelectorAll<HTMLElement>('.tab-panel.active').forEach((panel) => {
      const tab = panel.id.replace('tab-', '');
      refreshLayout(tab, panel);
    });
  });
}
