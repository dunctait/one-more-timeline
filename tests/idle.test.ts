import { describe, expect, it } from 'vitest';
import { createInitialState, stepTick } from '../src/engine/engine.js';
import { checkRungPrerequisites, START_POPULATION } from '../src/engine/rules.js';

describe('a hearth nobody has tended', () => {
  it('begins with a whole band of twelve people', () => {
    const s = createInitialState();
    expect(START_POPULATION).toBe(12);
    expect(s.population.total).toBe(12);
    expect(s.population.max).toBe(12);
  });

  it('never drifts into the first Rung on its own, however long it waits', () => {
    let s = createInitialState();
    const start = { ...s.resources };
    for (let i = 0; i < 20_000; i++) s = stepTick(s);
    expect(s.resources.food).toBe(start.food);
    expect(s.resources.knowledge).toBe(start.knowledge);
    expect(s.resources.materials).toBe(start.materials);
    expect(s.population.total).toBe(12);
    expect(checkRungPrerequisites(s, 'band').eligible).toBe(false);
  });
});
