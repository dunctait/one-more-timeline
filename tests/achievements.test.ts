import { describe, expect, it } from 'vitest';
import { ripe } from './helpers.js';
import { ACHIEVEMENTS } from '../src/engine/achievements.js';
import { createInitialState, executeAction, stepTick } from '../src/engine/engine.js';
import { getProductionMultiplier } from '../src/engine/rules.js';

describe('achievements', () => {
  it('have unique ids and plain-language goals', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    ACHIEVEMENTS.forEach((a) => expect(a.description.length).toBeGreaterThan(8));
  });

  it('are granted once, logged, and add Renown production', () => {
    let s = createInitialState();
    s = { ...s, rung: 'band', tick: 40, year: 11, furthestYear: 11 };
    const next = stepTick(s);
    expect(next.achievements).toContain('rung_band');
    expect(next.achievements).toContain('year_10');
    expect(next.logs.some((l) => l.text.includes('Achievement'))).toBe(true);
    const again = stepTick(next);
    expect(again.achievements.filter((a) => a === 'rung_band')).toHaveLength(1);
    expect(getProductionMultiplier(next)).toBeCloseTo(1 + next.achievements.length * 0.01, 5);
  });

  it('survive a Jumpback and are never lost', () => {
    let s = createInitialState();
    s = { ...s, rung: 'village', tick: 40, year: 11, furthestYear: 11 };
    s = stepTick(s);
    const earned = [...s.achievements];
    const jumped = executeAction(ripe(s), { type: 'TIME_JUMP' }).state;
    earned.forEach((id) => expect(jumped.achievements).toContain(id));
    expect(jumped.achievements).toContain('first_jump');
  });
});

describe('collection achievements', () => {
  it('recognise trophies, wonders and discoveries', async () => {
    const { findNewAchievements } = await import('../src/engine/achievements.js');
    const { DISCOVERIES } = await import('../src/engine/discoveries.js');
    const s = createInitialState();
    const ids = (st: typeof s) => findNewAchievements(st).map((a) => a.id);
    expect(ids(s)).not.toContain('trophy_first');
    expect(ids({ ...s, relics: ['swift_sandals'] })).toContain('trophy_first');
    expect(ids({ ...s, buildings: { ...s.buildings, colossus: 1 } })).toContain('wonder_first');
    expect(ids({ ...s, buildings: { ...s.buildings, colossus: 1 } })).not.toContain('wonder_all');
    expect(ids({ ...s, discoveries: DISCOVERIES.map((d) => d.id) })).toContain('discover_all');
  });
});
