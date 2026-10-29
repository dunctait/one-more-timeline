import { DiscoveryEffects } from './discoveries.js';
import { RungId } from './types.js';

export type EdictEffects = Pick<
  DiscoveryEffects,
  'food' | 'materials' | 'knowledge' | 'all' | 'manual' | 'stability'
>;

export interface EdictDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** The rung whose slot offers this edict. */
  slot: RungId;
  effects: EdictEffects;
}

/**
 * Edicts are free-to-swap emphasis choices: each rung opens a slot with three
 * options. Swapping never costs anything, so a choice is never a mistake.
 */
export const EDICTS: EdictDef[] = [
  { id: 'hunters_way', name: "Hunters' Way", icon: '🏹', description: '+20% Food.', slot: 'band', effects: { food: 0.2 } },
  { id: 'builders_pact', name: "Builders' Pact", icon: '🛠️', description: '+20% Materials.', slot: 'band', effects: { materials: 0.2 } },
  { id: 'fireside_tales', name: 'Fireside Tales', icon: '📖', description: '+20% Knowledge.', slot: 'band', effects: { knowledge: 0.2 } },

  { id: 'open_hearth', name: 'Open Hearth', icon: '🫂', description: '+1 Stability per tick.', slot: 'settlement', effects: { stability: 1 } },
  { id: 'tool_guild', name: 'Tool Guild', icon: '⚒️', description: '+25% Materials.', slot: 'settlement', effects: { materials: 0.25 } },
  { id: 'elder_council', name: 'Elder Council', icon: '🧓', description: '+25% Knowledge.', slot: 'settlement', effects: { knowledge: 0.25 } },

  { id: 'granary_law', name: 'Granary Law', icon: '🌾', description: '+30% Food.', slot: 'village', effects: { food: 0.3 } },
  { id: 'craft_guilds', name: 'Craft Guilds', icon: '🧵', description: '+30% Materials.', slot: 'village', effects: { materials: 0.3 } },
  { id: 'learning_circle', name: 'Learning Circle', icon: '🔍', description: '+30% Knowledge.', slot: 'village', effects: { knowledge: 0.3 } },

  { id: 'market_rights', name: 'Market Rights', icon: '⚖️', description: '+8% to all production.', slot: 'town', effects: { all: 0.08 } },
  { id: 'standing_watch', name: 'Standing Watch', icon: '🛡️', description: '+2 Stability per tick.', slot: 'town', effects: { stability: 2 } },
  { id: 'scribe_corps', name: 'Scribe Corps', icon: '🪶', description: '+35% Knowledge.', slot: 'town', effects: { knowledge: 0.35 } },

  { id: 'free_trade', name: 'Free Trade', icon: '🚢', description: '+40% Materials.', slot: 'city', effects: { materials: 0.4 } },
  { id: 'public_granaries', name: 'Public Granaries', icon: '🏺', description: '+40% Food.', slot: 'city', effects: { food: 0.4 } },
  { id: 'university_charter', name: 'University Charter', icon: '🎓', description: '+40% Knowledge.', slot: 'city', effects: { knowledge: 0.4 } },

  { id: 'golden_age', name: 'Golden Age', icon: '🌟', description: '+15% to all production.', slot: 'realm', effects: { all: 0.15 } },
  { id: 'hands_of_many', name: 'Hands of the Many', icon: '🙌', description: 'Manual actions yield +100%.', slot: 'realm', effects: { manual: 1 } },
  { id: 'eternal_vigil', name: 'Eternal Vigil', icon: '🕯️', description: '+4 Stability per tick and +5% to all production.', slot: 'realm', effects: { stability: 4, all: 0.05 } },
];

export function getEdict(id: string): EdictDef | undefined {
  return EDICTS.find((e) => e.id === id);
}

export function edictsForSlot(slot: RungId): EdictDef[] {
  return EDICTS.filter((e) => e.slot === slot);
}

/** Sum of one effect across the currently chosen edicts (slot -> edict id). */
export function edictBonus(chosen: Readonly<Record<string, string>>, key: keyof EdictEffects): number {
  let total = 0;
  for (const id of Object.values(chosen)) {
    total += getEdict(id)?.effects[key] ?? 0;
  }
  return total;
}
