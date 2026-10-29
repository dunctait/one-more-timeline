import { describe, expect, it } from 'vitest';
import { CHALLENGES } from '../src/engine/challenges.js';
import { DISCOVERIES } from '../src/engine/discoveries.js';
import { EDICTS } from '../src/engine/edicts.js';
import { createInitialState, executeAction, normalizeState, stepTick } from '../src/engine/engine.js';
import { seededUnit } from '../src/engine/events.js';
import { BUILDING_IDS, RUNG_ORDER } from '../src/engine/rules.js';
import { EngineAction, RoleId, TimelineState, TradeableResource } from '../src/engine/types.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';

const ROLES: RoleId[] = ['forager', 'builder', 'scholar', 'healer'];
const TRADES: TradeableResource[] = ['food', 'materials', 'knowledge'];

function randomAction(r: (salt: number) => number): EngineAction {
  const pick = <T,>(items: readonly T[], salt: number): T => items[Math.floor(r(salt) * items.length)];
  switch (Math.floor(r(1) * 18)) {
    case 0: return { type: 'FORAGE' };
    case 1: return { type: 'SCAVENGE' };
    case 2: return { type: 'STUDY' };
    case 3: return { type: 'ASSIGN_ROLE', role: pick(ROLES, 2), delta: r(3) < 0.7 ? 1 : -1 };
    case 4: return { type: 'BUILD', buildingId: pick(BUILDING_IDS, 4) };
    case 5: return { type: 'ADVANCE_RUNG', rungId: pick(RUNG_ORDER, 5) };
    case 6: return { type: 'RESEARCH', discoveryId: pick(DISCOVERIES, 6).id };
    case 7: return { type: 'SET_EDICT', slot: pick(RUNG_ORDER.slice(1), 7), edictId: r(8) < 0.2 ? null : pick(EDICTS, 9).id };
    case 8: return { type: 'BARTER', from: pick(TRADES, 10), to: pick(TRADES, 11), amount: Math.floor(r(12) * 200) - 10 };
    case 9: return { type: 'RESOLVE_CHOICE', index: Math.floor(r(13) * 4) };
    case 10: return { type: 'START_CHALLENGE', challengeId: pick(CHALLENGES, 14).id };
    case 11: return { type: 'ABANDON_CHALLENGE' };
    case 12: return { type: 'TOGGLE_AUTOMATION', key: pick(['assign', 'advance', 'build', 'research'] as const, 15) };
    case 13: return r(16) < 0.15 ? { type: 'TIME_JUMP' } : { type: 'TICK' };
    case 14: return { type: 'PRESTIGE', tier: pick([2, 3, 4] as const, 17) };
    case 15: return { type: 'DEV_ADD_RESOURCES', amount: 40 };
    case 16: return { type: 'DEV_SET_RUNG', rung: pick(RUNG_ORDER, 18) };
    default: return { type: 'TICK' };
  }
}

function assertSane(s: TimelineState, context: string): void {
  const fail = (what: string): never => {
    throw new Error(`${what} (${context})`);
  };
  for (const key of ['food', 'materials', 'knowledge', 'stability'] as const) {
    const v = s.resources[key];
    if (!Number.isFinite(v) || v < 0) fail(`resource ${key} = ${v}`);
  }
  if (s.resources.food > s.caps.food + 1e-6) fail('food above cap');
  if (s.resources.materials > s.caps.materials + 1e-6) fail('materials above cap');
  if (s.resources.knowledge > s.caps.knowledge + 1e-6) fail('knowledge above cap');
  if (s.resources.stability > 100) fail('stability above 100');
  const roles = Object.values(s.population.roles);
  if (roles.some((n) => !Number.isInteger(n) || n < 0)) fail('role count not a non-negative integer');
  if (roles.reduce((a, b) => a + b, 0) !== s.population.total) fail('roles do not sum to total');
  if (s.population.total < 1) fail('no people');
  for (const id of BUILDING_IDS) if (!Number.isInteger(s.buildings[id]) || s.buildings[id] < 0) fail(`building ${id}`);
  for (const key of ['echoes', 'resonance', 'eternity', 'insight']) {
    const v = s[key as 'echoes'];
    if (!Number.isFinite(v) || v < 0) fail(`${key} = ${v}`);
  }
  if (new Set(s.features).size !== s.features.length) fail('duplicate features');
  if (new Set(s.relics).size !== s.relics.length) fail('duplicate relics');
  if (new Set(s.achievements).size !== s.achievements.length) fail('duplicate achievements');
  if (new Set(s.discoveries).size !== s.discoveries.length) fail('duplicate discoveries');
  if (s.logs.length > 50) fail('log overflow');
  if (!Number.isFinite(s.tick) || s.year !== 1 + Math.floor(s.tick / 4) && s.tick !== 0) {
    // DEV_SET_YEAR is not fuzzed, so year always follows tick.
    fail(`year ${s.year} does not match tick ${s.tick}`);
  }
}

describe('fuzz: random play never breaks an invariant', () => {
  for (let run = 0; run < 40; run++) {
    it(`run ${run}`, () => {
      let s = createInitialState({ seed: 1000 + run, insight: run % 3 === 0 ? 60 : 0 });
      s = { ...s, prestigeCounts: { 1: run % 2, 2: 0, 3: 0, 4: 0 } };
      for (let step = 0; step < 250; step++) {
        const r = (salt: number): number => seededUnit(run * 7919 + 13, step, salt);
        const action = randomAction(r);
        const before = s;
        const result = executeAction(s, action);
        if (!result.success) {
          expect(result.state, `${action.type} failed but changed state`).toBe(before);
        }
        s = result.state;
        assertSane(s, `run ${run}, step ${step}, ${action.type}`);

        // A plain tick may only ever raise resources.
        if (action.type === 'TICK' && result.success) {
          for (const key of ['food', 'materials', 'knowledge'] as const) {
            if (s.resources[key] < before.resources[key] - 0.011) {
              // Automation may legitimately spend; only flag when no automation is active.
              if (s.features.length === 0) throw new Error(`${key} fell on a tick (${run}/${step})`);
            }
          }
        }
        // Rendering must never throw, whatever state random play has reached.
        if (step % 5 === 0) expect(() => buildTimelineViewModel(s)).not.toThrow();
        // Occasionally advance time in bulk too.
        if (step % 50 === 49) {
          for (let i = 0; i < 40; i++) s = stepTick(s);
          assertSane(s, `run ${run}, bulk ticks after step ${step}`);
          expect(() => buildTimelineViewModel(s)).not.toThrow();
        }
      }
      // And a save round-trip leaves a playable state.
      const reloaded = normalizeState(JSON.parse(JSON.stringify(s)) as TimelineState);
      assertSane(reloaded, `run ${run}, reloaded`);
      expect(() => stepTick(reloaded)).not.toThrow();
    });
  }
});
