import { describe, expect, it } from 'vitest';
import { CHALLENGES } from '../src/engine/challenges.js';
import { createInitialState, executeAction, stepTick } from '../src/engine/engine.js';
import { RELICS } from '../src/engine/relics.js';
import { TimelineState } from '../src/engine/types.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';

const veteran = (patch: Partial<TimelineState> = {}): TimelineState => ({
  ...createInitialState(),
  prestigeCounts: { 1: 1, 2: 0, 3: 0, 4: 0 },
  tick: 40,
  year: 11,
  ...patch,
});

describe('challenges', () => {
  it('each has a real trophy that is never found in events', () => {
    for (const c of CHALLENGES) {
      const trophy = RELICS.find((r) => r.id === c.reward);
      expect(trophy?.trophyOf).toBe(c.id);
    }
  });

  it('open only after a first Time Jump, and start a fresh timeline with permanent bonuses intact', () => {
    expect(executeAction(createInitialState(), { type: 'START_CHALLENGE', challengeId: 'lone_hearth' }).success).toBe(false);
    const s = veteran({ insight: 30, relics: ['whetstone'], achievements: ['rung_band'], features: ['ancestral_hands'] });
    const r = executeAction({ ...s, rung: 'village', year: 9, tick: 32 }, { type: 'START_CHALLENGE', challengeId: 'lone_hearth' });
    expect(r.success).toBe(true);
    expect(r.state.challenge).toBe('lone_hearth');
    expect(r.state.rung).toBe('hearth');
    expect(r.state.insight).toBeGreaterThan(30); // the ended run pays out like a Time Jump
    expect(r.state.relics).toEqual(['whetstone']);
    expect(r.state.features).toEqual(['ancestral_hands']);
    expect(r.state.achievements).toContain('rung_band');
    expect(executeAction(r.state, { type: 'START_CHALLENGE', challengeId: 'swift_dawn' }).success).toBe(false);
  });

  it('forbid the restricted roles and buildings, including for automation', () => {
    let s = executeAction(veteran(), { type: 'START_CHALLENGE', challengeId: 'lone_hearth' }).state;
    s = { ...s, rung: 'band', features: ['ancestral_hands'] };
    expect(executeAction(s, { type: 'ASSIGN_ROLE', role: 'forager', delta: 1 }).success).toBe(false);
    expect(executeAction(s, { type: 'ASSIGN_ROLE', role: 'builder', delta: 1 }).success).toBe(true);
    s.population.roles = { ...s.population.roles, unassigned: 4 };
    s.population.total = 5;
    expect(stepTick(s).population.roles.forager).toBe(0);

    const cold = executeAction(veteran(), { type: 'START_CHALLENGE', challengeId: 'cold_resolve' }).state;
    const rich: TimelineState = { ...cold, rung: 'settlement', resources: { ...cold.resources, materials: 100, food: 100, knowledge: 100 }, caps: { food: 200, materials: 200, knowledge: 200 } };
    const built = executeAction(rich, { type: 'BUILD', buildingId: 'fire_pit' });
    expect(built.success).toBe(false);
    expect(built.error).toContain('Cold Resolve');
    expect(executeAction({ ...rich, features: ['steward'] }, { type: 'TICK' }).state.buildings.fire_pit).toBe(0);
  });

  it('award the trophy once the goal is reached, and the trophy survives prestige', () => {
    let s = executeAction(veteran({ tick: 60, year: 16 }), { type: 'START_CHALLENGE', challengeId: 'lone_hearth' }).state;
    s = { ...s, rung: 'village', tick: 8, year: 3 };
    s = stepTick(s);
    expect(s.challenge).toBeNull();
    expect(s.relics).toContain('hermits_lantern');
    expect(s.logs.some((l) => l.text.includes('Challenge complete'))).toBe(true);
    const jumped = executeAction({ ...s, year: 9 }, { type: 'TIME_JUMP' }).state;
    expect(jumped.relics).toContain('hermits_lantern');
    expect(executeAction(jumped, { type: 'START_CHALLENGE', challengeId: 'lone_hearth' }).success).toBe(false);
  });

  it('end quietly, with nothing lost, when a time limit passes or when abandoned', () => {
    let s = executeAction(veteran(), { type: 'START_CHALLENGE', challengeId: 'swift_dawn' }).state;
    const before = { ...s.resources };
    s = stepTick({ ...s, tick: 48, year: 13 });
    expect(s.challenge).toBeNull();
    expect(s.relics).not.toContain('swift_sandals');
    expect(s.resources.food).toBeGreaterThanOrEqual(before.food);
    expect(s.logs.some((l) => l.text.includes('Nothing is lost'))).toBe(true);

    let t = executeAction(veteran(), { type: 'START_CHALLENGE', challengeId: 'quiet_scholars' }).state;
    t = executeAction(t, { type: 'ABANDON_CHALLENGE' }).state;
    expect(t.challenge).toBeNull();
    expect(executeAction(t, { type: 'ABANDON_CHALLENGE' }).success).toBe(false);
  });

  it('show their status in the view model and on the goal card', () => {
    expect(buildTimelineViewModel(createInitialState()).challenges.every((c) => c.status === 'locked')).toBe(true);
    const active = executeAction(veteran(), { type: 'START_CHALLENGE', challengeId: 'quiet_scholars' }).state;
    const vm = buildTimelineViewModel(active);
    expect(vm.challenges.find((c) => c.id === 'quiet_scholars')?.status).toBe('active');
    expect(vm.goal.title).toContain('Quiet Scholars');
  });
});

describe('challenge starts behave like Time Jumps', () => {
  it('announce functions they send back', () => {
    const s = veteran({ prestigeCounts: { 1: 2, 2: 0, 3: 0, 4: 0 } });
    const r = executeAction(s, { type: 'START_CHALLENGE', challengeId: 'swift_dawn' });
    expect(r.state.features).toContain('seasoned_memory');
    expect(r.state.logs.some((l) => l.text.includes('Seasoned Memory'))).toBe(true);
  });
});
