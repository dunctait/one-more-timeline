import { describe, expect, it } from 'vitest';
import { EDICTS, edictsForSlot } from '../src/engine/edicts.js';
import { createInitialState, executeAction, manualMultiplier, stepTick } from '../src/engine/engine.js';
import { activeEdicts, calculateNetRates, RUNG_ORDER, SEASON_PROFILES } from '../src/engine/rules.js';
import { TimelineState } from '../src/engine/types.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';

describe('edicts', () => {
  it('offer three choices in every rung slot above the hearth', () => {
    for (const rung of RUNG_ORDER.slice(1)) expect(edictsForSlot(rung)).toHaveLength(3);
    expect(EDICTS.every((e) => e.slot !== 'hearth')).toBe(true);
  });

  it('are gated by rung, swap freely, and can be cleared at no cost', () => {
    const hearth = createInitialState();
    expect(executeAction(hearth, { type: 'SET_EDICT', slot: 'band', edictId: 'hunters_way' }).success).toBe(false);

    let s: TimelineState = { ...hearth, rung: 'village' };
    s = executeAction(s, { type: 'SET_EDICT', slot: 'band', edictId: 'hunters_way' }).state;
    expect(s.edicts.band).toBe('hunters_way');
    s = executeAction(s, { type: 'SET_EDICT', slot: 'band', edictId: 'builders_pact' }).state;
    expect(s.edicts.band).toBe('builders_pact');
    expect(executeAction(s, { type: 'SET_EDICT', slot: 'band', edictId: 'tool_guild' }).success).toBe(false);
    s = executeAction(s, { type: 'SET_EDICT', slot: 'band', edictId: null }).state;
    expect(s.edicts.band).toBeUndefined();
  });

  it('boost the matching production and are reset with each new timeline', () => {
    let s = createInitialState();
    s = { ...s, rung: 'band' };
    s.population.roles = { ...s.population.roles, builder: 5, unassigned: 0 };
    s.population.total = 5;
    const base = calculateNetRates(s).materials;
    s = executeAction(s, { type: 'SET_EDICT', slot: 'band', edictId: 'builders_pact' }).state;
    expect(calculateNetRates(s).materials).toBeGreaterThan(base);
    const jumped = executeAction({ ...s, year: 5 }, { type: 'TIME_JUMP' }).state;
    expect(jumped.edicts).toEqual({});
  });

  it('count as an actionable settlement signal while a slot is empty', () => {
    const s = { ...createInitialState(), rung: 'band' as const };
    expect(buildTimelineViewModel(s).edictSlots[0].chosenId).toBeNull();
    const chosen = executeAction(s, { type: 'SET_EDICT', slot: 'band', edictId: 'hunters_way' }).state;
    expect(buildTimelineViewModel(chosen).tabBadges.settlementCount).toBeLessThan(
      buildTimelineViewModel(s).tabBadges.settlementCount
    );
  });
});

describe('seasons', () => {
  it('every season is a boost to something and none is a penalty to a role below 0.9', () => {
    for (const p of Object.values(SEASON_PROFILES)) {
      expect(Math.max(p.forager / 1.5, p.builder, p.scholar)).toBeGreaterThanOrEqual(1);
      expect(Math.min(p.builder, p.scholar)).toBeGreaterThanOrEqual(1);
    }
  });

  it('autumn feeds more than winter, and never makes a rate negative', () => {
    let s = createInitialState();
    s = { ...s, rung: 'band' };
    s.population.roles = { ...s.population.roles, forager: 3, unassigned: 0 };
    s.population.total = 3;
    const autumn = calculateNetRates({ ...s, season: 'Autumn' }).food;
    const winter = calculateNetRates({ ...s, season: 'Winter' }).food;
    expect(autumn).toBeGreaterThan(winter);
    expect(winter).toBeGreaterThanOrEqual(0);
    expect(stepTick(s).resources.food).toBeGreaterThanOrEqual(s.resources.food);
  });
});

describe('remembered edicts', () => {
  it('do nothing until the timeline reaches their slot', () => {
    const base = { ...createInitialState(), edicts: { realm: 'hands_of_many', band: 'hunters_way' } };
    expect(activeEdicts(base)).toEqual({});
    expect(activeEdicts({ ...base, rung: 'band' })).toEqual({ band: 'hunters_way' });
    expect(manualMultiplier(base)).toBe(1);
    expect(manualMultiplier({ ...base, rung: 'realm' })).toBe(2);
  });
});
