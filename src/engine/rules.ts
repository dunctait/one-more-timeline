import {
  BuildingId,
  BuildingsMap,
  NetRates,
  AutomationKey,
  FeatureId,
  PrestigeTier,
  RoleId,
  TradeableResource,
  Season,
  RungId,
  TimelineState,
} from './types.js';
import { discoveryBonus } from './discoveries.js';
import { edictBonus } from './edicts.js';
import { relicBonus } from './relics.js';

export const SEASONS: readonly ['Spring', 'Summer', 'Autumn', 'Winter'] = [
  'Spring',
  'Summer',
  'Autumn',
  'Winter',
] as const;

export interface SeasonProfile {
  forager: number;
  builder: number;
  scholar: number;
  note: string;
}

/** Every season is a boost to something; none is a penalty. */
export const SEASON_PROFILES: Record<Season, SeasonProfile> = {
  Spring: { forager: 1.5, builder: 1.0, scholar: 1.0, note: 'Spring: fresh growth. Foragers yield 1.5 Food each.' },
  Summer: { forager: 1.5, builder: 1.2, scholar: 1.0, note: 'Summer: long days. Builders produce +20% Materials.' },
  Autumn: { forager: 2.0, builder: 1.0, scholar: 1.0, note: 'Autumn: harvest. Foragers yield 2.0 Food each.' },
  Winter: { forager: 0.9, builder: 1.0, scholar: 1.25, note: 'Winter: long nights. Scholars produce +25% Knowledge; foraging is slower.' },
};

export interface BuildingEffects {
  popMax?: number;
  foodCap?: number;
  materialsCap?: number;
  knowledgeCap?: number;
  /** Flat per-tick production per building. */
  food?: number;
  materials?: number;
  knowledge?: number;
  stability?: number;
  /** Extra Materials per Builder per tick. */
  builderYield?: number;
  /** Percentage bonus to all production, e.g. 0.05 = +5%. */
  allProduction?: number;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  unlockedAt: RungId;
  baseCost: {
    materials: number;
    food?: number;
    knowledge?: number;
  };
  costMultiplier: number;
  effects: BuildingEffects;
  /** Wonders: at most this many may stand in one timeline. */
  maxCount?: number;
}

type WonderId = 'great_hearth_hall' | 'standing_stones' | 'triumphal_arch' | 'colossus' | 'wonder_of_ages';

const CORE_BUILDINGS: Omit<Record<BuildingId, BuildingDef>, WonderId> = {
  hut: {
    id: 'hut',
    name: 'Thatched Hut',
    description: 'A modest shelter against the wind. Increases maximum population by +2.',
    unlockedAt: 'band',
    baseCost: { materials: 10, food: 5 },
    costMultiplier: 1.2,
    effects: { popMax: 2 },
  },
  granary: {
    id: 'granary',
    name: 'Elevated Granary',
    description: 'Dry woven storage protecting harvest from vermin. Increases Food capacity by +50.',
    unlockedAt: 'band',
    baseCost: { materials: 15 },
    costMultiplier: 1.25,
    effects: { foodCap: 50 },
  },
  workshop: {
    id: 'workshop',
    name: 'Tool Workshop',
    description: 'Sharpened flint and wooden levers. Increases Materials capacity by +40, Knowledge cap by +10, and boosts builder output.',
    unlockedAt: 'settlement',
    baseCost: { materials: 25, knowledge: 10 },
    costMultiplier: 1.3,
    effects: { materialsCap: 40, knowledgeCap: 10, builderYield: 0.25 },
  },
  fire_pit: {
    id: 'fire_pit',
    name: 'Eternal Fire Pit',
    description: 'A deep communal fire that warms spirits in winter. Warms the community, adding +0.5 Stability per tick.',
    unlockedAt: 'settlement',
    baseCost: { materials: 20, food: 10 },
    costMultiplier: 1.25,
    effects: { stability: 0.5 },
  },
  chronicle_stone: {
    id: 'chronicle_stone',
    name: 'Chronicle Obelisk',
    description: 'Tall pillars scored with astronomical markings. Increases Knowledge cap by +30 and produces +0.5 Knowledge/tick.',
    unlockedAt: 'settlement',
    baseCost: { materials: 30, knowledge: 15 },
    costMultiplier: 1.35,
    effects: { knowledgeCap: 30, knowledge: 0.5 },
  },
  longhouse: {
    id: 'longhouse',
    name: 'Longhouse',
    description: 'Timber halls for whole clans. Increases maximum population by +5.',
    unlockedAt: 'town',
    baseCost: { materials: 60, food: 30 },
    costMultiplier: 1.25,
    effects: { popMax: 5 },
  },
  smithy: {
    id: 'smithy',
    name: 'Forge Smithy',
    description: 'Bronze and bellows. Increases Materials capacity by +80, produces +1 Materials/tick, and boosts builder output.',
    unlockedAt: 'town',
    baseCost: { materials: 80, knowledge: 20 },
    costMultiplier: 1.3,
    effects: { materialsCap: 80, materials: 1, builderYield: 0.25 },
  },
  library: {
    id: 'library',
    name: 'Clay Library',
    description: 'Tablets stacked to the rafters. Increases Knowledge cap by +60 and produces +1 Knowledge/tick.',
    unlockedAt: 'town',
    baseCost: { materials: 70, knowledge: 40 },
    costMultiplier: 1.35,
    effects: { knowledgeCap: 60, knowledge: 1 },
  },
  aqueduct: {
    id: 'aqueduct',
    name: 'Stone Aqueduct',
    description: 'Water carried over valleys to terraced fields. Increases Food capacity by +150 and produces +2 Food/tick.',
    unlockedAt: 'city',
    baseCost: { materials: 150, knowledge: 60 },
    costMultiplier: 1.3,
    effects: { foodCap: 150, food: 2 },
  },
  academy: {
    id: 'academy',
    name: 'Grand Academy',
    description: 'Halls of masters and apprentices. Increases Knowledge cap by +120 and produces +2.5 Knowledge/tick.',
    unlockedAt: 'city',
    baseCost: { materials: 160, knowledge: 100 },
    costMultiplier: 1.35,
    effects: { knowledgeCap: 120, knowledge: 2.5 },
  },
  bazaar: {
    id: 'bazaar',
    name: 'Grand Bazaar',
    description: 'Caravans from every horizon. Increases Materials capacity by +200, produces +2.5 Materials/tick, and population by +4.',
    unlockedAt: 'city',
    baseCost: { materials: 200, food: 60 },
    costMultiplier: 1.3,
    effects: { materialsCap: 200, materials: 2.5, popMax: 4 },
  },
  observatory: {
    id: 'observatory',
    name: 'Sky Observatory',
    description: 'Lenses aimed at the turning heavens. Increases Knowledge cap by +250 and produces +5 Knowledge/tick.',
    unlockedAt: 'realm',
    baseCost: { materials: 350, knowledge: 200 },
    costMultiplier: 1.4,
    effects: { knowledgeCap: 250, knowledge: 5 },
  },
  citadel: {
    id: 'citadel',
    name: 'Sovereign Citadel',
    description: "A fortress-city at the realm's heart. Increases population by +12, Food and Materials capacity by +150, and Stability by +1/tick.",
    unlockedAt: 'realm',
    baseCost: { materials: 400, food: 120 },
    costMultiplier: 1.35,
    effects: { popMax: 12, foodCap: 150, materialsCap: 150, stability: 1 },
  },
  spire: {
    id: 'spire',
    name: 'Spire of Ages',
    description: 'A tower that remembers every timeline. Produces +3 Food, +3 Materials, and +3 Knowledge per tick.',
    unlockedAt: 'realm',
    baseCost: { materials: 450, food: 150, knowledge: 250 },
    costMultiplier: 1.5,
    effects: { food: 3, materials: 3, knowledge: 3 },
  },
};

const WONDERS: Record<WonderId, BuildingDef> = {
  great_hearth_hall: {
    id: 'great_hearth_hall',
    name: 'Great Hearth Hall',
    description: 'WONDER (one per timeline). A hall around the first fire. +5% to all production and +1 Stability per tick.',
    unlockedAt: 'settlement',
    baseCost: { materials: 45, food: 20, knowledge: 20 },
    costMultiplier: 1,
    effects: { allProduction: 0.05, stability: 1 },
    maxCount: 1,
  },
  standing_stones: {
    id: 'standing_stones',
    name: 'Ring of Standing Stones',
    description: 'WONDER (one per timeline). Stones aligned to the sun. +8% to all production and +40 Knowledge capacity.',
    unlockedAt: 'village',
    baseCost: { materials: 100, knowledge: 55 },
    costMultiplier: 1,
    effects: { allProduction: 0.08, knowledgeCap: 40 },
    maxCount: 1,
  },
  triumphal_arch: {
    id: 'triumphal_arch',
    name: 'Triumphal Arch',
    description: 'WONDER (one per timeline). A gate to be proud of. +10% to all production and +100 Materials capacity.',
    unlockedAt: 'town',
    baseCost: { materials: 220, food: 60, knowledge: 100 },
    costMultiplier: 1,
    effects: { allProduction: 0.1, materialsCap: 100 },
    maxCount: 1,
  },
  colossus: {
    id: 'colossus',
    name: 'Colossus',
    description: 'WONDER (one per timeline). A giant guarding the harbour. +15% to all production and +150 Food capacity.',
    unlockedAt: 'city',
    baseCost: { materials: 420, food: 120, knowledge: 220 },
    costMultiplier: 1,
    effects: { allProduction: 0.15, foodCap: 150 },
    maxCount: 1,
  },
  wonder_of_ages: {
    id: 'wonder_of_ages',
    name: 'Wonder of Ages',
    description: 'WONDER (one per timeline). The crown of your realm. +25% to all production and +2 Stability per tick.',
    unlockedAt: 'realm',
    baseCost: { materials: 700, food: 200, knowledge: 380 },
    costMultiplier: 1,
    effects: { allProduction: 0.25, stability: 2 },
    maxCount: 1,
  },
};

export const BUILDINGS: Record<BuildingId, BuildingDef> = { ...CORE_BUILDINGS, ...WONDERS };

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

export function createEmptyBuildings(): BuildingsMap {
  return Object.fromEntries(BUILDING_IDS.map((id) => [id, 0])) as BuildingsMap;
}

function sumEffect(buildings: BuildingsMap, key: keyof BuildingEffects): number {
  let total = 0;
  for (const id of BUILDING_IDS) {
    total += (BUILDINGS[id].effects[key] ?? 0) * (buildings[id] ?? 0);
  }
  return total;
}

export interface RungPrerequisites {
  year: number;
  population?: number;
  knowledge: number;
  food?: number;
  materials?: number;
  buildings?: Partial<Record<BuildingId, number>>;
}

export interface RungDef {
  id: RungId;
  order: number;
  name: string;
  subtitle: string;
  description: string;
  /** Features revealed when this rung is reached. */
  unlocks: string[];
  /** Added to Time Jump Insight when the timeline ends on this rung. */
  insightBonus: number;
  /** Extra storage granted by reaching this rung. */
  capBonus: { food: number; materials: number; knowledge: number };
  prerequisites?: RungPrerequisites;
}

const NO_CAP_BONUS = { food: 0, materials: 0, knowledge: 0 };

export const RUNGS: Record<RungId, RungDef> = {
  hearth: {
    id: 'hearth',
    order: 0,
    name: 'Solitary Hearth',
    subtitle: 'The fragile flame in the dawn.',
    description: 'A single campfire against the primordial cold. Forage wild roots and ponder the sky.',
    unlocks: [],
    insightBonus: 0,
    capBonus: NO_CAP_BONUS,
  },
  band: {
    id: 'band',
    order: 1,
    name: 'Gathering Band',
    subtitle: 'Voices join in the firelight.',
    description: 'Others gather to your fire. Assign roles to community members and build basic shelters.',
    unlocks: ['Foragers', 'Builders', 'Thatched Huts', 'Elevated Granaries'],
    insightBonus: 1,
    capBonus: NO_CAP_BONUS,
    prerequisites: { year: 2, knowledge: 12, food: 12 },
  },
  settlement: {
    id: 'settlement',
    order: 2,
    name: 'Settled Camp',
    subtitle: 'Roots take hold.',
    description: 'Paths are beaten into the earth. Erect workshops, communal hearths, and set scholars to study.',
    unlocks: ['Scholars', 'Tool Workshops', 'Eternal Fire Pits', 'Chronicle Obelisks'],
    insightBonus: 3,
    capBonus: NO_CAP_BONUS,
    prerequisites: {
      year: 4,
      population: 1,
      knowledge: 20,
      materials: 15,
      buildings: { hut: 1 },
    },
  },
  village: {
    id: 'village',
    order: 3,
    name: 'Dawn Village',
    subtitle: 'A beacon across the ages.',
    description: 'Permanent architecture and memory stones. Support healers and record timelines for the next leap.',
    unlocks: ['Healers', 'Expanded Horizon'],
    insightBonus: 5,
    capBonus: { food: 0, materials: 0, knowledge: 50 },
    prerequisites: {
      year: 8,
      population: 6,
      knowledge: 60,
      buildings: { workshop: 1, granary: 1 },
    },
  },
  town: {
    id: 'town',
    order: 4,
    name: 'Walled Town',
    subtitle: 'Stone remembers what wood forgets.',
    description: 'Ramparts rise and trades take root. Raise longhouses, forges, and libraries to feed a growing people.',
    unlocks: ['Longhouses', 'Forge Smithies', 'Clay Libraries', 'Wider storage'],
    insightBonus: 8,
    capBonus: { food: 50, materials: 50, knowledge: 100 },
    prerequisites: {
      year: 16,
      population: 10,
      knowledge: 100,
      food: 60,
      materials: 80,
      buildings: { hut: 4, workshop: 2, granary: 2, chronicle_stone: 1 },
    },
  },
  city: {
    id: 'city',
    order: 5,
    name: 'Trade City',
    subtitle: 'Roads converge on your gates.',
    description: 'Markets, schools and canals. Build aqueducts, academies, and bazaars to power a metropolis.',
    unlocks: ['Stone Aqueducts', 'Grand Academies', 'Grand Bazaars', 'Much wider storage'],
    insightBonus: 12,
    capBonus: { food: 150, materials: 150, knowledge: 200 },
    prerequisites: {
      year: 32,
      population: 18,
      knowledge: 220,
      food: 120,
      materials: 150,
      buildings: { longhouse: 2, library: 2, smithy: 1 },
    },
  },
  realm: {
    id: 'realm',
    order: 6,
    name: 'Sovereign Realm',
    subtitle: 'An age that outlives its makers.',
    description: 'Observatories and citadels crown the age. Your realm is complete: only a deeper prestige can carry it further.',
    unlocks: ['Sky Observatories', 'Sovereign Citadels', 'Spires of Ages', 'Epoch-level prestige'],
    insightBonus: 18,
    capBonus: { food: 300, materials: 300, knowledge: 400 },
    prerequisites: {
      year: 60,
      population: 22,
      knowledge: 450,
      food: 200,
      materials: 300,
      buildings: { aqueduct: 2, academy: 2, bazaar: 1 },
    },
  },
};

/** Marketplace: explicit, player-chosen conversions of spare stores. */
export const MARKET_RUNG: RungId = 'town';

/** Echo Merchants open the market early. */
export function marketRungFor(state: Pick<TimelineState, 'features'>): RungId {
  return state.features.includes('echo_merchants') ? 'village' : MARKET_RUNG;
}

/** Master Scholars trim every Discovery's cost. */
export function discoveryCost(state: Pick<TimelineState, 'features'>, baseCost: number): number {
  return state.features.includes('master_scholars') ? Math.ceil(baseCost * 0.75) : baseCost;
}

/** How many units of the first resource buy one unit of the second, before Bazaar discounts. */
export const BARTER_BASE_RATIOS: Array<{ from: TradeableResource; to: TradeableResource; ratio: number }> = [
  { from: 'food', to: 'materials', ratio: 3 },
  { from: 'materials', to: 'knowledge', ratio: 4 },
  { from: 'knowledge', to: 'food', ratio: 2 },
  { from: 'materials', to: 'food', ratio: 3 },
  { from: 'knowledge', to: 'materials', ratio: 2 },
  { from: 'food', to: 'knowledge', ratio: 4 },
];

/** Each Grand Bazaar trims the ratio by 0.25, never below 1.5 (always a small loss: no infinite loops). */
export function barterRatio(
  buildings: BuildingsMap,
  from: TradeableResource,
  to: TradeableResource
): number | null {
  const base = BARTER_BASE_RATIOS.find((r) => r.from === from && r.to === to);
  if (!base) return null;
  return Math.max(1.5, base.ratio - 0.25 * buildings.bazaar);
}

/** The rung at which each role becomes available. */
export const ROLE_MIN_RUNG: Record<RoleId, RungId> = {
  forager: 'band',
  builder: 'band',
  scholar: 'settlement',
  healer: 'village',
};

export const RUNG_ORDER: RungId[] = ['hearth', 'band', 'settlement', 'village', 'town', 'city', 'realm'];
export const FINAL_RUNG: RungId = 'realm';

export function rungLevel(rung: RungId): number {
  return RUNG_ORDER.indexOf(rung);
}

export function isRungUnlocked(currentRung: RungId, targetRung: RungId): boolean {
  return rungLevel(currentRung) >= rungLevel(targetRung);
}

export function getBuildingCost(
  buildingId: BuildingId,
  currentCount: number
): { materials: number; food: number; knowledge: number } {
  const def = BUILDINGS[buildingId];
  const mult = Math.pow(def.costMultiplier, currentCount);

  return {
    materials: Math.ceil(def.baseCost.materials * mult),
    food: def.baseCost.food ? Math.ceil(def.baseCost.food * mult) : 0,
    knowledge: def.baseCost.knowledge ? Math.ceil(def.baseCost.knowledge * mult) : 0,
  };
}

export function calculateCaps(
  buildings: BuildingsMap,
  rung: RungId,
  discoveries: readonly string[] = []
): {
  food: number;
  materials: number;
  knowledge: number;
  population: number;
} {
  const bonus = RUNGS[rung].capBonus;
  const capMult = 1 + discoveryBonus(discoveries, 'caps');
  return {
    food: Math.floor((30 + bonus.food + sumEffect(buildings, 'foodCap')) * capMult),
    materials: Math.floor((25 + bonus.materials + sumEffect(buildings, 'materialsCap')) * capMult),
    knowledge: Math.floor((20 + bonus.knowledge + sumEffect(buildings, 'knowledgeCap')) * capMult),
    population: 2 + sumEffect(buildings, 'popMax') + discoveryBonus(discoveries, 'popMax'),
  };
}

/** What banked Insight adds to the first stores of every new timeline. */
export function insightStartBonus(insight: number): { food: number; materials: number; knowledge: number } {
  return {
    food: Math.min(insight * 2, 20),
    materials: Math.min(insight, 15),
    knowledge: Math.floor(insight * 0.5),
  };
}

/** Each achievement permanently adds this much production (Renown). */
export const RENOWN_PER_ACHIEVEMENT = 0.01;

/** Harmony: a well-kept community works better. Pure upside; low Stability costs nothing. */
export function harmonyBonus(stability: number): number {
  if (stability >= 100) return 0.15;
  if (stability >= 90) return 0.08;
  return 0;
}

/** Combined permanent production multiplier from every prestige currency. */
export function getProductionMultiplier(
  state: Pick<TimelineState, 'insight' | 'echoes' | 'resonance' | 'eternity' | 'achievements' | 'resources'>
): number {
  const insight = 1 + Math.min(state.insight * 0.01, 0.5);
  const echoes = 1 + state.echoes * 0.1;
  const resonance = Math.pow(1.25, state.resonance);
  const eternity = Math.pow(2, state.eternity);
  const renown = 1 + state.achievements.length * RENOWN_PER_ACHIEVEMENT;
  const harmony = 1 + harmonyBonus(state.resources.stability);
  return insight * echoes * resonance * eternity * renown * harmony;
}

/** Edicts whose slot the timeline has reached (remembered edicts wait for their rung). */
export function activeEdicts(
  state: Pick<TimelineState, 'edicts' | 'rung'>
): Record<string, string> {
  const level = rungLevel(state.rung);
  return Object.fromEntries(
    Object.entries(state.edicts).filter(([slot]) => rungLevel(slot as RungId) >= 0 && rungLevel(slot as RungId) <= level)
  );
}

/** Multipliers applied to each resource's raw production (single source for rates and previews). */
export function productionFactors(state: TimelineState): { food: number; materials: number; knowledge: number } {
  const efficiency = getProductionMultiplier(state) * (1 + sumEffect(state.buildings, 'allProduction'));
  const edicts = activeEdicts(state);
  const all = discoveryBonus(state.discoveries, 'all') + edictBonus(edicts, 'all');
  const boost = (key: 'food' | 'materials' | 'knowledge'): number =>
    1 + discoveryBonus(state.discoveries, key) + edictBonus(edicts, key) + relicBonus(state.relics, key) + all;
  return {
    food: efficiency * boost('food'),
    materials: efficiency * boost('materials'),
    knowledge: efficiency * boost('knowledge'),
  };
}

/** Plain-language lines for what one more of a building adds, using the player's real multipliers. */
export function describeBuildingGain(state: TimelineState, id: BuildingId): string[] {
  const e = BUILDINGS[id].effects;
  const f = productionFactors(state);
  const lines: string[] = [];
  const rate = (n: number): string => (Math.round(n * 100) / 100).toString();
  if (e.popMax) lines.push(`+${e.popMax} max population`);
  if (e.foodCap) lines.push(`+${e.foodCap} Food storage`);
  if (e.materialsCap) lines.push(`+${e.materialsCap} Materials storage`);
  if (e.knowledgeCap) lines.push(`+${e.knowledgeCap} Knowledge storage`);
  if (e.food) lines.push(`+${rate(e.food * f.food)} Food/tick`);
  if (e.materials) lines.push(`+${rate(e.materials * f.materials)} Materials/tick`);
  if (e.knowledge) lines.push(`+${rate(e.knowledge * f.knowledge)} Knowledge/tick`);
  if (e.builderYield) lines.push(`Builders +${rate(e.builderYield * f.materials)} Materials each`);
  if (e.stability) lines.push(`+${rate(e.stability)} Stability/tick`);
  if (e.allProduction) lines.push(`+${Math.round(e.allProduction * 100)}% to all production`);
  return lines;
}

export function calculateNetRates(state: TimelineState): NetRates {
  const { season, population, buildings } = state;
  const { roles } = population;

  // No resource ever decreases per tick (see the "Number only goes up" pillar).
  const factors = productionFactors(state);
  const foodBoost = factors.food;
  const materialsBoost = factors.materials;
  const knowledgeBoost = factors.knowledge;

  // Forager base: 1.5. In winter: 0.9. The community eats first (0.35 food per
  // member); only the surplus is stored.
  const profile = SEASON_PROFILES[season];
  const foragerYield = profile.forager;
  const foodProduced =
    (roles.forager * foragerYield + sumEffect(buildings, 'food')) * foodBoost;
  const foodConsumed = population.total * 0.35;
  const foodRate = Math.max(0, foodProduced - foodConsumed);

  // Builder base: 1.0 plus building bonuses.
  const builderYield = 1.0 + sumEffect(buildings, 'builderYield');
  const materialsRate =
    (roles.builder * builderYield * profile.builder + sumEffect(buildings, 'materials')) * materialsBoost;

  // Scholar base: 0.8.
  const knowledgeRate =
    (roles.scholar * 0.8 * profile.scholar + sumEffect(buildings, 'knowledge')) * knowledgeBoost;

  // Stability only ever rises: healers +2.0, buildings, and slow recovery below 70.
  let stabilityDelta =
    roles.healer * 2.0 + sumEffect(buildings, 'stability') + discoveryBonus(state.discoveries, 'stability') +
    edictBonus(activeEdicts(state), 'stability');
  if (state.resources.stability < 70) {
    stabilityDelta += 0.5;
  }

  stabilityDelta = Math.max(0, stabilityDelta);

  return {
    food: Number(foodRate.toFixed(2)),
    materials: Number(materialsRate.toFixed(2)),
    knowledge: Number(knowledgeRate.toFixed(2)),
    stability: Number(stabilityDelta.toFixed(2)),
  };
}

export interface ProductionNote {
  label: string;
  value: string;
}

const pct = (x: number): string => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;

/** Plain-language list of everything that is currently boosting production. Pure and view-free. */
export function explainProduction(state: TimelineState): ProductionNote[] {
  const notes: ProductionNote[] = [];
  const add = (label: string, value: string, active: boolean): void => {
    if (active) notes.push({ label, value });
  };
  const insight = Math.min(state.insight * 0.01, 0.5);
  add('Insight', `${pct(insight)} to everything (+1% each, up to +50%)`, insight > 0);
  add('Echoes', `${pct(state.echoes * 0.1)} to everything (+10% each)`, state.echoes > 0);
  add('Resonance', `x${Math.pow(1.25, state.resonance).toFixed(2)} to everything (x1.25 each)`, state.resonance > 0);
  add('Eternity Marks', `x${Math.pow(2, state.eternity)} to everything (x2 each)`, state.eternity > 0);
  add('Harmony', `${pct(harmonyBonus(state.resources.stability))} to everything while Stability is high (90 = +8%, 100 = +15%)`, harmonyBonus(state.resources.stability) > 0);
  add('Renown', `${pct(state.achievements.length * RENOWN_PER_ACHIEVEMENT)} from ${state.achievements.length} achievements`, state.achievements.length > 0);
  add('Wonders', `${pct(sumEffect(state.buildings, 'allProduction'))} to everything`, sumEffect(state.buildings, 'allProduction') > 0);
  const edicts = activeEdicts(state);
  for (const key of ['food', 'materials', 'knowledge'] as const) {
    const label = key[0].toUpperCase() + key.slice(1);
    const d = discoveryBonus(state.discoveries, key);
    const e = edictBonus(edicts, key);
    const r = relicBonus(state.relics, key);
    add(`${label}: Discoveries`, pct(d), d > 0);
    add(`${label}: Edicts`, pct(e), e > 0);
    add(`${label}: Relics`, pct(r), r > 0);
  }
  const all = discoveryBonus(state.discoveries, 'all') + edictBonus(edicts, 'all');
  add('Broad boosts (Discoveries and Edicts)', `${pct(all)} to everything`, all > 0);
  add('Season', SEASON_PROFILES[state.season].note, true);
  return notes;
}

export function checkRungPrerequisites(
  state: TimelineState,
  targetRung: RungId
): { eligible: boolean; reasons: string[] } {
  const def = RUNGS[targetRung];
  const reasons: string[] = [];

  const currentIdx = rungLevel(state.rung);
  const targetIdx = rungLevel(targetRung);

  if (targetIdx <= currentIdx) {
    return { eligible: false, reasons: ['Already reached or surpassed this rung.'] };
  }

  if (targetIdx > currentIdx + 1) {
    return {
      eligible: false,
      reasons: [`Must reach ${RUNGS[RUNG_ORDER[targetIdx - 1]].name} first.`],
    };
  }

  const prereqs = def.prerequisites;
  if (!prereqs) {
    return { eligible: true, reasons: [] };
  }

  if (state.year < prereqs.year) {
    reasons.push(`Requires Year ${prereqs.year} (Current: ${state.year})`);
  }
  if (prereqs.population && state.population.total < prereqs.population) {
    reasons.push(
      `Requires ${prereqs.population} Population (Current: ${state.population.total})`
    );
  }
  if (prereqs.knowledge && state.resources.knowledge < prereqs.knowledge) {
    reasons.push(
      `Requires ${prereqs.knowledge} Knowledge (Current: ${Math.floor(state.resources.knowledge)})`
    );
  }
  if (prereqs.food && state.resources.food < prereqs.food) {
    reasons.push(
      `Requires ${prereqs.food} Food (Current: ${Math.floor(state.resources.food)})`
    );
  }
  if (prereqs.materials && state.resources.materials < prereqs.materials) {
    reasons.push(
      `Requires ${prereqs.materials} Materials (Current: ${Math.floor(state.resources.materials)})`
    );
  }
  for (const [id, needed] of Object.entries(prereqs.buildings ?? {}) as Array<[BuildingId, number]>) {
    if (state.buildings[id] < needed) {
      reasons.push(`Requires ${needed} ${BUILDINGS[id].name} (Current: ${state.buildings[id]})`);
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

export function calculateTimeJumpInsight(state: TimelineState): number {
  if (state.year < 3) {
    return 0;
  }
  const rungBonus = RUNGS[state.rung].insightBonus;

  const yearComponent = Math.floor(Math.sqrt(state.year));
  const knowledgeComponent = Math.floor(state.resources.knowledge / 40);
  const popComponent = Math.floor(state.population.total / 4);

  const base = yearComponent + rungBonus + knowledgeComponent + popComponent;
  return Math.max(1, Math.floor(base * (1 + relicBonus(state.relics, 'insight'))));
}

// ---------------------------------------------------------------------------
// Deep prestige tiers (Tier 1 is the Time Jump above).
// Each tier resets everything below it and grants a permanent currency.
// ---------------------------------------------------------------------------

export type PrestigeCurrency = 'insight' | 'echoes' | 'resonance' | 'eternity';

export interface PrestigeTierDef {
  tier: PrestigeTier;
  name: string;
  icon: string;
  actionLabel: string;
  /** Currency this tier grants. */
  currency: Exclude<PrestigeCurrency, 'insight'>;
  currencyName: string;
  /** Lower currency that must be banked to unlock the tier. */
  requires: PrestigeCurrency;
  requiresName: string;
  requiresAmount: number;
  /** The timeline must also have reached at least this year. */
  requiresYear: number;
  /** Currency gained per this many units of the required currency. */
  gainDivisor: number;
  /** Plain-language explanation shown where the currency first appears. */
  whatItDoes: string;
  nextRun: string;
  howEarned: string;
  resets: string;
  lore: string;
}

export const PRESTIGE_TIERS: Record<PrestigeTier, PrestigeTierDef> = {
  2: {
    tier: 2,
    name: 'Epoch Shift',
    icon: '🌅',
    actionLabel: 'Initiate Epoch Shift',
    currency: 'echoes',
    currencyName: 'Echoes',
    requires: 'insight',
    requiresName: 'Insight',
    requiresAmount: 120,
    requiresYear: 60,
    gainDivisor: 120,
    whatItDoes: 'Each Echo adds +10% production to everything, stacking with Insight.',
    nextRun: 'Every future timeline produces more from its very first tick.',
    howEarned: 'Epoch Shift while the Sovereign Realm stands: 1 Echo, plus 1 more per 120 Insight banked (needs 120).',
    resets: 'Resets Insight. Echoes, records, and higher currencies are kept.',
    lore: 'Fold many timelines into one resonant memory.',
  },
  3: {
    tier: 3,
    name: 'Paradigm Shift',
    icon: '🔮',
    actionLabel: 'Initiate Paradigm Shift',
    currency: 'resonance',
    currencyName: 'Resonance',
    requires: 'echoes',
    requiresName: 'Echoes',
    requiresAmount: 8,
    requiresYear: 120,
    gainDivisor: 8,
    whatItDoes: 'Each Resonance multiplies all production by x1.25.',
    nextRun: 'Timelines begin further along the rungs: each Resonance advances the starting rung by one, up to Trade City.',
    howEarned: 'Paradigm Shift while the Sovereign Realm stands: 1 Resonance, plus 1 more per 8 Echoes banked (needs 8).',
    resets: 'Resets Insight and Echoes. Resonance, records, and Eternity are kept.',
    lore: 'Change how history itself is remembered.',
  },
  4: {
    tier: 4,
    name: 'Ascension',
    icon: '♾️',
    actionLabel: 'Ascend',
    currency: 'eternity',
    currencyName: 'Eternity Marks',
    requires: 'resonance',
    requiresName: 'Resonance',
    requiresAmount: 6,
    requiresYear: 240,
    gainDivisor: 6,
    whatItDoes: 'Each Eternity Mark doubles all production (x2) and advances where timelines begin by two rungs (up to Trade City).',
    nextRun: 'Doubled output and a deeper head start in every timeline, forever.',
    howEarned: 'Ascend while the Sovereign Realm stands: 1 Eternity Mark, plus 1 more per 6 Resonance banked (needs 6).',
    resets: 'Resets Insight, Echoes and Resonance. Eternity Marks and records are kept.',
    lore: 'Step outside the timeline entirely.',
  },
};

export const PRESTIGE_TIER_ORDER: PrestigeTier[] = [2, 3, 4];

export function getPrestigeBalance(
  state: TimelineState,
  currency: PrestigeCurrency
): number {
  return state[currency];
}

export function calculatePrestigeGain(state: TimelineState, tier: PrestigeTier): number {
  const def = PRESTIGE_TIERS[tier];
  return 1 + Math.floor(getPrestigeBalance(state, def.requires) / def.gainDivisor);
}

export function checkPrestigeTier(
  state: TimelineState,
  tier: PrestigeTier
): { eligible: boolean; reasons: string[]; gain: number } {
  const def = PRESTIGE_TIERS[tier];
  const reasons: string[] = [];
  if (state.rung !== FINAL_RUNG) {
    reasons.push(`Reach the ${RUNGS[FINAL_RUNG].name} (Current: ${RUNGS[state.rung].name})`);
  }
  if (state.year < def.requiresYear) {
    reasons.push(`Reach Year ${def.requiresYear} (Current: ${state.year})`);
  }
  const balance = getPrestigeBalance(state, def.requires);
  if (balance < def.requiresAmount) {
    reasons.push(`Bank ${def.requiresAmount} ${def.requiresName} (Current: ${balance})`);
  }
  return { eligible: reasons.length === 0, reasons, gain: calculatePrestigeGain(state, tier) };
}

/** Which rung a fresh timeline begins on, based on Resonance and Eternity. */
export function getStartingRung(state: Pick<TimelineState, 'resonance' | 'eternity'>): RungId {
  const level = Math.min(5, state.resonance + state.eternity * 2);
  return RUNG_ORDER[level];
}

// ---------------------------------------------------------------------------
// Features: functions sent back through time, not percentage buffs.
// ---------------------------------------------------------------------------

export interface FeatureDef {
  id: FeatureId;
  name: string;
  icon: string;
  /** Prestige tier (1 = Time Jump) that grants this feature... */
  tier: 1 | 2 | 3 | 4;
  /** ...on the Nth time that tier is performed. */
  onCount: number;
  description: string;
  /** Automation switch that controls it, if any. */
  automation?: AutomationKey;
}

export const FEATURES: Record<FeatureId, FeatureDef> = {
  ancestral_hands: {
    id: 'ancestral_hands',
    name: 'Ancestral Hands',
    icon: '🤲',
    tier: 1,
    onCount: 1,
    description: 'New arrivals automatically take up the role your people have the fewest of (Foragers, Builders, then Scholars as they unlock).',
    automation: 'assign',
  },
  rising_tide: {
    id: 'rising_tide',
    name: 'Rising Tide',
    icon: '🌊',
    tier: 2,
    onCount: 1,
    description: "The moment a rung's requirements are met, your people advance to it on their own.",
    automation: 'advance',
  },
  inherited_foundations: {
    id: 'inherited_foundations',
    name: 'Inherited Foundations',
    icon: '🏛️',
    tier: 2,
    onCount: 2,
    description: 'Every timeline begins with a Thatched Hut, an Elevated Granary, and a Tool Workshop already standing.',
  },
  temporal_foresight: {
    id: 'temporal_foresight',
    name: 'Temporal Foresight',
    icon: '🔭',
    tier: 3,
    onCount: 1,
    description: 'Evolution shows exactly what each prestige tier would give you right now, and what is still missing.',
  },
  steward: {
    id: 'steward',
    name: 'The Steward',
    icon: '🧭',
    tier: 4,
    onCount: 1,
    description: 'Each tick, a steward builds the cheapest unlocked building you can afford.',
    automation: 'build',
  },
  seasoned_memory: {
    id: 'seasoned_memory',
    name: 'Seasoned Memory',
    icon: '📜',
    tier: 1,
    onCount: 3,
    description: 'Your chosen Edicts are remembered and reissued at the start of every timeline.',
  },
  lore_keepers: {
    id: 'lore_keepers',
    name: 'Lore Keepers',
    icon: '📚',
    tier: 1,
    onCount: 6,
    description: 'Every timeline begins already knowing Fire Hardening, Foraging Lore, and Granary Seals.',
  },
  apprentice_scholars: {
    id: 'apprentice_scholars',
    name: 'Apprentice Scholars',
    icon: '🎓',
    tier: 2,
    onCount: 3,
    description: 'Each tick, scholars research the cheapest Discovery you can afford.',
    automation: 'research',
  },
  second_wind: {
    id: 'second_wind',
    name: 'Second Wind',
    icon: '🌬️',
    tier: 3,
    onCount: 2,
    description: 'Your timeline keeps growing for up to 24 hours while you are away, instead of 8.',
  },
  chrono_dial: {
    id: 'chrono_dial',
    name: 'Chrono Dial',
    icon: '⏩',
    tier: 2,
    onCount: 5,
    description: 'Turn the dial to run your timeline at 2x or 4x speed whenever you like.',
  },
  grand_foundations: {
    id: 'grand_foundations',
    name: 'Grand Foundations',
    icon: '🏗️',
    tier: 1,
    onCount: 10,
    description: 'Every timeline also begins with a Chronicle Obelisk and an Eternal Fire Pit standing.',
  },
  echo_merchants: {
    id: 'echo_merchants',
    name: 'Echo Merchants',
    icon: '🪙',
    tier: 2,
    onCount: 8,
    description: 'The Marketplace opens at Dawn Village instead of the Walled Town.',
  },
  master_scholars: {
    id: 'master_scholars',
    name: 'Master Scholars',
    icon: '🎓',
    tier: 4,
    onCount: 3,
    description: 'Every Discovery costs 25% less Knowledge.',
  },
  twin_stewards: {
    id: 'twin_stewards',
    name: 'Twin Stewards',
    icon: '🧭',
    tier: 4,
    onCount: 2,
    description: 'The Steward builds up to two buildings each tick.',
  },
};

export const LORE_KEEPER_DISCOVERIES = ['fire_hardening', 'foraging_lore', 'granary_seals'];

export const FEATURE_IDS = Object.keys(FEATURES) as FeatureId[];

export function hasFeature(
  state: Pick<TimelineState, 'features'>,
  id: FeatureId
): boolean {
  return state.features.includes(id);
}

/** Features newly earned by performing `tier` for the `count`th time. */
export function featuresEarned(tier: 1 | 2 | 3 | 4, count: number): FeatureDef[] {
  return FEATURE_IDS.map((id) => FEATURES[id]).filter(
    (f) => f.tier === tier && f.onCount === count
  );
}
