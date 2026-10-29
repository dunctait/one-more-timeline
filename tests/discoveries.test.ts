import { describe, expect, it } from 'vitest';
import { ripe } from './helpers.js';
import { DISCOVERIES } from '../src/engine/discoveries.js';
import { createInitialState, executeAction, stepTick } from '../src/engine/engine.js';
import {
  BUILDING_IDS,
  BUILDINGS,
  calculateCaps,
  calculateNetRates,
  RUNGS,
  RUNG_ORDER,
  rungLevel,
} from '../src/engine/rules.js';
import { BuildingId, TimelineState } from '../src/engine/types.js';

function withKnowledge(patch: Partial<TimelineState>, knowledge: number): TimelineState {
  const s = createInitialState();
  return { ...s, ...patch, resources: { ...s.resources, knowledge } };
}

describe('discoveries', () => {
  it('every discovery cost fits inside the Knowledge storage of its rung', () => {
    for (const d of DISCOVERIES) {
      const buildings = Object.fromEntries(BUILDING_IDS.map((b) => [b, 0])) as Record<BuildingId, number>;
      for (const id of BUILDING_IDS) {
        const lvl = rungLevel(BUILDINGS[id].unlockedAt);
        if (lvl < rungLevel(d.minRung)) buildings[id] = 2;
        else if (lvl === rungLevel(d.minRung)) buildings[id] = 1;
      }
      for (const r of RUNG_ORDER.slice(1, rungLevel(d.minRung) + 1)) {
        for (const [id, n] of Object.entries(RUNGS[r].prerequisites?.buildings ?? {}) as Array<[BuildingId, number]>) {
          buildings[id] = Math.max(buildings[id], n);
        }
      }
      expect(calculateCaps(buildings, d.minRung).knowledge, d.id).toBeGreaterThanOrEqual(d.cost);
    }
  });

  it('is gated by rung and Knowledge, and cannot be bought twice', () => {
    expect(executeAction(withKnowledge({}, 5), { type: 'RESEARCH', discoveryId: 'fire_hardening' }).success).toBe(false);
    const band = withKnowledge({ rung: 'band' }, 10);
    const ok = executeAction(band, { type: 'RESEARCH', discoveryId: 'fire_hardening' });
    expect(ok.success).toBe(true);
    expect(ok.state.resources.knowledge).toBe(0);
    expect(executeAction({ ...ok.state, resources: { ...ok.state.resources, knowledge: 20 } }, { type: 'RESEARCH', discoveryId: 'fire_hardening' }).success).toBe(false);
    expect(executeAction(withKnowledge({ rung: 'band' }, 999), { type: 'RESEARCH', discoveryId: 'masonry' }).success).toBe(false);
  });

  it('boosts production, storage, population room and manual actions', () => {
    const base = withKnowledge({ rung: 'village' }, 0);
    base.population.roles = { ...base.population.roles, forager: 4, unassigned: 0 };
    base.population.total = 4;
    const before = calculateNetRates(base).food;
    const boosted = { ...base, discoveries: ['foraging_lore'] };
    expect(calculateNetRates(boosted).food).toBeGreaterThan(before);

    expect(calculateCaps(base.buildings, 'village', ['granary_seals']).food).toBeGreaterThan(calculateCaps(base.buildings, 'village').food);
    expect(calculateCaps(base.buildings, 'village', ['surveying']).population).toBe(calculateCaps(base.buildings, 'village').population + 2);

    const forageBase = executeAction(base, { type: 'FORAGE' }).state.resources.food - base.resources.food;
    const withTools = executeAction({ ...base, discoveries: ['hand_tools'] }, { type: 'FORAGE' }).state.resources.food - base.resources.food;
    expect(withTools).toBeCloseTo(forageBase * 1.5, 1);
  });

  it('are rediscovered each timeline but never reduce anything', () => {
    let s = withKnowledge({ rung: 'village', tick: 40, year: 11 }, 500);
    s = executeAction(s, { type: 'RESEARCH', discoveryId: 'herbal_medicine' }).state;
    const next = stepTick(s);
    expect(next.resources.stability).toBeGreaterThanOrEqual(s.resources.stability);
    const jumped = executeAction(ripe({ ...next, year: 5 }), { type: 'TIME_JUMP' }).state;
    expect(jumped.discoveries).toEqual([]);
  });
});

describe('legacy discoveries', () => {
  it('need banked Echoes, Resonance or Eternity as well as the rung', () => {
    const s: TimelineState = { ...createInitialState(), rung: 'town', resources: { ...createInitialState().resources, knowledge: 500 }, caps: { food: 300, materials: 300, knowledge: 500 } };
    const denied = executeAction(s, { type: 'RESEARCH', discoveryId: 'echoed_harvests' });
    expect(denied.success).toBe(false);
    expect(denied.error).toContain('Echoes');
    const ok = executeAction({ ...s, echoes: 1 }, { type: 'RESEARCH', discoveryId: 'echoed_harvests' });
    expect(ok.success).toBe(true);
    expect(executeAction({ ...s, echoes: 1 }, { type: 'RESEARCH', discoveryId: 'eternal_insight' }).success).toBe(false);
  });

  it('show what is needed in the view model, and the base-set achievement ignores them', async () => {
    const { buildTimelineViewModel } = await import('../src/ui/view-model.js');
    const { findNewAchievements } = await import('../src/engine/achievements.js');
    const vm = buildTimelineViewModel({ ...createInitialState(), rung: 'realm' });
    const d = vm.discoveries.find((x) => x.id === 'resonant_minds')!;
    expect(d.unlocked).toBe(false);
    expect(d.unlockPrereq).toContain('Resonance');
    const base = DISCOVERIES.filter((x) => !x.requires).map((x) => x.id);
    expect(findNewAchievements({ ...createInitialState(), discoveries: base }).map((a) => a.id)).toContain('discover_all');
  });
});
