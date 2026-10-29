import { RungId } from './types.js';

export interface RelicEffects {
  /** Additive percentage bonuses, e.g. 0.2 = +20%. */
  food?: number;
  materials?: number;
  knowledge?: number;
  manual?: number;
  /** Extra hours of away progress. */
  awayHours?: number;
  /** Extra chance (0.1 = +10 points) that a year brings an event. */
  eventChance?: number;
  /** Extra Food at the dawn of every timeline. */
  startFood?: number;
  /** Extra people at the dawn of every timeline. */
  startPeople?: number;
  /** Bonus to Insight gained from a Jumpback. */
  insight?: number;
}

export interface RelicDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Relics can only be found once the timeline has reached this rung. */
  minRung: RungId;
  effects: RelicEffects;
  /** Trophy relics are earned by completing this challenge and are never found in events. */
  trophyOf?: string;
}

/**
 * Relics are rare finds from seasonal events. They are never lost, even by
 * the deepest prestige, and each one sends back a small function or bonus.
 */
export const RELICS: RelicDef[] = [
  { id: 'seed_bag', name: 'Seed Bag', icon: '🌰', description: 'Every timeline begins with +20 Food in the stores.', minRung: 'hearth', effects: { startFood: 20 } },
  { id: 'whetstone', name: 'Whetstone', icon: '🪨', description: 'Manual gathering yields +25%.', minRung: 'hearth', effects: { manual: 0.25 } },
  { id: 'ancestor_mask', name: 'Ancestor Mask', icon: '🎭', description: 'Every timeline begins with one more person at the fire.', minRung: 'band', effects: { startPeople: 1 } },
  { id: 'oak_staff', name: 'Oak Staff', icon: '🌳', description: 'Foragers bring in +20% Food.', minRung: 'band', effects: { food: 0.2 } },
  { id: 'iron_chisel', name: 'Iron Chisel', icon: '⛏️', description: 'Builders produce +20% Materials.', minRung: 'settlement', effects: { materials: 0.2 } },
  { id: 'bronze_compass', name: 'Bronze Compass', icon: '🧭', description: 'Events arrive half again as often.', minRung: 'settlement', effects: { eventChance: 0.5 } },
  { id: 'star_chart', name: 'Star Chart', icon: '🗺️', description: 'Scholars and libraries produce +20% Knowledge.', minRung: 'village', effects: { knowledge: 0.2 } },
  { id: 'cracked_hourglass', name: 'Cracked Hourglass', icon: '⏳', description: 'Your timeline keeps growing 4 hours longer while you are away.', minRung: 'village', effects: { awayHours: 4 } },
  { id: 'chronometer', name: 'Chronometer', icon: '⌚', description: 'Jumpbacks yield +10% more Insight.', minRung: 'town', effects: { insight: 0.1 } },
  { id: 'hermits_lantern', name: "Hermit's Lantern", icon: '🏮', description: 'Trophy: Foragers and the land yield +25% Food.', minRung: 'hearth', effects: { food: 0.25 }, trophyOf: 'lone_hearth' },
  { id: 'silent_quill', name: 'Silent Quill', icon: '🪶', description: 'Trophy: Knowledge production is +25%.', minRung: 'hearth', effects: { knowledge: 0.25 }, trophyOf: 'quiet_scholars' },
  { id: 'ember_pendant', name: 'Ember Pendant', icon: '📿', description: 'Trophy: Food, Materials and Knowledge are all +10%.', minRung: 'hearth', effects: { food: 0.1, materials: 0.1, knowledge: 0.1 }, trophyOf: 'cold_resolve' },
  { id: 'calloused_gloves', name: 'Calloused Gloves', icon: '🧤', description: 'Trophy: Builders and the land yield +25% Materials.', minRung: 'hearth', effects: { materials: 0.25 }, trophyOf: 'hands_only' },
  { id: 'architects_rule', name: "Architect's Rule", icon: '📏', description: 'Trophy: Materials and Knowledge are +15%.', minRung: 'hearth', effects: { materials: 0.15, knowledge: 0.15 }, trophyOf: 'grand_plan' },
  { id: 'crown_of_haste', name: 'Crown of Haste', icon: '🎖️', description: 'Trophy: Food, Materials and Knowledge are all +15%, and Jumpbacks give +10% Insight.', minRung: 'hearth', effects: { food: 0.15, materials: 0.15, knowledge: 0.15, insight: 0.1 }, trophyOf: 'royal_road' },
  { id: 'swift_sandals', name: 'Swift Sandals', icon: '👟', description: 'Trophy: Manual gathering yields +50%.', minRung: 'hearth', effects: { manual: 0.5 }, trophyOf: 'swift_dawn' },
];

/** Chance, per event, that a relic turns up with it (while any remain). */
/** Chance that deciding an event turns up a relic. */
export const RELIC_CHANCE = 0.2;

export function getRelic(id: string): RelicDef | undefined {
  return RELICS.find((r) => r.id === id);
}

/** Sum of one effect across the relics a player owns. */
export function relicBonus(owned: readonly string[], key: keyof RelicEffects): number {
  let total = 0;
  for (const id of owned) {
    total += getRelic(id)?.effects[key] ?? 0;
  }
  return total;
}
