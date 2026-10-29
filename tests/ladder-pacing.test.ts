import { expect, it } from 'vitest';
import { createInitialState, executeAction, stepTick } from '../src/engine/engine.js';
import { BUILDINGS, BUILDING_IDS, checkPrestigeTier, checkRungPrerequisites, getBuildingCost, RUNGS, RUNG_ORDER, rungLevel } from '../src/engine/rules.js';
import { DISCOVERIES } from '../src/engine/discoveries.js';
import { edictsForSlot } from '../src/engine/edicts.js';
import { BuildingId, RoleId, TimelineState } from '../src/engine/types.js';

function play(state: TimelineState): TimelineState {
  let s = state;
  const act = (a: Parameters<typeof executeAction>[1]) => { const r = executeAction(s, a); if (r.success) s = r.state; return r.success; };
  act({ type: 'FORAGE' }); act({ type: 'SCAVENGE' }); act({ type: 'STUDY' });
  const level = rungLevel(s.rung);
  const wanted: RoleId[] = level >= 3 ? ['forager', 'builder', 'scholar', 'healer'] : level >= 2 ? ['forager', 'builder', 'scholar'] : ['forager', 'builder'];
  while (s.population.roles.unassigned > 0 && level >= 1) {
    const target = wanted.reduce((a, b) => (s.population.roles[b] < s.population.roles[a] ? b : a));
    if (!act({ type: 'ASSIGN_ROLE', role: target, delta: 1 })) break;
  }
  for (const r of RUNG_ORDER.slice(1)) if (rungLevel(r) <= level && !s.edicts[r]) act({ type: 'SET_EDICT', slot: r, edictId: edictsForSlot(r)[0].id });
  for (const d of DISCOVERIES) act({ type: 'RESEARCH', discoveryId: d.id });
  const next = RUNG_ORDER[level + 1];
  if (next) {
    if (checkRungPrerequisites(s, next).eligible) act({ type: 'ADVANCE_RUNG', rungId: next });
    for (const [id, n] of Object.entries(RUNGS[next].prerequisites?.buildings ?? {}) as Array<[BuildingId, number]>) if (s.buildings[id] < n) act({ type: 'BUILD', buildingId: id });
  }
  const spare = BUILDING_IDS.filter((id) => rungLevel(s.rung) >= rungLevel(BUILDINGS[id].unlockedAt)).sort((a, b) => { const ca = getBuildingCost(a, s.buildings[a]); const cb = getBuildingCost(b, s.buildings[b]); return ca.materials + ca.food + ca.knowledge - (cb.materials + cb.food + cb.knowledge); });
  for (const id of spare) if (act({ type: 'BUILD', buildingId: id })) break;
  return stepTick(s);
}

/** An optimal, patient bot plays the whole ladder; each tier must take clearly longer than the last. */
it('each prestige tier takes longer than the one before', () => {
  let s = createInitialState();
  let total = 0;
  const log: string[] = [];
  const seen = new Set<string>();
  const firstAt: Record<number, number> = {};
  const stamp = (label: string) => { if (!seen.has(label)) { seen.add(label); log.push(`${label} @${Math.round(total / 60)}min`); } };
  for (let guard = 0; guard < 600 && s.eternity < 2 && total < 60 * 60 * 12; guard++) {
    let ticks = 0;
    while (s.rung !== 'realm' && ticks < 5000) { s = play(s); ticks++; total++; }
    // Patient: if heading for a deeper tier, wait at the realm for its Year requirement.
    const goal = s.resonance >= 6 ? 4 : s.echoes >= 8 ? 3 : 2;
    const wantYear = goal === 4 ? 240 : goal === 3 ? 120 : 60;
    for (let i = 0; i < 2400 && (i < 60 || s.year < wantYear); i++) { s = play(s); total++; }
    let tier: 0 | 2 | 3 | 4 = 0;
    for (const t of [4, 3, 2] as const) if (checkPrestigeTier(s, t).eligible) { tier = t; break; }
    if (tier) { s = executeAction(s, { type: 'PRESTIGE', tier }).state; firstAt[tier] ??= total / 60; stamp(`tier${tier}#${s.prestigeCounts[tier]} E${s.echoes} R${s.resonance} Et${s.eternity}`); }
    else { s = executeAction(s, { type: 'TIME_JUMP' }).state; stamp(`jump#${s.prestigeCounts[1]} ins${s.insight}`); }
  }
  // Bot-minutes: a human will be slower than this optimal bot.
  expect(firstAt[2]).toBeLessThan(25);
  expect(firstAt[3]).toBeGreaterThan(firstAt[2] * 2);
  expect(firstAt[4]).toBeGreaterThan(firstAt[3] * 2);
  expect(firstAt[4]).toBeLessThan(600);
});
