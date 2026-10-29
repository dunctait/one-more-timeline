import { describe, expect, it } from 'vitest';
import { CHALLENGES } from '../src/engine/challenges.js';
import { DISCOVERIES } from '../src/engine/discoveries.js';
import { edictsForSlot } from '../src/engine/edicts.js';
import { createInitialState, executeAction, stepTick } from '../src/engine/engine.js';
import { BUILDINGS, BUILDING_IDS, checkRungPrerequisites, getBuildingCost, RUNGS, RUNG_ORDER, rungLevel } from '../src/engine/rules.js';
import { BuildingId, RoleId, TimelineState } from '../src/engine/types.js';

/** The same plausible player the pacing tests use: gathers, assigns, researches, builds. */
function play(state: TimelineState): TimelineState {
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
    level >= 3 ? ['forager', 'builder', 'scholar', 'healer'] : level >= 2 ? ['forager', 'builder', 'scholar'] : ['forager', 'builder'];
  while (s.population.roles.unassigned > 0 && level >= 1) {
    const order = [...wanted].sort((a, b) => s.population.roles[a] - s.population.roles[b]);
    if (!order.some((role) => act({ type: 'ASSIGN_ROLE', role, delta: 1 }))) break;
  }
  for (const r of RUNG_ORDER.slice(1)) {
    if (rungLevel(r) <= level && !s.edicts[r]) act({ type: 'SET_EDICT', slot: r, edictId: edictsForSlot(r)[0].id });
  }
  for (const d of DISCOVERIES) act({ type: 'RESEARCH', discoveryId: d.id });
  const next = RUNG_ORDER[level + 1];
  if (next) {
    if (checkRungPrerequisites(s, next).eligible) act({ type: 'ADVANCE_RUNG', rungId: next });
    for (const [id, n] of Object.entries(RUNGS[next].prerequisites?.buildings ?? {}) as Array<[BuildingId, number]>) {
      if (s.buildings[id] < n) act({ type: 'BUILD', buildingId: id });
    }
  }
  const spare = BUILDING_IDS.filter((id) => rungLevel(s.rung) >= rungLevel(BUILDINGS[id].unlockedAt)).sort((a, b) => {
    const ca = getBuildingCost(a, s.buildings[a]);
    const cb = getBuildingCost(b, s.buildings[b]);
    return ca.materials + ca.food + ca.knowledge - (cb.materials + cb.food + cb.knowledge);
  });
  for (const id of spare) if (act({ type: 'BUILD', buildingId: id })) break;
  return stepTick(s);
}

describe('every challenge can be completed', () => {
  for (const c of CHALLENGES) {
    it(`${c.name} is achievable by a steady player with a modest legacy`, () => {
      const base: TimelineState = {
        ...createInitialState(),
        prestigeCounts: { 1: 3, 2: 0, 3: 0, 4: 0 },
        tick: 40,
        year: 11,
        insight: 120,
        features: ['ancestral_hands'],
      };
      let s = executeAction(base, { type: 'START_CHALLENGE', challengeId: c.id }).state;
      expect(s.challenge).toBe(c.id);
      for (let i = 0; i < 3000 && s.challenge; i++) s = play(s);
      expect(s.relics, `${c.id} ended at year ${s.year}, rung ${s.rung}`).toContain(c.reward);
    });
  }
});
