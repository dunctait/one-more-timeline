import { describe, expect, it } from 'vitest';
import { createInitialState, executeAction } from '../src/engine/engine.js';
import { loadGame, isDevMode, saveGame, setDevMode } from '../src/ui/storage.js';
import {
  buildTimelineViewModel,
  countNewLogIds,
  formatRate,
  getStabilityLabel,
  PRESTIGE_TOAST_MESSAGE,
  shouldShowPrestigeToast,
} from '../src/ui/view-model.js';

describe('UI View Model & Storage', () => {
  it('ensures dev mode is strictly OFF by default', () => {
    const store = new Map<string, string>();
    const mockLocalStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, val),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
    (globalThis as any).localStorage = mockLocalStorage;

    mockLocalStorage.clear();
    expect(isDevMode()).toBe(false);

    setDevMode(true);
    expect(isDevMode()).toBe(true);

    setDevMode(false);
    expect(isDevMode()).toBe(false);
  });
  it('quarantines malformed saves and returns a clean load path', () => {
    const store = new Map<string, string>([['omt.save.v1', '{"schemaVersion":1}']]);
    (globalThis as any).localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    };

    expect(loadGame()).toBeNull();
    expect(store.has('omt.save.v1')).toBe(false);
    expect(store.get('omt.save.v1.invalid')).toBe('{"schemaVersion":1}');
  });

  it('returns a failed result when local save persistence throws', () => {
    (globalThis as any).localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
    };

    expect(saveGame(createInitialState()).ok).toBe(false);
  });

  it('tracks unread logs by stable event id across ring-buffer replacement', () => {
    const first = { id: 'new-1', tick: 1, year: 1, text: 'first', type: 'info' as const };
    const second = { id: 'new-2', tick: 2, year: 1, text: 'second', type: 'info' as const };
    const initial = countNewLogIds([first], new Set(['old-1']));
    const replacement = countNewLogIds([second], initial.updatedSeenIds);

    expect(initial.count).toBe(1);
    expect(replacement.count).toBe(1);
  });

  it('formats rates cleanly', () => {
    expect(formatRate(1.5)).toBe('+1.5/t');
    expect(formatRate(-0.5)).toBe('-0.5/t');
    expect(formatRate(0)).toBe('0.0/t');
  });

  it('calculates stability labels and classes', () => {
    expect(getStabilityLabel(85)).toEqual({
      label: 'Thriving',
      statusClass: 'status-thriving',
    });
    expect(getStabilityLabel(65)).toEqual({
      label: 'Stable',
      statusClass: 'status-stable',
    });
    expect(getStabilityLabel(45)).toEqual({
      label: 'Strained',
      statusClass: 'status-strained',
    });
    expect(getStabilityLabel(15)).toEqual({
      label: 'Critical',
      statusClass: 'status-critical',
    });
    expect(getStabilityLabel(0)).toEqual({
      label: 'Starving',
      statusClass: 'status-starving',
    });
  });

  it('projects view model state from engine state without mutating it', () => {
    const state = createInitialState();
    const vm = buildTimelineViewModel(state);

    expect(vm.header.year).toBe(1);
    expect(vm.header.season).toBe('Spring');
    expect(vm.header.rungName).toBe('Solitary Hearth');
    expect(vm.resources.food.current).toBe(state.resources.food);
    expect(vm.resources.food.max).toBe(state.caps.food);

    // Initial hearth rung should show forager and builder locked with prerequisite
    const foragerRole = vm.population.roles.find((r) => r.id === 'forager');
    expect(foragerRole?.unlocked).toBe(false);
    expect(foragerRole?.unlockPrereq).toContain('Gathering Band');

    // Buildings at hearth should be locked with prerequisite
    const hutBuilding = vm.buildings.find((b) => b.id === 'hut');
    expect(hutBuilding?.unlocked).toBe(false);
    expect(hutBuilding?.unlockPrereq).toContain('Gathering Band');

    // Actions
    expect(vm.actions.canForage).toBe(true);
    expect(vm.actions.canScavenge).toBe(true);
    expect(vm.actions.canStudy).toBe(true);
    expect(vm.actions.actionPacing).toContain('resolve immediately');
    expect(vm.actions.pacing).toContain('Act quickly');
    expect(vm.actions.learningGrace).toContain('Learning grace');

    // Next rung prerequisite items
    expect(vm.rungProgression.nextRung).not.toBeNull();
    expect(vm.rungProgression.nextRung?.items.length).toBeGreaterThan(0);

    // Time jump should be ineligible at Year 1
    expect(vm.timeJump.eligible).toBe(false);
  });

  it('shows actionable badges for unassigned population and affordable buildings', () => {
    const state = createInitialState();
    state.rung = 'settlement';
    state.population.roles.unassigned = 2;
    state.resources.materials = 30;
    state.resources.food = 20;
    state.resources.knowledge = 20;

    const vm = buildTimelineViewModel(state);

    expect(vm.population.unallocated).toBe(2);
    expect(vm.tabBadges.hearth).toBe(true);
    expect(vm.tabBadges.hearthCount).toBe(2);
    expect(vm.buildings.some((building) => building.unlocked && building.affordable)).toBe(true);
    expect(vm.tabBadges.settlement).toBe(true);
    expect(vm.tabBadges.settlementCount).toBeGreaterThan(0);
    expect(vm.tabBadges.chronicle).toBe(false);
  });

  it('shows the Evolution badge when ascension or Time Jump is ready', () => {
    const ascensionState = createInitialState();
    ascensionState.year = 2;
    ascensionState.resources.food = 12;
    ascensionState.resources.knowledge = 12;
    const ascensionVm = buildTimelineViewModel(ascensionState);
    expect(ascensionVm.rungProgression.nextRung?.eligible).toBe(true);
    expect(ascensionVm.tabBadges.evolution).toBe(true);

    const prestigeState = createInitialState();
    prestigeState.year = 3;
    const prestigeVm = buildTimelineViewModel(prestigeState);
    expect(prestigeVm.timeJump.eligible).toBe(true);
    expect(prestigeVm.tabBadges.evolution).toBe(true);
  });

  it('exposes plain-language Insight benefits and its Time Jump calculation', () => {
    const state = createInitialState({ insight: 3 });
    state.year = 4;
    state.population.total = 8;
    state.resources.knowledge = 80;

    const vm = buildTimelineViewModel(state);

    expect(vm.timeJump.breakdown.whatIsInsight).toContain('Permanent cosmic memory');
    expect(vm.timeJump.currentMultiplier).toContain('+3% permanent production');
    expect(vm.timeJump.currentMultiplier).toContain('all roles and builders');
    expect(vm.timeJump.projectedGain).toContain('+');
    expect(vm.timeJump.projectedGain).toContain('production boost next cycle');
    expect(vm.timeJump.startingBonus).toContain('per Insight');
    expect(vm.timeJump.breakdown.formulaExplanation).toContain('Year');
    expect(vm.timeJump.breakdown.formulaExplanation).toContain('Highest Rung');
    expect(vm.timeJump.confirmationText).toContain('Next dawn reserves');
  });

  it('reflects unlocked roles and affordable buildings at Settled Camp', () => {
    const state = createInitialState();
    state.rung = 'settlement';
    state.population.total = 4;
    state.population.roles.unassigned = 2;
    state.resources.materials = 30;
    state.resources.food = 20;

    const vm = buildTimelineViewModel(state);

    const foragerRole = vm.population.roles.find((r) => r.id === 'forager');
    expect(foragerRole?.unlocked).toBe(true);
    expect(foragerRole?.canAdd).toBe(true);

    const hutBuilding = vm.buildings.find((b) => b.id === 'hut');
    expect(hutBuilding?.unlocked).toBe(true);
    expect(hutBuilding?.canAfford).toBe(true);
  });

  it('simulates a complete opening progression sequence into Settled Camp', () => {
    let state = createInitialState({ seed: 101 });
    // Rapid gathering
    for (let i = 0; i < 8; i++) {
      state = executeAction(state, { type: 'STUDY' }).state;
      state = executeAction(state, { type: 'FORAGE' }).state;
    }
    for (let i = 0; i < 4; i++) {
      state = executeAction(state, { type: 'TICK' }).state;
    }

    let vm = buildTimelineViewModel(state);
    expect(vm.rungProgression.nextRung?.eligible).toBe(true);

    // Ascend to Gathering Band
    state = executeAction(state, { type: 'ADVANCE_RUNG', rungId: 'band' }).state;
    vm = buildTimelineViewModel(state);
    expect(vm.header.rungName).toBe('Gathering Band');
    // Huts should now be unlocked in settlement tab
    const hut = vm.buildings.find((b) => b.id === 'hut');
    expect(hut?.unlocked).toBe(true);

    // Gather for Hut and build
    for (let i = 0; i < 8; i++) {
      state = executeAction(state, { type: 'SCAVENGE' }).state;
      state = executeAction(state, { type: 'FORAGE' }).state;
    }
    state = executeAction(state, { type: 'BUILD', buildingId: 'hut' }).state;
    expect(state.buildings.hut).toBe(1);

    // Gather remaining materials & knowledge for Settled Camp
    for (let i = 0; i < 15; i++) {
      state = executeAction(state, { type: 'SCAVENGE' }).state;
      state = executeAction(state, { type: 'STUDY' }).state;
      state = executeAction(state, { type: 'FORAGE' }).state;
    }
    while (state.year < 4) {
      state = executeAction(state, { type: 'TICK' }).state;
    }

    vm = buildTimelineViewModel(state);
    expect(vm.rungProgression.nextRung?.eligible).toBe(true);
    expect(vm.rungProgression.nextRung?.id).toBe('settlement');

    state = executeAction(state, { type: 'ADVANCE_RUNG', rungId: 'settlement' }).state;
    vm = buildTimelineViewModel(state);
    expect(vm.header.rungName).toBe('Settled Camp');
    // Workshops, fire pits, and chronicle stones are now visibly unlocked
    const workshop = vm.buildings.find((b) => b.id === 'workshop');
    const firePit = vm.buildings.find((b) => b.id === 'fire_pit');
    const chronicle = vm.buildings.find((b) => b.id === 'chronicle_stone');
    expect(workshop?.unlocked).toBe(true);
    expect(firePit?.unlocked).toBe(true);
    expect(chronicle?.unlocked).toBe(true);
  });

  it('evaluates prestige toast eligibility correctly across timeline runs', () => {
    let state = createInitialState({ seed: 777 });
    expect(state.year).toBe(1);
    expect(shouldShowPrestigeToast(state, null)).toBe(false);

    state.year = 2;
    expect(shouldShowPrestigeToast(state, null)).toBe(false);

    // Year 3 reached: prestige is ready and toast should fire
    state.year = 3;
    expect(shouldShowPrestigeToast(state, null)).toBe(true);
    expect(PRESTIGE_TOAST_MESSAGE).toContain('Temporal Horizon Reached');
    expect(PRESTIGE_TOAST_MESSAGE).toContain('Time Jump is now ready in Evolution');

    // Dismissing for this timeline suppresses the toast for this run
    expect(shouldShowPrestigeToast(state, state.timelineId)).toBe(false);

    // Execute Time Jump to start a new timeline cycle
    const jumpResult = executeAction(state, { type: 'TIME_JUMP' });
    expect(jumpResult.success).toBe(true);
    const nextTimeline = jumpResult.state;
    expect(nextTimeline.timelineId).not.toBe(state.timelineId);
    expect(nextTimeline.year).toBe(1);

    // In Year 1 of new timeline, toast is not active
    expect(shouldShowPrestigeToast(nextTimeline, state.timelineId)).toBe(false);

    // Once Year 3 is reached in the new timeline, toast fires again for the new run
    nextTimeline.year = 3;
    expect(shouldShowPrestigeToast(nextTimeline, state.timelineId)).toBe(true);
  });
});
