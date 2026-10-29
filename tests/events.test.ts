import { describe, expect, it } from 'vitest';
import { createInitialState, stepTick } from '../src/engine/engine.js';
import { EVENTS, MAX_WAITING_TALES, rollEvent, seededUnit } from '../src/engine/events.js';
import { rungLevel } from '../src/engine/rules.js';
import type { TimelineState } from '../src/engine/types.js';

const tales = EVENTS.filter((e) => e.kind === 'tale');
const urgent = EVENTS.filter((e) => e.kind === 'urgent');

describe('events', () => {
  it('are deterministic for a given seed and tick', () => {
    expect(seededUnit(1337, 41)).toBe(seededUnit(1337, 41));
    expect(rollEvent({ seed: 7, rung: 'town' }, 49)).toEqual(rollEvent({ seed: 7, rung: 'town' }, 49));
  });

  it('are rare: a few in a hundred years, and only at summer start', () => {
    let tale = 0;
    let rush = 0;
    for (let year = 0; year < 5000; year++) {
      expect(rollEvent({ seed: 99, rung: 'realm' }, year * 4)).toBeNull();
      const e = rollEvent({ seed: 99, rung: 'realm' }, year * 4 + 1);
      if (e?.kind === 'tale') tale++;
      if (e?.kind === 'urgent') rush++;
    }
    expect(tale).toBeGreaterThan(110);
    expect(tale).toBeLessThan(190);
    expect(rush).toBeGreaterThan(20);
    expect(rush).toBeLessThan(65);
    // About one event in five is the unwelcome, urgent kind.
    const share = rush / (rush + tale);
    expect(share).toBeGreaterThan(0.14);
    expect(share).toBeLessThan(0.3);
  });

  it('only offer events the current rung has unlocked, and none at an untended hearth', () => {
    for (let t = 1; t < 8000; t += 4) {
      const e = rollEvent({ seed: 5, rung: 'band' }, t);
      if (e) expect(rungLevel(e.minRung)).toBeLessThanOrEqual(rungLevel('band'));
      expect(rollEvent({ seed: 5, rung: 'hearth' }, t)).toBeNull();
    }
  });

  it('give every event two or three real choices', () => {
    for (const e of EVENTS) {
      expect(e.choices.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.choices.length, e.id).toBeLessThanOrEqual(3);
      for (const c of e.choices) expect(c.label.length).toBeGreaterThan(2);
    }
  });

  it('keep tales timeless: no deadline in the wording, and never only bad choices', () => {
    for (const e of tales) {
      expect(e.text, e.id).not.toMatch(/\b(tonight|today|tomorrow|now|soon|hurry|quickly|before|this (week|season|night))\b/i);
      expect(e.choices.some((c) => [c.food, c.materials, c.knowledge].every((v) => (v ?? 0) >= 0)), e.id).toBe(true);
    }
  });

  it('make urgent events a lesser-evil choice: every option costs something', () => {
    expect(urgent.length).toBeGreaterThanOrEqual(5);
    for (const e of urgent) {
      for (const c of e.choices) {
        const costs = [c.food, c.materials, c.knowledge].some((v) => (v ?? 0) < 0);
        expect(costs, `${e.id}: ${c.label}`).toBe(true);
        // Stability and people are never taken away, only resources are paid.
        expect(c.stability ?? 0).toBeGreaterThanOrEqual(0);
        expect(c.people ?? 0).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('never queue the same tale twice, and never exceed the shelf', () => {
    let s: TimelineState = { ...createInitialState({ seed: 21 }), rung: 'realm' };
    for (let i = 0; i < 30000; i++) {
      s = stepTick(s, { quiet: true });
      expect(s.waitingEvents.length).toBeLessThanOrEqual(MAX_WAITING_TALES);
      expect(new Set(s.waitingEvents.map((w) => w.eventId)).size).toBe(s.waitingEvents.length);
    }
    expect(s.waitingEvents.length).toBe(MAX_WAITING_TALES);
  });
});
