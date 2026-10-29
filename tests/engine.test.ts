import { describe, expect, it } from 'vitest';
import { ripe } from './helpers.js';
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
    expect(state.timelineId).toBe('timeline_1337_0');
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
    expect(runA).toEqual(runB);
  });

  it('resolves repeated manual actions immediately without a click throttle', () => {
    const state = createInitialState();
    const first = executeAction(state, { type: 'FORAGE' });
    expect(first.success).toBe(true);
    const repeated = executeAction(first.state, { type: 'FORAGE' });
    expect(repeated.success).toBe(true);
    expect(repeated.state.resources.food).toBe(first.state.resources.food + 3);
  });

  it('reaches Settled Camp with a named deterministic opening sequence', () => {
    let state = createInitialState({ seed: 7 });
    const action = (next: Parameters<typeof executeAction>[1]) => {
      const result = executeAction(state, next);
      expect(result.success, `${JSON.stringify(next)}: ${result.error ?? 'ok'}`).toBe(true);
      state = result.state;
    };
    const tick = () => action({ type: 'TICK' });

    // The Hearth-to-Camp route: rapid manual agency followed by natural timeline progression.
    // Reach Gathering Band requirements: Year 2, Knowledge 12, Food 12.
    for (let i = 0; i < 8; i += 1) {
      action({ type: 'STUDY' });
      action({ type: 'FORAGE' });
    }
    // Advance time to Year 2 (4 ticks = 1 year)
    for (let i = 0; i < 4; i += 1) {
      tick();
    }
    action({ type: 'ADVANCE_RUNG', rungId: 'band' });
    expect(state.rung).toBe('band');

    // At Band rung: gather resources, build a hut, gather materials for Settled Camp (15 Mats, 20 Knw, 1 Hut, Year 4)
    for (let i = 0; i < 8; i += 1) {
      action({ type: 'SCAVENGE' });
      action({ type: 'FORAGE' });
    }
    action({ type: 'BUILD', buildingId: 'hut' });
    expect(state.buildings.hut).toBe(1);

    for (let i = 0; i < 14; i += 1) {
      action({ type: 'SCAVENGE' });
      action({ type: 'STUDY' });
      action({ type: 'FORAGE' });
    }
    // Advance to Year 4
    while (state.year < 4) {
      tick();
    }
    action({ type: 'ADVANCE_RUNG', rungId: 'settlement' });
    expect(state.rung).toBe('settlement');
    expect(state.tick).toBeLessThanOrEqual(50);
  });

  it('handles manual FORAGE, SCAVENGE, and STUDY actions cleanly within caps', () => {
    let state = createInitialState();
    const initialFood = state.resources.food;
    const initialMats = state.resources.materials;
    const initialKnw = state.resources.knowledge;

    // FORAGE yields pure food
    const forageRes = executeAction(state, { type: 'FORAGE' });
    expect(forageRes.success).toBe(true);
    expect(forageRes.state.resources.food).toBe(initialFood + 3.0);
    expect(forageRes.state.resources.materials).toBe(initialMats);

    // SCAVENGE yields materials
    const scavengeRes = executeAction(state, { type: 'SCAVENGE' });
    expect(scavengeRes.success).toBe(true);
    expect(scavengeRes.state.resources.materials).toBe(initialMats + 1.5);
    expect(scavengeRes.state.resources.food).toBe(initialFood);

    // STUDY yields knowledge
    const studyRes = executeAction(state, { type: 'STUDY' });
    expect(studyRes.success).toBe(true);
    expect(studyRes.state.resources.knowledge).toBe(initialKnw + 1.5);
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
    expect(prematureJump.error).toContain('Year 30');

    // Fast-forward to Year 30 in a village with high knowledge
    state.year = 30;
    state.furthestYear = 30;
    state.rung = 'village';
    state.resources.knowledge = 85;

    const expectedInsight = calculateTimeJumpInsight(state);
    expect(expectedInsight).toBeGreaterThan(0);

    const jumpRes = executeAction(state, { type: 'TIME_JUMP' });
    expect(jumpRes.success).toBe(true);

    const nextTimeline = jumpRes.state;
    expect(nextTimeline.year).toBe(1);
    expect(nextTimeline.tick).toBe(0);
    expect(nextTimeline.furthestYear).toBe(30);
    expect(nextTimeline.timelinesCreated).toBe(1);
    expect(nextTimeline.insight).toBe(expectedInsight);
    expect(nextTimeline.rung).toBe('hearth');
    // Insight bonus should have increased starting food
    expect(nextTimeline.resources.food).toBeGreaterThan(12);
    expect(nextTimeline.seed).toBe(state.seed);
    expect(nextTimeline.timelineId).toBe('timeline_1337_1');
  });

  it('expands knowledge capacity through Workshop and Chronicle Obelisk to unlock Dawn Village', () => {
    let state = createInitialState();
    state.rung = 'settlement';
    state.year = 8;
    state.furthestYear = 8;
    state.buildings.granary = 1;
    state.buildings.hut = 2;
    state.population.total = 6;
    state.caps = {
      ...state.caps,
      food: 30 + 1 * 50,
    };
    state.population.max = 2 + 2 * 2;

    // Base knowledge cap without workshop or obelisk is 20
    expect(state.caps.knowledge).toBe(20);

    // Verify Chronicle Obelisk is unlocked at Settled Camp with reachable base cost
    expect(BUILDINGS.chronicle_stone.unlockedAt).toBe('settlement');
    expect(BUILDINGS.chronicle_stone.baseCost.materials).toBe(30);
    expect(BUILDINGS.chronicle_stone.baseCost.knowledge).toBe(15);

    // Building Workshop expands materials cap by +40 and knowledge cap by +10
    state.resources.materials = 25;
    state.resources.knowledge = 10;
    const buildWorkshop = executeAction(state, { type: 'BUILD', buildingId: 'workshop' });
    expect(buildWorkshop.success).toBe(true);
    state = buildWorkshop.state;
    expect(state.buildings.workshop).toBe(1);
    expect(state.caps.materials).toBe(65);
    expect(state.caps.knowledge).toBe(30);

    // Building Chronicle Obelisk costs 30 mats and 15 knowledge, expanding knowledge cap to 60
    state.resources.materials = 30;
    state.resources.knowledge = 15;
    const buildObelisk = executeAction(state, { type: 'BUILD', buildingId: 'chronicle_stone' });
    expect(buildObelisk.success).toBe(true);
    state = buildObelisk.state;
    expect(state.buildings.chronicle_stone).toBe(1);
    expect(state.caps.knowledge).toBe(60);

    // Check Dawn Village prerequisites
    state.resources.knowledge = 60;
    const prereqCheck = checkRungPrerequisites(state, 'village');
    expect(prereqCheck.eligible).toBe(true);
    expect(prereqCheck.reasons).toHaveLength(0);

    // Advance to Dawn Village
    const advanceVillage = executeAction(state, { type: 'ADVANCE_RUNG', rungId: 'village' });
    expect(advanceVillage.success).toBe(true);
    state = advanceVillage.state;
    expect(state.rung).toBe('village');
    // Dawn Village provides +50 knowledge cap bonus
    expect(state.caps.knowledge).toBe(110);

    // Assign healer (unlocked at Dawn Village)
    state.population.roles.unassigned = 1;
    const assignHealer = executeAction(state, { type: 'ASSIGN_ROLE', role: 'healer', delta: 1 });
    expect(assignHealer.success).toBe(true);
    expect(assignHealer.state.population.roles.healer).toBe(1);
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

describe('Number only goes up', () => {
  it('never decreases any resource or population across idle ticks, even when overstaffed', () => {
    let state = createInitialState();
    state = { ...state, rung: 'village', population: { ...state.population, total: 8, max: 8, roles: { unassigned: 0, forager: 0, scholar: 2, healer: 2, builder: 4 } } };
    for (let i = 0; i < 200; i++) {
      const rates = calculateNetRates(state);
      expect(Math.min(rates.food, rates.materials, rates.knowledge, rates.stability)).toBeGreaterThanOrEqual(0);
      const next = stepTick(state);
      expect(next.resources.food).toBeGreaterThanOrEqual(state.resources.food);
      expect(next.resources.materials).toBeGreaterThanOrEqual(state.resources.materials);
      expect(next.resources.knowledge).toBeGreaterThanOrEqual(state.resources.knowledge);
      expect(next.resources.stability).toBeGreaterThanOrEqual(state.resources.stability);
      expect(next.population.total).toBeGreaterThanOrEqual(state.population.total);
      state = next;
    }
  });
});
