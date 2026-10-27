import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/engine/engine.js';
import {
  buildTimelineViewModel,
  formatRate,
  getStabilityLabel,
} from '../src/ui/view-model.js';

describe('UI View Model', () => {
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

    // Initial hearth rung should show forager and builder locked
    const foragerRole = vm.population.roles.find((r) => r.id === 'forager');
    expect(foragerRole?.unlocked).toBe(false);

    // Buildings at hearth should be locked
    const hutBuilding = vm.buildings.find((b) => b.id === 'hut');
    expect(hutBuilding?.unlocked).toBe(false);

    // Time jump should be ineligible at Year 1
    expect(vm.timeJump.eligible).toBe(false);
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
});
