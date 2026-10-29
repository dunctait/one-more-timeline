import { describe, expect, it } from 'vitest';
import { createInitialState, stepTick } from '../src/engine/engine.js';
import { EVENTS, rollEvent, seededUnit } from '../src/engine/events.js';
import { rungLevel } from '../src/engine/rules.js';

describe('seasonal events', () => {
  it('are deterministic for a given seed and tick', () => {
    expect(seededUnit(1337, 41)).toBe(seededUnit(1337, 41));
    expect(rollEvent({ seed: 7, rung: 'town' }, 49)).toEqual(rollEvent({ seed: 7, rung: 'town' }, 49));
  });

  it('happen in roughly four in ten years and only at summer start', () => {
    let hits = 0;
    for (let year = 0; year < 1000; year++) {
      expect(rollEvent({ seed: 99, rung: 'realm' }, year * 4)).toBeNull();
      if (rollEvent({ seed: 99, rung: 'realm' }, year * 4 + 1)) hits++;
    }
    expect(hits).toBeGreaterThan(350);
    expect(hits).toBeLessThan(550);
  });

  it('only offer events the current rung has unlocked', () => {
    for (let t = 1; t < 4000; t += 4) {
      const e = rollEvent({ seed: 5, rung: 'band' }, t);
      if (e) expect(rungLevel(e.def.minRung)).toBeLessThanOrEqual(rungLevel('band'));
    }
  });

  it('are gifts: no event carries a negative amount', () => {
    for (const e of EVENTS) {
      for (const v of [e.food, e.materials, e.knowledge, e.stability, e.people]) {
        expect(v ?? 0).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('log themselves and never reduce resources when they fire', () => {
    let s = createInitialState({ seed: 21 });
    let logged = 0;
    for (let i = 0; i < 400; i++) {
      const next = stepTick(s);
      if (next.logs[0]?.type === 'milestone') logged++;
      expect(next.resources.food).toBeGreaterThanOrEqual(s.resources.food);
      expect(next.resources.knowledge).toBeGreaterThanOrEqual(s.resources.knowledge);
      s = next;
    }
    expect(logged).toBeGreaterThan(10);
  });
});
