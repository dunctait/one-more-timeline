import { RungId } from './types.js';

export interface DiscoveryEffects {
  /** Additive percentage bonuses, e.g. 0.15 = +15%. */
  food?: number;
  materials?: number;
  knowledge?: number;
  /** Bonus applied to every resource's production. */
  all?: number;
  /** Bonus to every storage cap. */
  caps?: number;
  /** Bonus to manual Forage / Scavenge / Study yields. */
  manual?: number;
  /** Flat Stability per tick. */
  stability?: number;
  /** Flat maximum population. */
  popMax?: number;
}

export interface DiscoveryDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  minRung: RungId;
  cost: number;
  effects: DiscoveryEffects;
  /** Deeper prestige currencies that must be banked before this can be researched. */
  requires?: { echoes?: number; resonance?: number; eternity?: number };
}

/** Whether the legacy a player has banked opens this discovery (rung is checked separately). */
export function legacyMet(
  state: { echoes: number; resonance: number; eternity: number },
  d: DiscoveryDef
): boolean {
  const r = d.requires;
  return !r || (state.echoes >= (r.echoes ?? 0) && state.resonance >= (r.resonance ?? 0) && state.eternity >= (r.eternity ?? 0));
}

export function legacyNote(d: DiscoveryDef): string {
  const r = d.requires;
  if (!r) return '';
  const parts = [
    r.echoes ? `${r.echoes} Echoes` : null,
    r.resonance ? `${r.resonance} Resonance` : null,
    r.eternity ? `${r.eternity} Eternity Mark${r.eternity > 1 ? 's' : ''}` : null,
  ].filter(Boolean);
  return `Needs ${parts.join(' and ')}`;
}

/** Discoveries are researched with Knowledge and are rediscovered each timeline. */
export const DISCOVERIES: DiscoveryDef[] = [
  { id: 'fire_hardening', name: 'Fire Hardening', icon: '🔥', description: 'Wood hardened in embers lasts longer: +10% Materials.', minRung: 'band', cost: 10, effects: { materials: 0.1 } },
  { id: 'foraging_lore', name: 'Foraging Lore', icon: '🌿', description: 'Which roots are safe, and where they grow: +15% Food.', minRung: 'band', cost: 12, effects: { food: 0.15 } },
  { id: 'granary_seals', name: 'Granary Seals', icon: '🏺', description: 'Clay seals keep stores fresh: +10% to all storage.', minRung: 'settlement', cost: 25, effects: { caps: 0.1 } },
  { id: 'oral_tradition', name: 'Oral Tradition', icon: '🗣️', description: 'Stories carry knowledge across generations: +15% Knowledge.', minRung: 'settlement', cost: 30, effects: { knowledge: 0.15 } },
  { id: 'hand_tools', name: 'Hand Tools', icon: '🪓', description: 'Better tools for every task: manual actions yield +50%.', minRung: 'settlement', cost: 35, effects: { manual: 0.5 } },
  { id: 'herbal_medicine', name: 'Herbal Medicine', icon: '🌱', description: 'Poultices and teas: +1 Stability per tick.', minRung: 'village', cost: 60, effects: { stability: 1 } },
  { id: 'crop_rotation', name: 'Crop Rotation', icon: '🌾', description: 'Resting fields in turn: +25% Food.', minRung: 'village', cost: 80, effects: { food: 0.25 } },
  { id: 'surveying', name: 'Surveying', icon: '📐', description: 'Cleverly planned lanes make room for 2 more people.', minRung: 'village', cost: 90, effects: { popMax: 2 } },
  { id: 'masonry', name: 'Masonry', icon: '🧱', description: 'Cut stone and mortar: +25% Materials.', minRung: 'town', cost: 130, effects: { materials: 0.25 } },
  { id: 'writing', name: 'Writing', icon: '✍️', description: 'Records outlive memory: +25% Knowledge.', minRung: 'town', cost: 150, effects: { knowledge: 0.25 } },
  { id: 'coinage', name: 'Coinage', icon: '🪙', description: 'Value you can carry: +15% to all storage.', minRung: 'town', cost: 170, effects: { caps: 0.15 } },
  { id: 'irrigation', name: 'Irrigation', icon: '💧', description: 'Canals feed the fields: +40% Food.', minRung: 'city', cost: 250, effects: { food: 0.4 } },
  { id: 'philosophy', name: 'Philosophy', icon: '🏛️', description: 'Asking better questions: +10% to all production.', minRung: 'city', cost: 300, effects: { all: 0.1 } },
  { id: 'civil_law', name: 'Civil Law', icon: '⚖️', description: 'Orderly neighbourhoods fit 6 more people.', minRung: 'city', cost: 330, effects: { popMax: 6 } },
  { id: 'astronomy', name: 'Astronomy', icon: '🔭', description: 'Charting the heavens: +50% Knowledge.', minRung: 'realm', cost: 380, effects: { knowledge: 0.5 } },
  { id: 'grand_engineering', name: 'Grand Engineering', icon: '🏗️', description: 'Machines that lift mountains: +50% Materials.', minRung: 'realm', cost: 420, effects: { materials: 0.5 } },
  { id: 'unified_theory', name: 'Unified Theory', icon: '🌌', description: 'Everything connects: +25% to all production and +25% to all storage.', minRung: 'realm', cost: 460, effects: { all: 0.25, caps: 0.25 } },
  { id: 'echoed_harvests', name: 'Echoed Harvests', icon: '🌅', description: 'Remembered seasons: +30% Food.', minRung: 'town', cost: 160, effects: { food: 0.3 }, requires: { echoes: 1 } },
  { id: 'echoed_works', name: 'Echoed Works', icon: '🏺', description: 'Remembered craft: +30% Materials.', minRung: 'town', cost: 170, effects: { materials: 0.3 }, requires: { echoes: 3 } },
  { id: 'echoed_wisdom', name: 'Echoed Wisdom', icon: '📜', description: 'Remembered lessons: +35% Knowledge.', minRung: 'city', cost: 260, effects: { knowledge: 0.35 }, requires: { echoes: 5 } },
  { id: 'resonant_design', name: 'Resonant Design', icon: '🔮', description: 'Buildings that hum: +20% to all storage.', minRung: 'city', cost: 280, effects: { caps: 0.2 }, requires: { resonance: 1 } },
  { id: 'resonant_minds', name: 'Resonant Minds', icon: '🧠', description: 'Thoughts that carry: +15% to all production.', minRung: 'realm', cost: 400, effects: { all: 0.15 }, requires: { resonance: 3 } },
  { id: 'eternal_insight', name: 'Eternal Insight', icon: '♾️', description: 'Beyond time: +25% to all production.', minRung: 'realm', cost: 440, effects: { all: 0.25 }, requires: { eternity: 1 } },
];

export function getDiscovery(id: string): DiscoveryDef | undefined {
  return DISCOVERIES.find((d) => d.id === id);
}

/** Sum of one effect across researched discoveries. */
export function discoveryBonus(researched: readonly string[], key: keyof DiscoveryEffects): number {
  let total = 0;
  for (const id of researched) {
    total += getDiscovery(id)?.effects[key] ?? 0;
  }
  return total;
}
