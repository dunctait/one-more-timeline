import { RungId, TimelineState } from './types.js';
import { relicBonus } from './relics.js';
import { rungLevel } from './rules.js';

/**
 * Seasonal events are gifts only: they can add resources, stability or
 * people, and can never take anything away ("Number only goes up").
 */
export interface EventGift {
  food?: number;
  materials?: number;
  knowledge?: number;
  stability?: number;
  /** Newcomers who settle, if there is room. */
  people?: number;
}

export interface EventChoice extends EventGift {
  label: string;
  description: string;
}

export interface EventDef {
  id: string;
  title: string;
  text: string;
  minRung: RungId;
  /** Gift sizes are multiplied by (1 + rung level * 1.5). */
  food?: number;
  materials?: number;
  knowledge?: number;
  stability?: number;
  /** Newcomers who settle, if there is room. */
  people?: number;
  /** When present, the player picks one gift instead of receiving the default one. */
  choices?: EventChoice[];
}

const BASE_EVENTS: EventDef[] = [
  { id: 'bountiful_harvest', title: 'Bountiful Harvest', text: 'The wild groves hang heavy with fruit.', minRung: 'hearth', food: 10 },
  { id: 'driftwood', title: 'Driftwood Haul', text: 'A flood leaves good timber along the riverbank.', minRung: 'hearth', materials: 8 },
  { id: 'shooting_star', title: 'Shooting Star', text: 'A streak of fire crosses the sky; everyone talks of it for weeks.', minRung: 'hearth', knowledge: 5 },
  { id: 'lost_traveller', title: 'Lost Traveller', text: 'A weary traveller shares your fire and decides to stay.', minRung: 'band', people: 1, stability: 3 },
  { id: 'good_omens', title: 'Good Omens', text: 'A rainbow arches over the camp. Spirits lift.', minRung: 'band', stability: 8 },
  { id: 'rich_ore_vein', title: 'Rich Vein', text: 'Builders stumble on a seam of fine stone.', minRung: 'settlement', materials: 12, knowledge: 2 },
  { id: 'travelling_sage', title: 'Travelling Sage', text: 'A sage trades stories for a meal and leaves notes behind.', minRung: 'settlement', knowledge: 9 },
  { id: 'harvest_festival', title: 'Harvest Festival', text: 'Music and feasting last until dawn.', minRung: 'village', food: 8, stability: 10 },
  { id: 'wandering_family', title: 'Wandering Family', text: 'A family seeking safe walls asks to join you.', minRung: 'village', people: 2 },
  { id: 'merchant_caravan', title: 'Merchant Caravan', text: 'A caravan gifts samples in hope of future trade.', minRung: 'town', food: 6, materials: 10 },
  { id: 'scholars_gift', title: "Scholar's Bequest", text: 'A dying scholar leaves a chest of tablets to your library.', minRung: 'town', knowledge: 12 },
  { id: 'royal_envoy', title: 'Envoy of a Far Realm', text: 'An envoy arrives bearing gifts and good will.', minRung: 'city', food: 10, materials: 10, knowledge: 10 },
  { id: 'migration', title: 'Great Migration', text: 'Whole clans, drawn by your fame, arrive at the gates.', minRung: 'city', people: 3, stability: 5 },
  { id: 'warm_spell', title: 'Warm Spell', text: 'An unseasonal warmth makes every task easier.', minRung: 'hearth', stability: 6 },
  { id: 'fruitful_fishing', title: 'Fruitful Fishing', text: 'The river runs thick with silver fish.', minRung: 'hearth', food: 8 },
  { id: 'clever_crow', title: 'Clever Crow', text: 'A crow that solves puzzles teaches everyone something.', minRung: 'hearth', knowledge: 4 },
  { id: 'friendly_dogs', title: 'Friendly Dogs', text: 'A pack of wild dogs adopts the camp and guards it well.', minRung: 'band', stability: 6, people: 1 },
  { id: 'honey_tree', title: 'Honey Tree', text: 'A hollow oak drips with honey.', minRung: 'band', food: 12 },
  { id: 'old_quarry', title: 'Old Quarry', text: 'Someone long ago left cut stone behind.', minRung: 'settlement', materials: 14 },
  { id: 'rainmaker', title: 'Rainmaker', text: 'Rain arrives right on time, and spirits rise with the crops.', minRung: 'settlement', food: 6, stability: 6 },
  { id: 'storyteller', title: 'Storyteller', text: 'A famous storyteller holds the whole village in thrall.', minRung: 'village', knowledge: 8, stability: 6 },
  { id: 'trade_fair', title: 'Trade Fair', text: 'Stalls fill the square for three days of bartering.', minRung: 'town', food: 6, materials: 8, stability: 5 },
  { id: 'grand_parade', title: 'Grand Parade', text: 'Banners, drums and dancing fill the avenues.', minRung: 'city', knowledge: 8, stability: 10 },
  { id: 'inventors_visit', title: "Inventor's Visit", text: 'A tinkerer shows off marvels and leaves the plans behind.', minRung: 'city', materials: 12, knowledge: 12 },
  { id: 'golden_harvest', title: 'Golden Harvest', text: 'Every field, orchard and vine is heavy beyond memory.', minRung: 'realm', food: 20, stability: 5 },
  { id: 'gentle_rain', title: 'Gentle Rain', text: 'A soft rain freshens everything.', minRung: 'hearth', food: 6, stability: 3 },
  { id: 'crystal_spring', title: 'Crystal Spring', text: 'Someone finds a spring of clear water in the hills.', minRung: 'band', stability: 8, food: 4 },
  { id: 'comet_year', title: 'Comet Year', text: 'A comet hangs over the camp for a week.', minRung: 'settlement', knowledge: 10 },
  { id: 'friendly_rivals', title: 'Friendly Rivals', text: 'A neighbouring village sends a delegation.', minRung: 'village', food: 10, materials: 10 },
  { id: 'travelling_bards', title: 'Travelling Bards', text: 'Songs and stories drift down the road.', minRung: 'village', stability: 10, knowledge: 4 },
  { id: 'bumper_barley', title: 'Bumper Barley', text: 'The barley stands taller than the farmers.', minRung: 'village', food: 16 },
  { id: 'old_ruins', title: 'Old Ruins', text: 'Diggers uncover walls from an earlier age.', minRung: 'town', materials: 20 },
  { id: 'master_mason', title: 'Master Mason', text: 'A famed mason offers a season of advice.', minRung: 'town', materials: 16, knowledge: 4 },
  { id: 'harbor_fleet', title: 'Harbour Fleet', text: 'A whole fleet puts in to trade.', minRung: 'city', food: 14, materials: 8 },
  { id: 'great_library_gift', title: 'Great Library Gift', text: 'A distant library copies its best works for you.', minRung: 'city', knowledge: 18 },
  { id: 'twin_moons', title: 'Twin Moons', text: 'Two moons share the sky and the astronomers weep with joy.', minRung: 'realm', knowledge: 16, stability: 8 },
  { id: 'imperial_tribute', title: 'Imperial Tribute', text: 'Lesser realms send tribute to your court.', minRung: 'realm', materials: 24, food: 12 },
  { id: 'astral_alignment', title: 'Astral Alignment', text: 'The heavens align exactly as your astronomers foretold.', minRung: 'realm', knowledge: 20, stability: 10 },
];

/**
 * Choice events: pick one gift. If the player is away, the first option is taken
 * on their behalf when the next event arrives. Nothing is ever lost either way.
 */
const CHOICES: Record<string, EventChoice[]> = {
  lost_traveller: [
    { label: 'Welcome them', description: 'They join your people and lift spirits.', people: 1, stability: 3 },
    { label: 'Trade stories', description: 'They share what they know, then move on.', knowledge: 6 },
  ],
  good_omens: [
    { label: 'Hold a ritual', description: 'A gathering around the fire.', stability: 8 },
    { label: 'Use the calm', description: 'Forage while the weather holds.', food: 8 },
  ],
  rich_ore_vein: [
    { label: 'Quarry the stone', description: 'Raw materials for your builders.', materials: 14 },
    { label: 'Study the strata', description: 'The rock tells a story.', knowledge: 10 },
  ],
  merchant_caravan: [
    { label: 'Buy tools', description: 'Good tools for the builders.', materials: 16 },
    { label: 'Buy grain', description: 'Full sacks for the granary.', food: 16 },
    { label: 'Buy books', description: 'Tablets and scrolls.', knowledge: 12 },
  ],
  royal_envoy: [
    { label: 'Accept gold', description: 'Materials and food for the realm.', materials: 14, food: 14 },
    { label: 'Accept scholars', description: 'A delegation of learned guests.', knowledge: 20 },
    { label: 'Accept a treaty', description: 'Peace on the borders.', stability: 12, knowledge: 8 },
  ],
  migration: [
    { label: 'Welcome everyone', description: 'Open the gates to all who come.', people: 3, stability: 5 },
    { label: 'Welcome the skilled', description: 'Take only craftspeople and scribes.', people: 1, knowledge: 12, materials: 8 },
  ],
  friendly_rivals: [
    { label: 'Exchange gifts', description: 'Grain and timber change hands.', food: 10, materials: 10 },
    { label: 'Exchange ideas', description: 'Scholars compare notes for a week.', knowledge: 14 },
  ],
  comet_year: [
    { label: 'Record it', description: 'Astronomers chart every night.', knowledge: 10 },
    { label: 'Feast under it', description: 'A festival for the whole camp.', stability: 10, food: 6 },
  ],
  old_ruins: [
    { label: 'Salvage the stone', description: 'Cut blocks, ready to use.', materials: 20 },
    { label: 'Excavate carefully', description: 'Learn who built them.', knowledge: 16 },
  ],
  astral_alignment: [
    { label: 'Observe the sky', description: 'A great leap in understanding.', knowledge: 26 },
    { label: 'Hold a festival', description: 'The whole realm celebrates.', stability: 14, food: 12 },
  ],
};

export const EVENTS: EventDef[] = BASE_EVENTS.map((e) =>
  CHOICES[e.id] ? { ...e, choices: CHOICES[e.id] } : e
);

/** Chance that a given year brings an event. */
export const EVENT_CHANCE = 0.45;

/** Every timeline gets its own variation of the same seed, so no two timelines repeat their events. */
export function timelineSeed(seed: number, timelinesCreated = 0): number {
  return (seed + Math.imul(timelinesCreated, 7919)) >>> 0;
}

/** Deterministic hash in [0, 1) from the seed and tick; no hidden state. */
export function seededUnit(seed: number, tick: number, salt = 0): number {
  let h = (seed ^ Math.imul(tick + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

export interface RolledEvent {
  def: EventDef;
  food: number;
  materials: number;
  knowledge: number;
  stability: number;
  people: number;
}

/** Events roll once per year, at the start of summer. */
export function rollEvent(
  state: Pick<TimelineState, 'seed' | 'rung'> & Partial<Pick<TimelineState, 'timelinesCreated' | 'relics'>>,
  tick: number
): RolledEvent | null {
  if (tick % 4 !== 1) return null;
  const seed = timelineSeed(state.seed, state.timelinesCreated);
  const chance = EVENT_CHANCE + relicBonus(state.relics ?? [], 'eventChance');
  if (seededUnit(seed, tick) >= chance) return null;
  const level = rungLevel(state.rung);
  const pool = EVENTS.filter((e) => rungLevel(e.minRung) <= level);
  const def = pool[Math.floor(seededUnit(seed, tick, 1) * pool.length)];
  const scale = 1 + level * 1.5;
  return {
    def,
    food: (def.food ?? 0) * scale,
    materials: (def.materials ?? 0) * scale,
    knowledge: (def.knowledge ?? 0) * scale,
    stability: def.stability ?? 0,
    people: def.people ?? 0,
  };
}

/** Scales a gift for the rung it is received at (stability and people are not scaled). */
export function scaleGift(gift: EventGift, rungLevelNow: number): Required<EventGift> {
  const scale = 1 + rungLevelNow * 1.5;
  return {
    food: (gift.food ?? 0) * scale,
    materials: (gift.materials ?? 0) * scale,
    knowledge: (gift.knowledge ?? 0) * scale,
    stability: gift.stability ?? 0,
    people: gift.people ?? 0,
  };
}
