import { describe, expect, it } from 'vitest';
import { createInitialState, executeAction, fastForward, normalizeState, stepTick } from '../src/engine/engine.js';
import { eventScale } from '../src/engine/events.js';
import { TimelineState } from '../src/engine/types.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';

const at = (patch: Partial<TimelineState>): TimelineState => ({
  ...createInitialState({ seed: 11 }),
  caps: { food: 500, materials: 500, knowledge: 500 },
  ...patch,
});

describe('tales: timeless events that wait', () => {
  it('sit on the shelf until picked up, however long that takes', () => {
    const s = at({ rung: 'village', waitingEvents: [{ eventId: 'wandering_family', tick: 1 }] });
    let later = s;
    for (let i = 0; i < 2000; i++) later = stepTick(later, { quiet: true });
    expect(later.waitingEvents.some((w) => w.eventId === 'wandering_family')).toBe(true);
    const r = executeAction(later, { type: 'RESOLVE_TALE', eventId: 'wandering_family', index: 1 });
    expect(r.success).toBe(true);
    expect(r.state.waitingEvents.some((w) => w.eventId === 'wandering_family')).toBe(false);
    expect(r.state.stats.events).toBe(1);
  });

  it('pay a shown cost out of what the player holds, never below zero, and gain scaled amounts', () => {
    const s = at({ rung: 'band', waitingEvents: [{ eventId: 'night_hunters', tick: 1 }] });
    s.resources = { ...s.resources, materials: 2, food: 10 };
    const r = executeAction(s, { type: 'RESOLVE_TALE', eventId: 'night_hunters', index: 0 }).state;
    expect(r.resources.materials).toBe(0);
    expect(r.resources.food).toBeCloseTo(10 + 18 * eventScale(1, 'band'), 5);
  });

  it('refuse a tale that is not waiting or a choice that does not exist', () => {
    const s = at({ rung: 'band', waitingEvents: [{ eventId: 'berry_groves', tick: 1 }] });
    expect(executeAction(s, { type: 'RESOLVE_TALE', eventId: 'old_songs', index: 0 }).success).toBe(false);
    expect(executeAction(s, { type: 'RESOLVE_TALE', eventId: 'berry_groves', index: 9 }).success).toBe(false);
  });

  it('show on the Events page with icon chips, a NEW pill the first time and a ring afterwards', () => {
    const s = at({ rung: 'band', waitingEvents: [{ eventId: 'night_hunters', tick: 1 }] });
    const vm = buildTimelineViewModel(s);
    expect(vm.disclosure.events).toBe(true);
    expect(vm.tales[0].options[0].chips.some((c) => c.cost)).toBe(true);
    expect(vm.tabBadges.levels['hearth.events']).toEqual({ novel: 1, available: 0 });
    const later = buildTimelineViewModel({ ...s, stats: { ...s.stats, events: 3 } });
    expect(later.tabBadges.levels['hearth.events']).toEqual({ novel: 0, available: 1 });
    expect(buildTimelineViewModel(at({ rung: 'band' })).disclosure.events).toBe(false);
  });

  it('survive saving and loading, and drop anything unknown', () => {
    const s = at({ rung: 'band', waitingEvents: [{ eventId: 'berry_groves', tick: 1 }, { eventId: 'nope', tick: 2 }] });
    const loaded = normalizeState(JSON.parse(JSON.stringify(s)));
    expect(loaded.waitingEvents.map((w) => w.eventId)).toEqual(['berry_groves']);
  });
});

describe('urgent events: the lesser evil, with the timeline stopped', () => {
  it('stop the timeline until answered', () => {
    const s = at({ rung: 'village', pendingChoice: { eventId: 'raiders_on_the_ridge', tick: 5 } });
    expect(stepTick(s)).toBe(s);
    expect(fastForward(s, 500).state.tick).toBe(s.tick);
  });

  it('take the chosen price once, never below zero, and let time run again', () => {
    const s = at({ rung: 'village', pendingChoice: { eventId: 'raiders_on_the_ridge', tick: 5 } });
    s.resources = { ...s.resources, food: 10, materials: 100 };
    const r = executeAction(s, { type: 'RESOLVE_CHOICE', index: 0 });
    expect(r.success).toBe(true);
    expect(r.state.resources.food).toBe(0);
    expect(r.state.resources.materials).toBe(100);
    expect(r.state.pendingChoice).toBeNull();
    expect(stepTick(r.state).tick).toBe(s.tick + 1);
    expect(executeAction(r.state, { type: 'RESOLVE_CHOICE', index: 0 }).success).toBe(false);
  });

  it('never arrive while the player is away, so absence costs nothing', () => {
    const start = at({ rung: 'realm' });
    start.resources = { ...start.resources, food: 100, materials: 100, knowledge: 100 };
    const away = fastForward(start, 20000).state;
    expect(away.pendingChoice).toBeNull();
    expect(away.resources.food).toBeGreaterThanOrEqual(start.resources.food);
    expect(away.resources.materials).toBeGreaterThanOrEqual(start.resources.materials);
  });

  it('are shown in a modal view-model with priced options', () => {
    const vm = buildTimelineViewModel(at({ rung: 'village', pendingChoice: { eventId: 'raiders_on_the_ridge', tick: 5 } }));
    expect(vm.urgent?.options.length).toBe(3);
    expect(vm.urgent?.options.every((o) => o.chips.some((c) => c.cost))).toBe(true);
  });
});
