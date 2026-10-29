import { describe, expect, it } from 'vitest';
import { createInitialState, executeAction, fastForward, MAX_AWAY_TICKS, stepTick } from '../src/engine/engine.js';
import { exportSaveString, parseSaveString } from '../src/ui/storage.js';

describe('away progress', () => {
  it('never loses anything while the player is away', () => {
    let s = createInitialState();
    s = executeAction({ ...s, rung: 'band' }, { type: 'DEV_ADD_RESOURCES', amount: 20 }).state;
    const { state, summary } = fastForward(s, 3600);
    expect(summary.ticks).toBe(3600);
    expect(state.resources.food).toBeGreaterThanOrEqual(s.resources.food);
    expect(state.resources.materials).toBeGreaterThanOrEqual(s.resources.materials);
    expect(state.resources.knowledge).toBeGreaterThanOrEqual(s.resources.knowledge);
    expect(state.population.total).toBeGreaterThanOrEqual(s.population.total);
    expect(summary.years).toBe(900);
  });

  it('caps absence at eight hours', () => {
    const { summary } = fastForward(createInitialState(), MAX_AWAY_TICKS * 3);
    expect(summary.ticks).toBe(MAX_AWAY_TICKS);
  });
});

describe('conformance', () => {
  it('fastForward equals ticking one step at a time', () => {
    let ticked = executeAction({ ...createInitialState({ seed: 9 }), rung: 'village' }, { type: 'DEV_ADD_RESOURCES', amount: 30 }).state;
    const start = ticked;
    for (let i = 0; i < 500; i++) ticked = stepTick(ticked, { quiet: true });
    expect(fastForward(start, 500).state).toEqual(ticked);
  });
});

describe('save strings', () => {
  it('round-trips a timeline through export and import', () => {
    const s = fastForward(createInitialState(), 200).state;
    const parsed = parseSaveString(exportSaveString(s));
    expect(parsed).toEqual(s);
  });

  it('rejects anything that is not a save string', () => {
    expect(parseSaveString('hello')).toBeNull();
    expect(parseSaveString('OMT1:!!!notbase64')).toBeNull();
    expect(parseSaveString('OMT1:' + btoa('{"schemaVersion":2}'))).toBeNull();
  });
});

describe('hostile and old saves', () => {
  it('survive wrongly typed fields and stale storage', () => {
    const s = createInitialState();
    const bad = {
      ...s,
      features: 'x',
      discoveries: 5,
      achievements: [1, 'rung_band'],
      edicts: { band: 'not_real', realm: 'golden_age' },
      echoes: 'lots',
      buildings: { hut: 'many', granary: 2 },
      rung: 'nonsense',
      caps: { food: 1, materials: 1, knowledge: 1 },
    } as unknown as ReturnType<typeof createInitialState>;
    const fixed = parseSaveString(exportSaveString(bad));
    expect(fixed).not.toBeNull();
    expect(fixed!.features).toEqual([]);
    expect(fixed!.discoveries).toEqual([]);
    expect(fixed!.achievements).toEqual(['rung_band']);
    expect(fixed!.edicts).toEqual({ realm: 'golden_age' });
    expect(fixed!.echoes).toBe(0);
    expect(fixed!.buildings.hut).toBe(0);
    expect(fixed!.rung).toBe('hearth');
    expect(fixed!.caps.food).toBe(60 + 200);
    expect(() => stepTick(fixed!)).not.toThrow();
  });
});

describe('original v0.1 saves', () => {
  it('load, tick and render after the later systems were added', async () => {
    const { buildTimelineViewModel } = await import('../src/ui/view-model.js');
    const s = createInitialState() as unknown as Record<string, unknown>;
    for (const key of ['echoes', 'resonance', 'eternity', 'features', 'automation', 'prestigeCounts', 'achievements', 'history', 'relics', 'discoveries', 'edicts']) {
      delete s[key];
    }
    s.rulesetVersion = '0.1.0';
    s.learningGraceTicks = 8;
    s.buildings = { hut: 2, granary: 1, workshop: 0, fire_pit: 0, chronicle_stone: 0 };
    s.rung = 'band';
    const loaded = parseSaveString(exportSaveString(s as unknown as ReturnType<typeof createInitialState>));
    expect(loaded).not.toBeNull();
    expect(loaded!.buildings.hut).toBe(2);
    expect(loaded!.buildings.spire).toBe(0);
    expect(loaded!.rulesetVersion).toBe('0.2.0');
    expect(loaded!.caps.food).toBe(60 + 100);
    expect(loaded!.population.max).toBe(12 + 4);
    const next = stepTick(loaded!);
    expect(next.tick).toBe(1);
    expect(buildTimelineViewModel(next).achievements.total).toBeGreaterThan(0);
  });
});

describe('chronicle', () => {
  it('can be appended to without exceeding fifty entries', async () => {
    const { appendLog } = await import('../src/engine/engine.js');
    let s = createInitialState();
    for (let i = 0; i < 80; i++) s = appendLog(s, `entry ${i}`);
    expect(s.logs).toHaveLength(50);
    expect(s.logs[0].text).toBe('entry 79');
  });
});
