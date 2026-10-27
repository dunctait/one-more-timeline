import { describe, expect, it } from 'vitest';
import { createInitialState, executeAction, stepTick } from '../src/engine/engine.js';
import { BUILDINGS, calculateNetRates, calculateTimeJumpInsight, checkRungPrerequisites, RUNGS } from '../src/engine/rules.js';

describe('Deterministic Engine', () => {
  it('creates a valid initial state', () => {
    const state = createInitialState();
    expect(state.year).toBe(1);
    expect(state.season).toBe('Spring');
    expect(state.furthestYear).toBe(1);
    expect(state.rung).toBe('hearth');
    expect(state.resources.food).toBeGreaterThan(0);
    expect(state.population.total).toBe(1);
    expect(state.population.roles.unassigned).toBe(1);
  });

  it('runs deterministic ticks identically from identical initial state', () => {
    const stateA = createInitialState({ seed: 42 });
    const stateB = createInitialState({ seed: 42 });

    let runA = stateA;
    let runB = stateB;

    for (let i = 0; i < 20; i++) {
      runA = stepTick(runA);
      runB = stepTick(runB);
    }

    expect(runA.tick).toBe(20);
    expect(runA.year).toBe(6);
    expect(runA.season).toBe('Spring');
    expect(runA.resources).toEqual(runB.resources);
    expect(runA.population).toEqual(runB.population);
    expect(runA.furthestYear).toBe(runB.furthestYear);
  });

  it('handles manual FORAGE action cleanly within caps', () => {
    let state = createInitialState();
    const initialFood = state.resources.food;
    const initialMats = state.resources.materials;

    const res = executeAction(state, { type: 'FORAGE' });
    expect(res.success).toBe(true);
    expect(res.state.resources.food).toBeGreaterThan(initialFood);
    expect(res.state.resources.materials).toBeGreaterThanOrEqual(initialMats);
  });

  it('enforces role assignment rules based on rung and available population', () => {
    let state = createInitialState();

    // At Hearth rung, assigning forager should fail
    const invalidAssign = executeAction(state, {
      type: 'ASSIGN_ROLE',
      role: 'forager',
      delta: 1,
    });
    expect(invalidAssign.success).toBe(false);
    expect(invalidAssign.error).toContain('Gathering Band');

    // Advance to Band rung
    state.rung = 'band';
    state.population.roles.unassigned = 2;
    state.population.total = 2;

    const validAssign = executeAction(state, {
      type: 'ASSIGN_ROLE',
      role: 'forager',
      delta: 1,
    });
    expect(validAssign.success).toBe(true);
    expect(validAssign.state.population.roles.forager).toBe(1);
    expect(validAssign.state.population.roles.unassigned).toBe(1);

    // Cannot assign more than available unassigned pop
    const overAssign = executeAction(validAssign.state, {
      type: 'ASSIGN_ROLE',
      role: 'forager',
      delta: 5,
    });
    expect(overAssign.success).toBe(false);

    // Unassign role
    const unassign = executeAction(validAssign.state, {
      type: 'ASSIGN_ROLE',
      role: 'forager',
      delta: -1,
    });
    expect(unassign.success).toBe(true);
    expect(unassign.state.population.roles.forager).toBe(0);
    expect(unassign.state.population.roles.unassigned).toBe(2);
  });

  it('enforces building purchases, resource deductions, and cap expansions', () => {
    let state = createInitialState();
    state.rung = 'band';
    state.resources.materials = 5;
    state.resources.food = 10;

    // Not enough materials for a Hut (costs 10 materials)
    const failBuild = executeAction(state, { type: 'BUILD', buildingId: 'hut' });
    expect(failBuild.success).toBe(false);
    expect(failBuild.error).toContain('Materials');

    // Give enough materials
    state.resources.materials = 20;
    const initialPopMax = state.population.max;

    const successBuild = executeAction(state, { type: 'BUILD', buildingId: 'hut' });
    expect(successBuild.success).toBe(true);
    expect(successBuild.state.buildings.hut).toBe(1);
    expect(successBuild.state.resources.materials).toBe(10);
    expect(successBuild.state.population.max).toBe(initialPopMax + 2);
  });

  it('validates rung advancement prerequisites', () => {
    const state = createInitialState();

    // Hearth -> Band requires Year 2, Knowledge 15, Food 15
    const check1 = checkRungPrerequisites(state, 'band');
    expect(check1.eligible).toBe(false);

    state.year = 2;
    state.resources.knowledge = 15;
    state.resources.food = 15;

    const check2 = checkRungPrerequisites(state, 'band');
    expect(check2.eligible).toBe(true);

    const advanceRes = executeAction(state, { type: 'ADVANCE_RUNG', rungId: 'band' });
    expect(advanceRes.success).toBe(true);
    expect(advanceRes.state.rung).toBe('band');
  });

  it('executes TIME_JUMP prestige action, grants Insight, and preserves Furthest Year', () => {
    let state = createInitialState();

    // Cannot time jump before Year 3
    state.year = 2;
    const prematureJump = executeAction(state, { type: 'TIME_JUMP' });
    expect(prematureJump.success).toBe(false);
    expect(prematureJump.error).toContain('Year 3');

    // Fast-forward to Year 8 with high knowledge
    state.year = 8;
    state.furthestYear = 8;
    state.rung = 'settlement';
    state.resources.knowledge = 85;

    const expectedInsight = calculateTimeJumpInsight(state);
    expect(expectedInsight).toBeGreaterThan(0);

    const jumpRes = executeAction(state, { type: 'TIME_JUMP' });
    expect(jumpRes.success).toBe(true);

    const nextTimeline = jumpRes.state;
    expect(nextTimeline.year).toBe(1);
    expect(nextTimeline.tick).toBe(0);
    expect(nextTimeline.furthestYear).toBe(8);
    expect(nextTimeline.timelinesCreated).toBe(1);
    expect(nextTimeline.insight).toBe(expectedInsight);
    expect(nextTimeline.rung).toBe('hearth');
    // Insight bonus should have increased starting food
    expect(nextTimeline.resources.food).toBeGreaterThan(12);
  });

  it('supports dev mode actions', () => {
    const state = createInitialState();
    const addRes = executeAction(state, { type: 'DEV_ADD_RESOURCES', amount: 50 });
    expect(addRes.success).toBe(true);
    expect(addRes.state.resources.food).toBe(state.caps.food);

    const warpYear = executeAction(state, { type: 'DEV_SET_YEAR', year: 25 });
    expect(warpYear.success).toBe(true);
    expect(warpYear.state.year).toBe(25);
    expect(warpYear.state.furthestYear).toBe(25);

    const reset = executeAction(warpYear.state, { type: 'DEV_RESET' });
    expect(reset.success).toBe(true);
    expect(reset.state.year).toBe(1);
  });
});
