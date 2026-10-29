import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/engine/engine.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';
import type { TimelineState } from '../src/engine/types.js';

const rich = (patch: Partial<TimelineState> = {}): TimelineState => ({
  ...createInitialState(),
  rung: 'band',
  resources: { food: 60, materials: 50, knowledge: 40, stability: 80 },
  ...patch,
});

describe('notification pills: loud for the new, quiet for the familiar', () => {
  it('calls a first Hut novel, with a number', () => {
    const levels = buildTimelineViewModel(rich()).tabBadges.levels;
    expect(levels['settlement.works']).toEqual({ novel: expect.any(Number), available: 0 });
    expect(levels['settlement.works'].novel).toBeGreaterThan(0);
    expect(levels.settlement.novel).toBeGreaterThan(0);
  });

  it('calls a second Hut merely available, so it is a hollow ring and never a novel one', () => {
    const s = rich();
    s.buildings = { ...s.buildings, hut: 1, granary: 1 };
    const levels = buildTimelineViewModel(s).tabBadges.levels;
    expect(levels['settlement.works'].novel).toBe(0);
    expect(levels['settlement.works'].available).toBeGreaterThan(0);
  });

  it('counts idle people as available, not novel, and shows nothing when nothing can be done', () => {
    const idle = buildTimelineViewModel(rich({ resources: { food: 0, materials: 0, knowledge: 0, stability: 80 } })).tabBadges.levels;
    expect(idle['hearth.roles']).toEqual({ novel: 0, available: 6 });
    expect(idle['settlement.works']).toBeUndefined();
  });
});
