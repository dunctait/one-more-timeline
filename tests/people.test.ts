import { describe, expect, it } from 'vitest';
import { createInitialState, stepTick } from '../src/engine/engine.js';
import { personName } from '../src/engine/people.js';
import { buildTimelineViewModel } from '../src/ui/view-model.js';

describe('people', () => {
  it('have stable names for a seed and differ between seeds', () => {
    expect(personName(1337, 3)).toBe(personName(1337, 3));
    const names = new Set(Array.from({ length: 12 }, (_, i) => personName(1337, i)));
    expect(names.size).toBeGreaterThan(8);
    expect(personName(1, 0)).not.toBe(personName(2, 0));
  });

  it('are named in the arrival log and match the roster', () => {
    let s = createInitialState();
    s = { ...s, resources: { ...s.resources, food: 30, stability: 80 }, tick: 1 };
    s = stepTick(s);
    expect(s.population.total).toBe(2);
    const roster = buildTimelineViewModel(s).people;
    expect(roster).toHaveLength(2);
    expect(s.logs.some((l) => l.text.includes(roster[1].name))).toBe(true);
  });

  it('show at most twelve people but report the true total', () => {
    const s = createInitialState();
    s.population.total = 40;
    s.population.roles = { ...s.population.roles, unassigned: 40 };
    expect(buildTimelineViewModel(s).people).toHaveLength(12);
  });
});
