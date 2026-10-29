import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/engine/engine.js';
import { explainProduction } from '../src/engine/rules.js';
import { TimelineState } from '../src/engine/types.js';

const labels = (s: TimelineState): string[] => explainProduction(s).map((n) => n.label);

describe('production explanations', () => {
  it('say only the season when nothing else boosts production', () => {
    expect(labels(createInitialState())).toEqual(['Season']);
  });

  it('name every source of a boost so no multiplier is hidden', () => {
    const s: TimelineState = {
      ...createInitialState(),
      rung: 'realm',
      insight: 20,
      echoes: 2,
      resonance: 1,
      eternity: 1,
      achievements: ['rung_band'],
      discoveries: ['foraging_lore', 'philosophy'],
      edicts: { band: 'hunters_way' },
      relics: ['oak_staff'],
    };
    s.buildings.wonder_of_ages = 1;
    const l = labels(s);
    for (const expected of ['Insight', 'Echoes', 'Resonance', 'Eternity Marks', 'Renown', 'Wonders', 'Food: Discoveries', 'Food: Edicts', 'Food: Relics', 'Broad boosts (Discoveries and Edicts)', 'Season']) {
      expect(l, expected).toContain(expected);
    }
  });
});

describe('harmony', () => {
  it('rewards high Stability and never punishes low Stability', async () => {
    const { harmonyBonus, calculateNetRates } = await import('../src/engine/rules.js');
    expect(harmonyBonus(0)).toBe(0);
    expect(harmonyBonus(75)).toBe(0);
    expect(harmonyBonus(90)).toBe(0.08);
    expect(harmonyBonus(100)).toBe(0.15);
    const base = createInitialState();
    base.population.roles = { ...base.population.roles, builder: 10, unassigned: 0 };
    base.population.total = 10;
    const calm = calculateNetRates({ ...base, rung: 'band', resources: { ...base.resources, stability: 100 } }).materials;
    const plain = calculateNetRates({ ...base, rung: 'band', resources: { ...base.resources, stability: 50 } }).materials;
    expect(calm).toBeGreaterThan(plain);
    expect(labels({ ...base, resources: { ...base.resources, stability: 100 } })).toContain('Harmony');
  });
});

describe('building previews', () => {
  it('state exactly what one more adds, matching the real change in rates', async () => {
    const { describeBuildingGain, calculateNetRates } = await import('../src/engine/rules.js');
    const base: TimelineState = { ...createInitialState(), rung: 'city', insight: 40, echoes: 3, discoveries: ['philosophy'] };
    base.population.roles = { ...base.population.roles, scholar: 4, unassigned: 0 };
    base.population.total = 4;
    expect(describeBuildingGain(base, 'hut')).toEqual(['+2 max population']);
    const lines = describeBuildingGain(base, 'academy');
    expect(lines).toContain('+120 Knowledge storage');
    const before = calculateNetRates(base).knowledge;
    const after = calculateNetRates({ ...base, buildings: { ...base.buildings, academy: 1 } }).knowledge;
    const claimed = Number(lines.find((l) => l.endsWith('Knowledge/tick'))!.replace(/[^0-9.]/g, ''));
    expect(after - before).toBeCloseTo(claimed, 1);
    expect(describeBuildingGain(base, 'wonder_of_ages')).toContain('+25% to all production');
  });
});
