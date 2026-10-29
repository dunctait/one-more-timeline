import { describe, expect, it } from 'vitest';
import { ripe } from './helpers.js';
import { createInitialState, executeAction, stepTick } from '../src/engine/engine.js';
import {
  BUILDINGS,
  BUILDING_IDS,
  calculateCaps,
  calculateNetRates,
  checkRungPrerequisites,
  FEATURES,
  getBuildingCost,
  PRESTIGE_TIERS,
  RUNGS,
  RUNG_ORDER,
  rungLevel,
} from '../src/engine/rules.js';
import { BuildingId, RoleId, RungId, TimelineState } from '../src/engine/types.js';

/** A plausible human: clicks gather actions, assigns newcomers, builds what the next rung needs. */
function playTick(state: TimelineState): TimelineState {
  let s = state;
  const act = (a: Parameters<typeof executeAction>[1]) => {
    const r = executeAction(s, a);
    if (r.success) s = r.state;
    return r.success;
  };
  act({ type: 'FORAGE' });
  act({ type: 'SCAVENGE' });
  act({ type: 'STUDY' });

  const level = rungLevel(s.rung);
  const wanted: RoleId[] =
    level >= 3
      ? ['forager', 'builder', 'scholar', 'healer']
      : level >= 2
        ? ['forager', 'builder', 'scholar']
        : ['forager', 'builder'];
  while (s.population.roles.unassigned > 0 && level >= 1) {
    const target = wanted.reduce((a, b) => (s.population.roles[b] < s.population.roles[a] ? b : a));
    if (!act({ type: 'ASSIGN_ROLE', role: target, delta: 1 })) break;
  }

  const next = RUNG_ORDER[level + 1];
  if (next) {
    if (checkRungPrerequisites(s, next).eligible) act({ type: 'ADVANCE_RUNG', rungId: next });
    const needs = RUNGS[next].prerequisites?.buildings ?? {};
    for (const [id, n] of Object.entries(needs) as Array<[BuildingId, number]>) {
      if (s.buildings[id] < n) act({ type: 'BUILD', buildingId: id });
    }
  }
  // Spend spare resources on unlocked buildings, cheapest first.
  const spare = BUILDING_IDS.filter(
    (id) => rungLevel(s.rung) >= rungLevel(BUILDINGS[id].unlockedAt)
  ).sort((a, b) => {
    const ca = getBuildingCost(a, s.buildings[a]);
    const cb = getBuildingCost(b, s.buildings[b]);
    return ca.materials + ca.food + ca.knowledge - (cb.materials + cb.food + cb.knowledge);
  });
  for (const id of spare) {
    if (act({ type: 'BUILD', buildingId: id })) break;
  }
  return stepTick(s);
}

function ticksToRung(start: TimelineState, target: RungId, limit = 6000): number {
  let s = start;
  for (let i = 0; i < limit; i++) {
    if (s.rung === target) return i;
    s = playTick(s);
  }
  return Infinity;
}

function emptyBuildings(): Record<BuildingId, number> {
  return Object.fromEntries(BUILDING_IDS.map((b) => [b, 0])) as Record<BuildingId, number>;
}

/** A modest holding: 2 of every earlier building, 1 of the rest unlocked at this rung. */
function reasonableBuildings(rung: RungId): Record<BuildingId, number> {
  const b = emptyBuildings();
  for (const id of BUILDING_IDS) {
    const lvl = rungLevel(BUILDINGS[id].unlockedAt);
    if (lvl < rungLevel(rung)) b[id] = 2;
    else if (lvl === rungLevel(rung)) b[id] = 1;
  }
  // Anything an earlier rung demanded is already standing.
  for (const r of RUNG_ORDER.slice(1, rungLevel(rung) + 1)) {
    for (const [id, n] of Object.entries(RUNGS[r].prerequisites?.buildings ?? {}) as Array<[BuildingId, number]>) {
      b[id] = Math.max(b[id], n);
    }
  }
  return b;
}

describe('content reachability', () => {
  it('every rung requirement fits inside the storage available at the previous rung', () => {
    for (const id of RUNG_ORDER.slice(1)) {
      const req = RUNGS[id].prerequisites!;
      const prev = RUNG_ORDER[rungLevel(id) - 1];
      const buildings = reasonableBuildings(prev);
      for (const [b, n] of Object.entries(req.buildings ?? {}) as Array<[BuildingId, number]>) {
        buildings[b] = Math.max(buildings[b], n);
      }
      const caps = calculateCaps(buildings, prev);
      expect(caps.knowledge, `${id} knowledge`).toBeGreaterThanOrEqual(req.knowledge);
      expect(caps.food, `${id} food`).toBeGreaterThanOrEqual(req.food ?? 0);
      expect(caps.materials, `${id} materials`).toBeGreaterThanOrEqual(req.materials ?? 0);
      expect(caps.population, `${id} population`).toBeGreaterThanOrEqual(req.population ?? 0);
    }
  });

  it('every building is affordable within the storage of the rung that unlocks it', () => {
    for (const id of BUILDING_IDS) {
      const unlock = BUILDINGS[id].unlockedAt;
      const buildings = reasonableBuildings(unlock);
      buildings[id] = 0;
      const caps = calculateCaps(buildings, unlock);
      const cost = getBuildingCost(id, 0);
      expect(caps.materials, `${id} materials`).toBeGreaterThanOrEqual(cost.materials);
      expect(caps.food, `${id} food`).toBeGreaterThanOrEqual(cost.food);
      expect(caps.knowledge, `${id} knowledge`).toBeGreaterThanOrEqual(cost.knowledge);
    }
  });

  it('a steady player reaches the Sovereign Realm', () => {
    const ticks = ticksToRung(createInitialState(), 'realm');
    let s = createInitialState();
    const marks: string[] = [];
    let last = 0;
    for (let i = 0; i < ticks; i++) {
      const before = s.rung;
      s = playTick(s);
      if (s.rung !== before) {
        marks.push(`${s.rung}@${i} (+${i - last})`);
        last = i;
      }
    }
    // Pacing guard: the first run to the realm should fit in a single sitting (~15 min).
    expect(marks.length).toBe(RUNG_ORDER.length - 1);
    expect(ticks).toBeLessThan(900);
  });
});

describe('prestige tiers and sent-back functions', () => {
  const atRealm = (patch: Partial<TimelineState> = {}): TimelineState => {
    const s = createInitialState();
    return { ...s, rung: 'realm', year: 70, tick: 276, ...patch };
  };

  it('refuses each tier until the realm stands and the lower currency is banked', () => {
    expect(executeAction(createInitialState(), { type: 'PRESTIGE', tier: 2 }).success).toBe(false);
    expect(executeAction(atRealm({ insight: 119 }), { type: 'PRESTIGE', tier: 2 }).success).toBe(false);
    expect(executeAction(atRealm({ echoes: 7, year: 130 }), { type: 'PRESTIGE', tier: 3 }).success).toBe(false);
    expect(executeAction(atRealm({ resonance: 5, year: 250 }), { type: 'PRESTIGE', tier: 4 }).success).toBe(false);
  });

  it('Epoch Shift banks Echoes, resets Insight, keeps records, and sends back a function', () => {
    const r = executeAction(atRealm({ insight: 240, furthestYear: 70 }), { type: 'PRESTIGE', tier: 2 });
    expect(r.success).toBe(true);
    expect(r.state.echoes).toBe(3);
    expect(r.state.insight).toBe(0);
    expect(r.state.rung).toBe('hearth');
    expect(r.state.furthestYear).toBe(70);
    expect(r.state.features).toContain('rising_tide');
  });

  it('the second Epoch Shift sends back Inherited Foundations as starting buildings', () => {
    const first = executeAction(atRealm({ insight: 120 }), { type: 'PRESTIGE', tier: 2 }).state;
    expect(first.features).not.toContain('inherited_foundations');
    const second = executeAction({ ...first, rung: 'realm', insight: 120, year: 70 }, { type: 'PRESTIGE', tier: 2 })
      .state;
    expect(second.features).toContain('inherited_foundations');
    expect(second.buildings.hut).toBe(1);
    expect(second.buildings.granary).toBe(1);
    expect(second.buildings.workshop).toBe(1);
    expect(second.population.max).toBe(4);
  });

  it('Paradigm Shift resets Echoes and starts later timelines further up the rungs', () => {
    const r = executeAction(atRealm({ echoes: 16, insight: 30, year: 130 }), { type: 'PRESTIGE', tier: 3 });
    expect(r.success).toBe(true);
    expect(r.state.resonance).toBe(3);
    expect(r.state.echoes).toBe(0);
    expect(r.state.insight).toBe(0);
    expect(r.state.rung).toBe('village');
    expect(r.state.features).toContain('temporal_foresight');
  });

  it('Ascension keeps only Eternity Marks and sends back The Steward', () => {
    const r = executeAction(atRealm({ resonance: 6, echoes: 3, insight: 10, year: 250 }), {
      type: 'PRESTIGE',
      tier: 4,
    });
    expect(r.success).toBe(true);
    expect(r.state.eternity).toBe(2);
    expect(r.state.resonance).toBe(0);
    expect(r.state.echoes).toBe(0);
    expect(r.state.features).toContain('steward');
  });

  it('the first Time Jump sends back Ancestral Hands, which assigns newcomers on its own', () => {
    const jump = executeAction(ripe({ ...createInitialState(), year: 5 }), { type: 'TIME_JUMP' });
    expect(jump.state.features).toContain('ancestral_hands');
    let s: TimelineState = { ...jump.state, rung: 'band' };
    s = { ...s, population: { ...s.population, total: 3, roles: { ...s.population.roles, unassigned: 3 } } };
    s = stepTick(s);
    expect(s.population.roles.unassigned).toBe(0);
    expect(s.population.roles.forager + s.population.roles.builder).toBe(s.population.total);
    const off = executeAction(s, { type: 'TOGGLE_AUTOMATION', key: 'assign' }).state;
    expect(off.automation.assign).toBe(false);
  });

  it('Rising Tide advances a rung and The Steward builds without player input', () => {
    let s = createInitialState();
    s = { ...s, features: ['rising_tide', 'steward'], rung: 'band', tick: 20, year: 6 };
    s.resources = { ...s.resources, knowledge: 20, materials: 20, food: 20 };
    s.buildings.hut = 1;
    s.caps = { ...s.caps, ...calculateCaps(s.buildings, 'band') };
    const after = stepTick(s);
    expect(after.rung).toBe('settlement');
    const stewarded = stepTick({ ...after, resources: { ...after.resources, materials: 25, food: 20 } });
    const built = Object.values(stewarded.buildings).reduce((a, b) => a + b, 0);
    expect(built).toBeGreaterThan(1);
  });

  it('every feature is granted by an existing prestige tier', () => {
    for (const f of Object.values(FEATURES)) {
      expect(f.tier === 1 || PRESTIGE_TIERS[f.tier as 2 | 3 | 4]).toBeTruthy();
    }
  });
});

describe('later sent-back functions', () => {
  const jump = (s: TimelineState): TimelineState => executeAction(ripe({ ...s, year: 5, tick: 16 }), { type: 'TIME_JUMP' }).state;
  const atRealm = (patch: Partial<TimelineState> = {}): TimelineState => ({
    ...createInitialState(),
    rung: 'realm',
    year: 70,
    tick: 276,
    ...patch,
  });

  it('Seasoned Memory (3rd Time Jump) keeps Edicts across timelines', () => {
    let s: TimelineState = { ...createInitialState(), rung: 'village' };
    s = executeAction(s, { type: 'SET_EDICT', slot: 'band', edictId: 'hunters_way' }).state;
    s = jump(s);
    expect(s.edicts).toEqual({});
    s = { ...s, rung: 'village' };
    s = executeAction(s, { type: 'SET_EDICT', slot: 'band', edictId: 'hunters_way' }).state;
    s = jump(s);
    s = { ...s, rung: 'village' };
    s = executeAction(s, { type: 'SET_EDICT', slot: 'band', edictId: 'hunters_way' }).state;
    s = jump(s);
    expect(s.features).toContain('seasoned_memory');
    expect(s.edicts.band).toBe('hunters_way');
    expect(jump(s).edicts.band).toBe('hunters_way');
  });

  it('Lore Keepers (6th Time Jump) starts timelines with early Discoveries', () => {
    let s = createInitialState();
    for (let i = 0; i < 6; i++) s = jump(s);
    expect(s.features).toContain('lore_keepers');
    expect(s.discoveries).toEqual(['fire_hardening', 'foraging_lore', 'granary_seals']);
    expect(s.caps.food).toBeGreaterThan(30);
  });

  it('Apprentice Scholars research the cheapest affordable Discovery automatically', () => {
    let s: TimelineState = { ...atRealm(), features: ['apprentice_scholars'] };
    s.resources = { ...s.resources, knowledge: 40 };
    s = stepTick(s);
    expect(s.discoveries).toContain('fire_hardening');
    const off = executeAction({ ...s, discoveries: [] }, { type: 'TOGGLE_AUTOMATION', key: 'research' }).state;
    expect(stepTick(off).discoveries).toEqual([]);
  });

  it('Second Wind lengthens the away window to 24 hours', async () => {
    const { fastForward, awayCapTicks } = await import('../src/engine/engine.js');
    const base = createInitialState();
    expect(awayCapTicks(base)).toBe(8 * 3600);
    expect(awayCapTicks({ ...base, features: ['second_wind'] })).toBe(24 * 3600);
    expect(fastForward({ ...base, features: ['second_wind'] }, 20 * 3600).summary.ticks).toBe(20 * 3600);
  });

  it('Twin Stewards build two buildings per tick', () => {
    const rich = (features: TimelineState['features']): TimelineState => {
      const s = atRealm({ features });
      s.resources = { ...s.resources, materials: 300, food: 150, knowledge: 100 };
      s.caps = { food: 400, materials: 400, knowledge: 400 };
      return s;
    };
    const count = (s: TimelineState) => Object.values(s.buildings).reduce((a, b) => a + b, 0);
    expect(count(stepTick(rich(['steward'])))).toBe(1);
    expect(count(stepTick(rich(['steward', 'twin_stewards'])))).toBe(2);
  });
});

describe('wonders', () => {
  const rich = (): TimelineState => {
    const s = createInitialState();
    return {
      ...s,
      rung: 'realm',
      resources: { ...s.resources, materials: 700, food: 200, knowledge: 380 },
      caps: { food: 600, materials: 900, knowledge: 900 },
    };
  };

  it('can be built once per timeline and then show as built', () => {
    const first = executeAction(rich(), { type: 'BUILD', buildingId: 'wonder_of_ages' });
    expect(first.success).toBe(true);
    const richer = { ...first.state, resources: { ...first.state.resources, materials: 900, food: 300, knowledge: 500 } };
    const second = executeAction(richer, { type: 'BUILD', buildingId: 'wonder_of_ages' });
    expect(second.success).toBe(false);
    expect(second.error).toContain('once per timeline');
  });

  it('add a percentage to all production', () => {
    const base = rich();
    base.population.roles = { ...base.population.roles, builder: 10, unassigned: 0 };
    base.population.total = 10;
    const before = calculateNetRates(base).materials;
    const built = { ...base, buildings: { ...base.buildings, wonder_of_ages: 1 } };
    expect(calculateNetRates(built).materials).toBeCloseTo(before * 1.25, 1);
  });

  it('is skipped by the Steward once built so it never stalls', () => {
    let s: TimelineState = { ...rich(), features: ['steward'] };
    s = executeAction(s, { type: 'BUILD', buildingId: 'wonder_of_ages' }).state;
    for (let i = 0; i < 5; i++) s = stepTick({ ...s, resources: { ...s.resources, materials: 900, food: 300, knowledge: 500 } });
    expect(s.buildings.wonder_of_ages).toBe(1);
  });
});

describe('Chrono Dial', () => {
  it('is sent back by the fifth Epoch Shift and not before', () => {
    let s: TimelineState = { ...createInitialState(), rung: 'realm', insight: 120 };
    for (let i = 1; i <= 5; i++) {
      s = executeAction({ ...s, rung: 'realm', insight: 120, year: 70 }, { type: 'PRESTIGE', tier: 2 }).state;
      expect(s.features.includes('chrono_dial')).toBe(i >= 5);
    }
  });
});

describe('deeper sent-back functions', () => {
  const jumpN = (s: TimelineState, n: number): TimelineState => {
    let cur = s;
    for (let i = 0; i < n; i++) cur = executeAction(ripe({ ...cur, year: 9, tick: 32 }), { type: 'TIME_JUMP' }).state;
    return cur;
  };

  it('Grand Foundations (10th Time Jump) adds an Obelisk and Fire Pit to every start', () => {
    const nine = jumpN(createInitialState(), 9);
    expect(nine.buildings.chronicle_stone).toBe(0);
    const ten = jumpN(nine, 1);
    expect(ten.features).toContain('grand_foundations');
    expect(ten.buildings.chronicle_stone).toBe(1);
    expect(ten.buildings.fire_pit).toBe(1);
  });

  it('Echo Merchants open the Marketplace at Dawn Village', () => {
    const village: TimelineState = { ...createInitialState(), rung: 'village' };
    village.resources = { ...village.resources, food: 100 };
    village.caps = { food: 300, materials: 300, knowledge: 300 };
    expect(executeAction(village, { type: 'BARTER', from: 'food', to: 'materials', amount: 30 }).success).toBe(false);
    const merchants = { ...village, features: ['echo_merchants' as const] };
    expect(executeAction(merchants, { type: 'BARTER', from: 'food', to: 'materials', amount: 30 }).success).toBe(true);
  });

  it('Master Scholars cut every Discovery cost by a quarter', async () => {
    const { discoveryCost } = await import('../src/engine/rules.js');
    expect(discoveryCost({ features: [] }, 100)).toBe(100);
    expect(discoveryCost({ features: ['master_scholars'] }, 100)).toBe(75);
    const s: TimelineState = { ...createInitialState(), rung: 'band', features: ['master_scholars'] };
    s.resources = { ...s.resources, knowledge: 8 };
    const r = executeAction(s, { type: 'RESEARCH', discoveryId: 'fire_hardening' });
    expect(r.success).toBe(true);
    expect(r.state.resources.knowledge).toBe(0);
  });
});
