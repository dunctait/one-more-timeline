import { describe, expect, it } from 'vitest';
import { createInitialState, executeAction, normalizeState, stepTick } from '../src/engine/engine.js';
import { TimelineState } from '../src/engine/types.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';

describe('lifetime stats', () => {
  it('count time, gathers, builds, research and trades, and only ever go up', () => {
    let s: TimelineState = { ...createInitialState(), rung: 'town', caps: { food: 80, materials: 75, knowledge: 120 } };
    s.resources = { ...s.resources, food: 70, materials: 30, knowledge: 100 };
    s = executeAction(s, { type: 'FORAGE' }).state;
    s = executeAction(s, { type: 'STUDY' }).state;
    s = executeAction(s, { type: 'BUILD', buildingId: 'hut' }).state;
    s = executeAction(s, { type: 'RESEARCH', discoveryId: 'fire_hardening' }).state;
    s = executeAction(s, { type: 'BARTER', from: 'food', to: 'materials', amount: 30 }).state;
    s = stepTick(s);
    s = executeAction(s, { type: 'TICK' }).state;
    expect(s.stats).toEqual({ ticks: 2, gathers: 2, built: 1, researched: 1, traded: 1 });
    const failed = executeAction(s, { type: 'BUILD', buildingId: 'wonder_of_ages' });
    expect(failed.success).toBe(false);
    expect(failed.state.stats).toEqual(s.stats);
  });

  it('survive Time Jumps and prestige', () => {
    let s: TimelineState = { ...createInitialState(), tick: 40, year: 11 };
    s = { ...s, stats: { ticks: 500, gathers: 40, built: 12, researched: 3, traded: 2 } };
    const jumped = executeAction(s, { type: 'TIME_JUMP' }).state;
    expect(jumped.stats).toEqual(s.stats);
    const epoch = executeAction({ ...s, rung: 'realm', year: 70, insight: 120 }, { type: 'PRESTIGE', tier: 2 }).state;
    expect(epoch.stats).toEqual(s.stats);
  });

  it('are sanitised on load, derive time from old saves, and show in the records', () => {
    const old = { ...createInitialState(), tick: 80, stats: undefined } as unknown as TimelineState;
    expect(normalizeState(old).stats.ticks).toBe(80);
    const bad = { ...createInitialState(), stats: { ticks: 'x', gathers: -4, built: 2.9 } } as unknown as TimelineState;
    expect(normalizeState(bad).stats).toEqual({ ticks: 0, gathers: 0, built: 2, researched: 0, traded: 0 });
    const vm = buildTimelineViewModel({ ...createInitialState(), stats: { ticks: 3725, gathers: 9, built: 4, researched: 1, traded: 0 } });
    expect(vm.records.find((r) => r.label === 'Time lived')?.value).toBe('1h 2m');
  });

  it('drive achievements', async () => {
    const { findNewAchievements } = await import('../src/engine/achievements.js');
    const s = createInitialState();
    expect(findNewAchievements(s).map((a) => a.id)).not.toContain('gathers_500');
    const big = { ...s, stats: { ticks: 7200, gathers: 500, built: 250, researched: 0, traded: 25 } };
    const ids = findNewAchievements(big).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['gathers_500', 'ticks_7200', 'built_250', 'traded_25']));
  });
});
