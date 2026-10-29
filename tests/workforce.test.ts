import { describe, expect, it } from 'vitest';
import { createInitialState, executeAction, normalizeState, stepTick } from '../src/engine/engine.js';
import { openJobs, workerSlots } from '../src/engine/rules.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';
import type { TimelineState } from '../src/engine/types.js';

const band = (total: number): TimelineState => {
  const s = createInitialState();
  return { ...s, rung: 'band', population: { ...s.population, total, max: Math.max(total, s.population.max), roles: { ...s.population.roles, unassigned: total } } };
};

describe('only half of a society works', () => {
  it('rounds down: 12 give 6 jobs, 13 give 6, 14 give 7', () => {
    expect([12, 13, 14, 15, 1].map(workerSlots)).toEqual([6, 6, 7, 7, 0]);
  });

  it('refuses a seventh worker among twelve and says why', () => {
    let s = band(12);
    s = executeAction(s, { type: 'ASSIGN_ROLE', role: 'forager', delta: 6 }).state;
    expect(openJobs(s.population)).toBe(0);
    const r = executeAction(s, { type: 'ASSIGN_ROLE', role: 'builder', delta: 1 });
    expect(r.success).toBe(false);
    expect(r.error).toContain('half');
    expect(buildTimelineViewModel(s).tabBadges.levels['hearth.roles']).toBeUndefined();
    expect(buildTimelineViewModel(s).population.jobs).toEqual({ total: 6, taken: 6, open: 0 });
  });

  it('opens a job for every second person who joins, and lets workers be moved freely', () => {
    let s = band(12);
    s = executeAction(s, { type: 'ASSIGN_ROLE', role: 'forager', delta: 6 }).state;
    s = { ...s, population: { ...s.population, total: 14, roles: { ...s.population.roles, unassigned: 8 } } };
    expect(openJobs(s.population)).toBe(1);
    expect(executeAction(s, { type: 'ASSIGN_ROLE', role: 'builder', delta: 1 }).success).toBe(true);
    const freed = executeAction(s, { type: 'ASSIGN_ROLE', role: 'forager', delta: -2 }).state;
    expect(openJobs(freed.population)).toBe(3);
  });

  it('keeps the helping hands within the jobs, and never takes jobs away from an older save', () => {
    const s: TimelineState = { ...band(12), features: ['ancestral_hands'] };
    const after = stepTick(s);
    expect(after.population.roles.forager + after.population.roles.builder).toBe(6);
    expect(after.population.roles.unassigned).toBe(6);
    const old = normalizeState({ ...band(12), population: { total: 12, max: 12, roles: { unassigned: 0, forager: 12, builder: 0, scholar: 0, healer: 0 } } });
    expect(old.population.roles.forager).toBe(12);
    expect(executeAction(old, { type: 'ASSIGN_ROLE', role: 'forager', delta: -1 }).success).toBe(true);
  });
});
