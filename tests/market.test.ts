import { describe, expect, it } from 'vitest';
import { createInitialState, executeAction } from '../src/engine/engine.js';
import { barterRatio, BARTER_BASE_RATIOS } from '../src/engine/rules.js';
import { TimelineState } from '../src/engine/types.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';

const town = (patch: Partial<TimelineState['resources']> = {}): TimelineState => {
  const s = createInitialState();
  return {
    ...s,
    rung: 'town',
    caps: { food: 200, materials: 200, knowledge: 200 },
    resources: { ...s.resources, food: 150, materials: 10, knowledge: 10, ...patch },
  };
};

describe('marketplace', () => {
  it('opens at the Walled Town', () => {
    const early = { ...town(), rung: 'village' as const };
    expect(executeAction(early, { type: 'BARTER', from: 'food', to: 'materials', amount: 30 }).success).toBe(false);
    expect(buildTimelineViewModel(early).market.unlocked).toBe(false);
    expect(buildTimelineViewModel(town()).market.unlocked).toBe(true);
  });

  it('trades at the stated ratio and shows the result in the stores', () => {
    const r = executeAction(town(), { type: 'BARTER', from: 'food', to: 'materials', amount: 30 });
    expect(r.success).toBe(true);
    expect(r.state.resources.food).toBe(120);
    expect(r.state.resources.materials).toBe(20);
  });

  it('never trades into waste: spends only what the destination can hold', () => {
    const s = town({ food: 150, materials: 195 });
    const r = executeAction(s, { type: 'BARTER', from: 'food', to: 'materials', amount: 30 });
    expect(r.success).toBe(true);
    expect(r.state.resources.materials).toBe(200);
    expect(r.state.resources.food).toBeGreaterThan(120);
    const full = executeAction(town({ materials: 200 }), { type: 'BARTER', from: 'food', to: 'materials', amount: 30 });
    expect(full.success).toBe(false);
  });

  it('rejects trades you cannot afford or that are not real', () => {
    expect(executeAction(town({ food: 5 }), { type: 'BARTER', from: 'food', to: 'materials', amount: 30 }).success).toBe(false);
    expect(executeAction(town(), { type: 'BARTER', from: 'food', to: 'food', amount: 30 }).success).toBe(false);
    expect(executeAction(town(), { type: 'BARTER', from: 'food', to: 'materials', amount: -5 }).success).toBe(false);
  });

  it('gets better with Grand Bazaars, but a round trip is always a loss', () => {
    const s = town();
    s.buildings.bazaar = 3;
    expect(barterRatio(s.buildings, 'food', 'materials')).toBe(2.25);
    s.buildings.bazaar = 40;
    for (const a of BARTER_BASE_RATIOS) expect(barterRatio(s.buildings, a.from, a.to)).toBeGreaterThanOrEqual(1.5);
    // Any cycle multiplies to less than one unit back per unit spent.
    const cycle = barterRatio(s.buildings, 'food', 'materials')! * barterRatio(s.buildings, 'materials', 'knowledge')! * barterRatio(s.buildings, 'knowledge', 'food')!;
    expect(cycle).toBeGreaterThan(1);
  });
});
