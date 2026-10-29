import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/engine/engine.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';

describe('current goal', () => {
  it('points a new player at the first rung with plain steps', () => {
    const vm = buildTimelineViewModel(createInitialState());
    expect(vm.goal.title).toContain('Gathering Band');
    expect(vm.goal.steps.length).toBeGreaterThan(0);
    expect(vm.goal.ready).toBe(false);
  });

  it('sends the player to Settlement when buildings are missing', () => {
    const s = { ...createInitialState(), rung: 'band' as const, year: 9 };
    s.resources = { ...s.resources, knowledge: 30, materials: 30 };
    const vm = buildTimelineViewModel(s);
    expect(vm.goal.tab).toBe('settlement');
    expect(vm.goal.steps.join(' ')).toContain('Thatched Hut');
  });

  it('announces a ready rung and a ready prestige tier', () => {
    const base = createInitialState();
    const realm = { ...base, rung: 'realm' as const, year: 70, insight: 120 };
    const vm = buildTimelineViewModel(realm);
    expect(vm.goal.ready).toBe(true);
    expect(vm.goal.title).toContain('Epoch Shift');
    const early = buildTimelineViewModel({ ...realm, insight: 0 });
    expect(early.goal.ready).toBe(false);
    expect(early.goal.steps.join(' ')).toContain('Insight');
  });
});

describe('records and history', () => {
  it('records each ended timeline, newest first, capped at twelve', async () => {
    const { executeAction } = await import('../src/engine/engine.js');
    let s = createInitialState();
    for (let i = 0; i < 14; i++) {
      s = executeAction({ ...s, year: 5 + i }, { type: 'TIME_JUMP' }).state;
    }
    expect(s.history).toHaveLength(12);
    expect(s.history[0].number).toBe(14);
    expect(s.history[0].year).toBe(18);
    expect(s.history[0].gained).toContain('Insight');
    const vm = buildTimelineViewModel(s);
    expect(vm.history[0].label).toContain('#14 Time Jump');
    expect(vm.records.find((r) => r.label === 'Time Jumps')?.value).toBe('14');
  });
});

describe('dev tools', () => {
  it('warp to a rung with matching storage, and add Insight', async () => {
    const { executeAction } = await import('../src/engine/engine.js');
    const warped = executeAction(createInitialState(), { type: 'DEV_SET_RUNG', rung: 'town' }).state;
    expect(warped.rung).toBe('town');
    expect(warped.caps.knowledge).toBeGreaterThan(100);
    expect(executeAction(warped, { type: 'DEV_ADD_INSIGHT', amount: 25 }).state.insight).toBe(25);
  });
});

describe('goal card follows the tier being worked toward', () => {
  it('points at Paradigm Shift once enough Echoes are banked for it', () => {
    const base = createInitialState();
    const early = buildTimelineViewModel({ ...base, rung: 'realm', year: 70, echoes: 2 });
    expect(early.goal.title).toContain('Epoch Shift');
    const later = buildTimelineViewModel({ ...base, rung: 'realm', year: 70, echoes: 8 });
    expect(later.goal.title).toContain('Paradigm Shift');
  });
});

describe('full storage', () => {
  it('is announced instead of showing a rate that does nothing', async () => {
    const { formatRateAtCap } = await import('../src/ui/view-model.js');
    expect(formatRateAtCap(2, 30, 30)).toBe('FULL');
    expect(formatRateAtCap(2, 12, 30)).toBe('+2.0/t');
    expect(formatRateAtCap(0, 30, 30)).toBe('0.0/t');
  });
});

describe('share text', () => {
  it('summarises progress without spoilers and grows with prestige', async () => {
    const { buildShareText } = await import('../src/ui/view-model.js');
    const s = createInitialState();
    expect(buildShareText(s)).toContain('Furthest year 1');
    expect(buildShareText(s)).not.toContain('Epoch');
    const later = { ...s, prestigeCounts: { 1: 4, 2: 2, 3: 0, 4: 0 } };
    expect(buildShareText(later)).toContain('2 Epoch Shifts');
  });
});

describe('next functions preview', () => {
  it('lists the closest unearned functions with what earns them', () => {
    const vm = buildTimelineViewModel(createInitialState());
    expect(vm.nextFeatures.length).toBeGreaterThan(0);
    expect(vm.nextFeatures.length).toBeLessThanOrEqual(3);
    expect(vm.nextFeatures[0].name).toBe('Ancestral Hands');
    expect(vm.nextFeatures[0].condition).toBe('1 more Time Jump');
    const later = buildTimelineViewModel({ ...createInitialState(), features: ['ancestral_hands'], prestigeCounts: { 1: 2, 2: 0, 3: 0, 4: 0 } });
    expect(later.nextFeatures.map((f) => f.name)).not.toContain('Ancestral Hands');
    expect(later.nextFeatures[0].condition).toContain('1 more');
  });
});

describe('compact numbers', () => {
  it('shorten big numbers and leave small ones alone', async () => {
    const { formatCompact } = await import('../src/ui/view-model.js');
    expect(formatCompact(0)).toBe('0');
    expect(formatCompact(999.9)).toBe('999');
    expect(formatCompact(1000)).toBe('1K');
    expect(formatCompact(1234)).toBe('1.2K');
    expect(formatCompact(2_500_000)).toBe('2.5M');
    expect(formatCompact(3_000_000_000)).toBe('3B');
  });
});

describe('goal time estimates', () => {
  it('format durations compactly', async () => {
    const { formatDuration } = await import('../src/ui/view-model.js');
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45.2)).toBe('46s');
    expect(formatDuration(100)).toBe('1m 40s');
    expect(formatDuration(3700)).toBe('1h 1m');
  });

  it('estimate the year, and resources from the current rate', () => {
    const s = { ...createInitialState(), rung: 'band' as const, tick: 8, year: 3 };
    s.population.roles = { ...s.population.roles, scholar: 0, builder: 4, forager: 0, unassigned: 0 };
    s.population.total = 4;
    const vm = buildTimelineViewModel(s);
    const steps = vm.goal.steps.join(' | ');
    expect(steps).toMatch(/Year: 3\/4 \(about \d+s\)/);
    expect(steps).toMatch(/Knowledge: \d+\/20 \(gather by hand or assign people\)/);
  });
});
