import { describe, expect, it } from 'vitest';
import { createInitialState, executeAction, fastForward, stepTick } from '../src/engine/engine.js';
import { EVENTS } from '../src/engine/events.js';
import { TimelineState } from '../src/engine/types.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';

function untilDecision(seed = 11): TimelineState {
  let s: TimelineState = { ...createInitialState({ seed }), rung: 'realm' };
  s = { ...s, caps: { food: 500, materials: 500, knowledge: 500 } };
  for (let i = 0; i < 4000 && !s.pendingChoice; i++) s = stepTick(s);
  return s;
}

describe('choice events', () => {
  it('every option is a gift and there are always at least two', () => {
    for (const e of EVENTS.filter((x) => x.choices)) {
      expect(e.choices!.length).toBeGreaterThanOrEqual(2);
      for (const c of e.choices!) {
        for (const v of [c.food, c.materials, c.knowledge, c.stability, c.people]) expect(v ?? 0).toBeGreaterThanOrEqual(0);
        expect(c.label.length).toBeGreaterThan(2);
      }
    }
  });

  it('wait for the player and are visible, with an actionable Hearth badge', () => {
    const s = untilDecision();
    expect(s.pendingChoice).not.toBeNull();
    const vm = buildTimelineViewModel(s);
    expect(vm.decision?.options.length).toBeGreaterThanOrEqual(2);
    expect(vm.tabBadges.hearth).toBe(true);
  });

  it('apply the chosen gift once and clear the decision', () => {
    const s = untilDecision();
    const def = EVENTS.find((e) => e.id === s.pendingChoice!.eventId)!;
    const before = { ...s.resources };
    const r = executeAction(s, { type: 'RESOLVE_CHOICE', index: 0 });
    expect(r.success).toBe(true);
    expect(r.state.pendingChoice).toBeNull();
    const c = def.choices![0];
    if (c.knowledge) expect(r.state.resources.knowledge).toBeGreaterThan(before.knowledge);
    if (c.food) expect(r.state.resources.food).toBeGreaterThan(before.food);
    expect(executeAction(r.state, { type: 'RESOLVE_CHOICE', index: 0 }).success).toBe(false);
    expect(executeAction(s, { type: 'RESOLVE_CHOICE', index: 99 }).success).toBe(false);
  });

  it('are settled with the first option if ignored, so absence never costs anything', () => {
    const start = untilDecision();
    const away = fastForward(start, 6000).state;
    expect(away.resources.food).toBeGreaterThanOrEqual(start.resources.food);
    expect(away.resources.knowledge).toBeGreaterThanOrEqual(start.resources.knowledge);
    expect(away.logs.concat(start.logs).some((l) => l.text.includes('in your absence')) || away.pendingChoice !== start.pendingChoice).toBe(true);
  });
});
