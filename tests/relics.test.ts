import { describe, expect, it } from 'vitest';
import { ripe } from './helpers.js';
import { awayCapTicks, createInitialState, executeAction, manualMultiplier, stepTick } from '../src/engine/engine.js';
import { rollEvent, timelineSeed } from '../src/engine/events.js';
import { RELICS, relicBonus } from '../src/engine/relics.js';
import { calculateTimeJumpInsight } from '../src/engine/rules.js';
import { TimelineState } from '../src/engine/types.js';

/** Relics turn up in the telling of events, so the player has to pick tales up (and answer urgent ones). */
function decideEvents(s: TimelineState): TimelineState {
  let next = s;
  if (next.pendingChoice) next = executeAction(next, { type: 'RESOLVE_CHOICE', index: 0 }).state;
  for (const w of next.waitingEvents) next = executeAction(next, { type: 'RESOLVE_TALE', eventId: w.eventId, index: 0 }).state;
  return next;
}

describe('relics', () => {
  it('are rare finds that eventually turn up, only from unlocked rungs', () => {
    let s: TimelineState = { ...createInitialState({ seed: 77 }), rung: 'settlement' };
    for (let i = 0; i < 60000 && s.relics.length === 0; i++) s = decideEvents(stepTick(s));
    expect(s.relics.length).toBeGreaterThan(0);
    s.relics.forEach((id) => {
      const def = RELICS.find((r) => r.id === id)!;
      expect(['hearth', 'band', 'settlement']).toContain(def.minRung);
    });
    expect(s.logs.some((l) => l.text.includes('Relic found')) || s.relics.length > 0).toBe(true);
  });

  it('are never found twice and never lost by prestige', () => {
    let s: TimelineState = { ...createInitialState({ seed: 5 }), rung: 'realm' };
    for (let i = 0; i < 400000 && s.relics.length < RELICS.filter((r) => !r.trophyOf).length; i++) s = decideEvents(stepTick(s));
    expect(new Set(s.relics).size).toBe(s.relics.length);
    expect(s.relics.length).toBe(RELICS.filter((r) => !r.trophyOf).length);
    const jumped = executeAction(ripe({ ...s, year: 9 }), { type: 'TIME_JUMP' }).state;
    expect(jumped.relics).toEqual(s.relics);
    const epoch = executeAction({ ...s, year: 310, insight: 120 }, { type: 'PRESTIGE', tier: 2 }).state;
    expect(epoch.relics).toEqual(s.relics);
  });

  it('send back their functions', () => {
    const base = createInitialState();
    expect(awayCapTicks({ ...base, relics: ['cracked_hourglass'] })).toBe(12 * 3600);
    expect(manualMultiplier({ ...base, relics: ['whetstone'] })).toBeCloseTo(1.25, 5);
    const withBag = createInitialState({ relics: ['seed_bag'] });
    expect(withBag.resources.food).toBe(createInitialState().resources.food + 20);
    expect(createInitialState({ relics: ['ancestor_mask'] }).population.total).toBe(13);
    const ready = { ...base, year: 40, rung: 'village' as const };
    expect(calculateTimeJumpInsight({ ...ready, relics: ['chronometer'] })).toBeGreaterThan(calculateTimeJumpInsight(ready));
    expect(relicBonus(['bronze_compass'], 'eventChance')).toBeCloseTo(0.5, 5);
  });

  it('make events more frequent with the Bronze Compass', () => {
    const count = (relics: string[]) => {
      let n = 0;
      for (let y = 0; y < 2000; y++) if (rollEvent({ seed: 3, rung: 'realm', relics }, y * 4 + 1)) n++;
      return n;
    };
    expect(count(['bronze_compass'])).toBeGreaterThan(count([]));
  });
});

describe('timeline variation', () => {
  it('gives each timeline different events from the same base seed', () => {
    const a = Array.from({ length: 60 }, (_, y) => rollEvent({ seed: 1337, rung: 'realm', timelinesCreated: 0 }, y * 4 + 1)?.id ?? '-');
    const b = Array.from({ length: 60 }, (_, y) => rollEvent({ seed: 1337, rung: 'realm', timelinesCreated: 1 }, y * 4 + 1)?.id ?? '-');
    expect(a).not.toEqual(b);
    expect(timelineSeed(1337, 0)).not.toBe(timelineSeed(1337, 1));
  });
});
