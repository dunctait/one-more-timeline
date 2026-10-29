import { describe, expect, it } from 'vitest';
import { ripe } from './helpers.js';
import { createInitialState, executeAction, normalizeState } from '../src/engine/engine.js';
import { insightStartBonus } from '../src/engine/rules.js';
import { TimelineState } from '../src/engine/types.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';

describe('Jumpback copy matches what the engine grants', () => {
  it('caps the starting bonus exactly as stated', () => {
    expect(insightStartBonus(5)).toEqual({ food: 10, materials: 5, knowledge: 2 });
    expect(insightStartBonus(100)).toEqual({ food: 20, materials: 15, knowledge: 50 });
    const s = createInitialState({ insight: 100 });
    expect(s.resources.food).toBe(32); // 12 + 20, within the 60 Food storage
    expect(s.resources.materials).toBe(21);
    const vm = buildTimelineViewModel({ ...createInitialState(), insight: 100 });
    expect(vm.timeJump.breakdown.currentStartingFood).toBe(20);
    expect(vm.timeJump.breakdown.startingBonus).toContain('up to +20 Food');
  });
});

describe('navigation badges point at attention-required work', () => {
  it('do not flag people nobody can assign yet', () => {
    expect(buildTimelineViewModel(createInitialState()).tabBadges.hearth).toBe(false);
    const band: TimelineState = { ...createInitialState(), rung: 'band' };
    expect(buildTimelineViewModel(band).tabBadges.hearth).toBe(true);
  });

  it('flag Jumpback for a first jump or the climax, not forever', () => {
    const base: TimelineState = { ...createInitialState(), tick: 40, year: 11 };
    expect(buildTimelineViewModel(ripe(base)).tabBadges.evolution).toBe(true);
    const veteran: TimelineState = { ...ripe(base), prestigeCounts: { 1: 3, 2: 0, 3: 0, 4: 0 } };
    expect(buildTimelineViewModel(veteran).tabBadges.evolution).toBe(false);
    expect(buildTimelineViewModel({ ...veteran, rung: 'realm' }).tabBadges.evolution).toBe(true);
  });
});

describe('role and trade validation', () => {
  it('only moves a whole number of people', () => {
    const s: TimelineState = { ...createInitialState(), rung: 'band' };
    expect(executeAction(s, { type: 'ASSIGN_ROLE', role: 'forager', delta: 0 }).success).toBe(false);
    expect(executeAction(s, { type: 'ASSIGN_ROLE', role: 'forager', delta: 0.5 }).success).toBe(false);
    expect(executeAction(s, { type: 'ASSIGN_ROLE', role: 'forager', delta: 1 }).success).toBe(true);
  });

  it('trades whole units so the preview equals the result', () => {
    const s = createInitialState();
    const town: TimelineState = {
      ...s,
      rung: 'town',
      caps: { food: 300, materials: 300, knowledge: 300 },
      resources: { ...s.resources, food: 100, materials: 0, knowledge: 0 },
    };
    const vm = buildTimelineViewModel(town);
    const offer = vm.market.rows.find((r) => r.from === 'materials' && r.to === 'knowledge')!;
    const r = executeAction({ ...town, resources: { ...town.resources, materials: 100 } }, {
      type: 'BARTER', from: 'materials', to: 'knowledge', amount: 30,
    });
    expect(r.state.resources.knowledge).toBe(offer.offers[0].gain);
    expect(Number.isInteger(r.state.resources.knowledge)).toBe(true);
  });
});

describe('imported saves are made sane', () => {
  it('fix roles, totals, resources above caps, and missing fields', () => {
    const s = createInitialState();
    const bad = {
      ...s,
      tick: 'x',
      year: 'later',
      season: 'Monsoon',
      resources: { food: 9999, materials: -5, knowledge: 'a' },
      population: { total: 99, max: 99, roles: { forager: -3, scholar: 2.7 } },
    } as unknown as TimelineState;
    const fixed = normalizeState(bad);
    expect(fixed.tick).toBe(0);
    expect(fixed.year).toBe(1);
    expect(['Spring', 'Summer', 'Autumn', 'Winter']).toContain(fixed.season);
    expect(fixed.resources.food).toBe(fixed.caps.food);
    expect(fixed.resources.materials).toBe(0);
    expect(fixed.population.roles.forager).toBe(0);
    expect(fixed.population.roles.scholar).toBe(2);
    expect(fixed.population.total).toBe(2);
    expect(Object.values(fixed.population.roles).every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
  });
});

describe('third review fixes', () => {
  it('drops malformed history and log entries instead of crashing the view', () => {
    const s = createInitialState();
    const bad = {
      ...s,
      history: [{ number: 1, tier: 9, year: 5, rung: 'nope', gained: 'x' }, { number: 2, tier: 1, year: 6, rung: 'town', gained: '+3 Insight' }, null],
      logs: [{ id: 1 }, null, { id: 'a', text: 'ok', tick: 0, year: 1, type: 'info' }],
    } as unknown as TimelineState;
    const fixed = normalizeState(bad);
    expect(fixed.history).toHaveLength(1);
    expect(fixed.history[0].rung).toBe('town');
    expect(fixed.logs).toHaveLength(1);
    expect(() => buildTimelineViewModel(fixed)).not.toThrow();
  });

  it('refuses a challenge the starting head start would complete instantly', () => {
    const base: TimelineState = { ...createInitialState(), prestigeCounts: { 1: 2, 2: 0, 3: 0, 4: 0 }, resonance: 3, tick: 40, year: 11 };
    const r = executeAction(ripe(base), { type: 'START_CHALLENGE', challengeId: 'lone_hearth' });
    expect(r.success).toBe(false);
    expect(r.error).toContain('head start');
    expect(buildTimelineViewModel(base).challenges.find((c) => c.id === 'lone_hearth')?.status).toBe('locked');
    expect(executeAction(ripe(base), { type: 'START_CHALLENGE', challengeId: 'quiet_scholars' }).success).toBe(true);
  });

  it('pays out the Insight of the ended run when a challenge begins', () => {
    const base: TimelineState = { ...createInitialState(), prestigeCounts: { 1: 1, 2: 0, 3: 0, 4: 0 }, rung: 'village', tick: 80, year: 21 };
    const r = executeAction(ripe(base), { type: 'START_CHALLENGE', challengeId: 'swift_dawn' });
    expect(r.success).toBe(true);
    expect(r.state.insight).toBeGreaterThan(0);
  });

  it('only clears real edict slots', () => {
    const s = createInitialState();
    expect(executeAction(s, { type: 'SET_EDICT', slot: 'bogus' as never, edictId: null }).success).toBe(false);
    expect(executeAction(s, { type: 'SET_EDICT', slot: 'hearth', edictId: null }).success).toBe(false);
  });
});

describe('fourth review fixes', () => {
  it('starting a challenge counts as a Jumpback and needs Year 3', () => {
    const early: TimelineState = { ...createInitialState(), prestigeCounts: { 1: 1, 2: 0, 3: 0, 4: 0 } };
    expect(executeAction(early, { type: 'START_CHALLENGE', challengeId: 'swift_dawn' }).success).toBe(false);
    const ready: TimelineState = { ...early, tick: 40, year: 11 };
    const r = executeAction(ripe(ready), { type: 'START_CHALLENGE', challengeId: 'swift_dawn' });
    expect(r.success).toBe(true);
    expect(r.state.prestigeCounts[1]).toBe(2);
    expect(r.state.history[0].gained).toContain('challenge');
  });

  it('automation keeps what the next rung needs instead of stalling progress', () => {
    const s: TimelineState = { ...createInitialState(), rung: 'band', features: ['steward'] };
    // The Settled Camp asks for 15 Materials and 20 Knowledge; there is only a little spare.
    s.resources = { ...s.resources, materials: 16, knowledge: 22, food: 20 };
    s.buildings.hut = 1;
    s.caps = { food: 100, materials: 100, knowledge: 100 };
    const after = executeAction(s, { type: 'TICK' }).state;
    expect(after.resources.materials).toBeGreaterThanOrEqual(15);
    expect(after.resources.knowledge).toBeGreaterThanOrEqual(20);
  });

  it('automation still builds the buildings the next rung requires', () => {
    // The Settled Camp requires a hut; the Steward builds it first even when that dips into the reserve.
    const s: TimelineState = { ...createInitialState(), rung: 'band', features: ['steward'] };
    s.resources = { ...s.resources, materials: 40, knowledge: 44, food: 20 };
    s.caps = { food: 100, materials: 100, knowledge: 100 };
    expect(executeAction(s, { type: 'TICK' }).state.buildings.hut).toBe(1);
  });

  it('old saves receive the functions their prestige counts already earned', () => {
    const s = createInitialState();
    const old = { ...s, timelinesCreated: 6, features: [], prestigeCounts: undefined } as unknown as TimelineState;
    const fixed = normalizeState(old);
    expect(fixed.features).toEqual(expect.arrayContaining(['steady_hands', 'ancestral_hands', 'seasoned_memory']));
  });

  it('an imported population cannot exceed the cap', () => {
    const s = createInitialState();
    const big = { ...s, population: { total: 9, max: 9, roles: { forager: 1_000_000, unassigned: 0, scholar: 0, healer: 0, builder: 0 } } } as unknown as TimelineState;
    const fixed = normalizeState(big);
    expect(fixed.population.total).toBe(fixed.population.max);
    expect(Object.values(fixed.population.roles).reduce((a, b) => a + b, 0)).toBe(fixed.population.max);
  });
});

describe('fifth review fixes', () => {
  it('rejects prototype keys as features and floors or caps building counts', () => {
    const s = createInitialState();
    const bad = { ...s, features: ['toString', 'constructor', 'steward'], buildings: { ...s.buildings, hut: 2.9, wonder_of_ages: 7 } } as unknown as TimelineState;
    const fixed = normalizeState(bad);
    expect(fixed.features).toEqual(['steward']);
    expect(fixed.buildings.hut).toBe(2);
    expect(fixed.buildings.wonder_of_ages).toBe(1);
  });

  it('drops a challenge whose trophy is already owned', () => {
    const s = { ...createInitialState(), challenge: 'swift_dawn', relics: ['swift_sandals'] } as TimelineState;
    expect(normalizeState(s).challenge).toBeNull();
    expect(normalizeState({ ...s, relics: [] }).challenge).toBe('swift_dawn');
  });

  it('a developer reset is a true reset, lifetime stats included', () => {
    const s = { ...createInitialState(), stats: { ticks: 9, gathers: 9, built: 9, researched: 9, traded: 9 } };
    expect(executeAction(s, { type: 'DEV_RESET' }).state.stats.ticks).toBe(0);
  });
});

describe('bulk assignment', () => {
  it('moves every idle person to a role in one action', () => {
    const s: TimelineState = { ...createInitialState(), rung: 'band' };
    s.population.total = 9;
    s.population.roles = { ...s.population.roles, unassigned: 9 };
    const r = executeAction(s, { type: 'ASSIGN_ROLE', role: 'forager', delta: 9 });
    expect(r.success).toBe(true);
    expect(r.state.population.roles.forager).toBe(9);
    expect(r.state.population.roles.unassigned).toBe(0);
    expect(r.state.logs.some((l) => l.text.includes('Assigned 9 forager'))).toBe(true);
  });
});

describe('sixth review fixes', () => {
  it('automation counts toward lifetime stats like manual play', () => {
    const s: TimelineState = { ...createInitialState(), rung: 'settlement', features: ['steward', 'apprentice_scholars'] };
    s.resources = { ...s.resources, materials: 90, food: 60, knowledge: 90 };
    s.caps = { food: 100, materials: 100, knowledge: 100 };
    const after = executeAction(s, { type: 'TICK' }).state;
    expect(after.stats.built + after.stats.researched).toBeGreaterThan(0);
  });

  it('a prestige acknowledges an unanswered decision and a running challenge', () => {
    const base: TimelineState = {
      ...createInitialState(),
      tick: 40,
      year: 11,
      pendingChoice: { eventId: 'lost_traveller', tick: 37 },
      challenge: 'swift_dawn',
      prestigeCounts: { 1: 1, 2: 0, 3: 0, 4: 0 },
    };
    const jumped = executeAction(ripe(base), { type: 'TIME_JUMP' }).state;
    expect(jumped.logs.some((l) => l.text.includes('went unanswered'))).toBe(true);
    expect(jumped.logs.some((l) => l.text.includes('ended with the timeline'))).toBe(true);
    expect(jumped.pendingChoice).toBeNull();
    expect(jumped.challenge).toBeNull();
  });

  it('Jumpback copy never promises more than the +50% Insight cap', async () => {
    const vm = buildTimelineViewModel(ripe({ ...createInitialState(), tick: 40, year: 11, insight: 80 }));
    expect(vm.timeJump.projectedGain).toContain('max +50%');
    expect(vm.timeJump.confirmationText).toContain('+50%');
    expect(vm.timeJump.confirmationText).not.toContain('+90%');
  });
});

describe('seventh review fixes', () => {
  it('a challenge-banned building is never shown as affordable', () => {
    const cold = executeAction(
      ripe({ ...createInitialState(), tick: 40, year: 11, prestigeCounts: { 1: 1, 2: 0, 3: 0, 4: 0 } }),
      { type: 'START_CHALLENGE', challengeId: 'cold_resolve' }
    ).state;
    const rich: TimelineState = { ...cold, rung: 'settlement', caps: { food: 200, materials: 200, knowledge: 200 } };
    rich.resources = { ...rich.resources, materials: 150, food: 150, knowledge: 150 };
    const card = buildTimelineViewModel(rich).buildings.find((b) => b.id === 'fire_pit')!;
    expect(card.canAfford).toBe(false);
    expect(buildTimelineViewModel(rich).buildings.find((b) => b.id === 'workshop')!.canAfford).toBe(true);
  });

  it('the Hearth badge counts people only, but a waiting decision still lights it', () => {
    const s: TimelineState = { ...createInitialState(), rung: 'band', pendingChoice: { eventId: 'lost_traveller', tick: 1 } };
    s.population.roles = { ...s.population.roles, unassigned: 0, forager: 1 };
    const badges = buildTimelineViewModel(s).tabBadges;
    expect(badges.hearth).toBe(true);
    expect(badges.hearthCount).toBe(0);
  });
});
