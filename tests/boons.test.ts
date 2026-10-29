import { describe, expect, it } from 'vitest';
import { boonOptions, createInitialState, executeAction, normalizeState } from '../src/engine/engine.js';
import { FEATURE_IDS, FEATURES, PACKED_PROVISIONS } from '../src/engine/rules.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';
import type { TimelineState } from '../src/engine/types.js';
import { ripe } from './helpers.js';

const jump = (s: TimelineState): TimelineState => executeAction(ripe({ ...s, year: 41, tick: 160 }), { type: 'TIME_JUMP' }).state;

describe('every Jumpback creates a reward', () => {
  it('scripts the first three: hold to gather, then helping hands, then remembered edicts', () => {
    let s = createInitialState();
    s = jump(s);
    expect(s.features).toContain('steady_hands');
    expect(s.pendingBoon).toBeNull();
    s = jump(s);
    expect(s.features).toContain('ancestral_hands');
    s = jump(s);
    expect(s.features).toContain('seasoned_memory');
    expect(s.pendingBoon).toBeNull();
  });

  it('offers a choice of three boons from the fourth Jumpback, and one pick keeps it for good', () => {
    let s = createInitialState();
    for (let i = 0; i < 4; i++) s = jump(s);
    expect(s.pendingBoon).toHaveLength(3);
    const options = s.pendingBoon!;
    expect(options.every((id) => FEATURES[id].boon)).toBe(true);
    expect(buildTimelineViewModel(s).goal.title).toBe('Choose a boon');
    expect(buildTimelineViewModel(s).goal.ready).toBe(true);
    expect(buildTimelineViewModel(s).tabBadges.subs['evolution.legacy']).toBe(true);

    expect(executeAction(s, { type: 'CHOOSE_BOON', featureId: 'steady_hands' }).success).toBe(false);
    const picked = executeAction(s, { type: 'CHOOSE_BOON', featureId: options[1] });
    expect(picked.success).toBe(true);
    expect(picked.state.features).toContain(options[1]);
    expect(picked.state.pendingBoon).toBeNull();
    // It survives the next Jumpback, and the next offer never repeats an owned boon.
    const next = jump(picked.state);
    expect(next.features).toContain(options[1]);
    expect(next.pendingBoon).not.toContain(options[1]);
  });

  it('keeps an unchosen offer through saving and loading, and never loses it to a deeper reset', () => {
    let s = createInitialState();
    for (let i = 0; i < 4; i++) s = jump(s);
    expect(normalizeState(JSON.parse(JSON.stringify(s))).pendingBoon).toEqual(s.pendingBoon);
  });

  it('offers the same choices for the same timeline, and nothing once every boon is owned', () => {
    const base = createInitialState();
    expect(boonOptions(base, 4)).toEqual(boonOptions(base, 4));
    expect(boonOptions(base, 3)).toBeNull();
    const all = { ...base, features: FEATURE_IDS };
    expect(boonOptions(all, 9)).toBeNull();
  });

  it('boons help the timeline already under way', () => {
    const base: TimelineState = { ...createInitialState(), pendingBoon: ['packed_provisions', 'founders', 'cartographers'] };
    const packed = executeAction(base, { type: 'CHOOSE_BOON', featureId: 'packed_provisions' }).state;
    expect(packed.resources.food).toBe(base.resources.food + PACKED_PROVISIONS.food);
    const founders = executeAction(base, { type: 'CHOOSE_BOON', featureId: 'founders' }).state;
    expect(founders.population.total).toBe(base.population.total + 1);
    expect(founders.population.max).toBe(base.population.max + 1);
    // And every timeline after it starts that way.
    const later = jump({ ...founders, rung: 'village' });
    expect(later.population.total).toBe(13);
  });

  it('shows how long a purchase is away once the Cartographers are on the map', () => {
    const s: TimelineState = {
      ...createInitialState(),
      rung: 'band',
      features: ['cartographers'],
      population: { total: 12, max: 12, roles: { unassigned: 0, forager: 4, builder: 8, scholar: 0, healer: 0 } },
    };
    const hut = buildTimelineViewModel(s).buildings.find((b) => b.id === 'hut')!;
    expect(hut.canAfford).toBe(false);
    expect(hut.eta).toMatch(/\d/);
    const without = buildTimelineViewModel({ ...s, features: [] }).buildings.find((b) => b.id === 'hut')!;
    expect(without.eta).toBeNull();
  });
});
