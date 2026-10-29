export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export type RungId = 'hearth' | 'band' | 'settlement' | 'village' | 'town' | 'city' | 'realm';

export type RoleId = 'forager' | 'scholar' | 'healer' | 'builder';

export type BuildingId =
  | 'hut'
  | 'granary'
  | 'workshop'
  | 'fire_pit'
  | 'chronicle_stone'
  | 'longhouse'
  | 'smithy'
  | 'library'
  | 'aqueduct'
  | 'academy'
  | 'bazaar'
  | 'observatory'
  | 'citadel'
  | 'spire'
  | 'great_hearth_hall'
  | 'standing_stones'
  | 'triumphal_arch'
  | 'colossus'
  | 'wonder_of_ages';

export type PrestigeTier = 2 | 3 | 4;

export type TradeableResource = 'food' | 'materials' | 'knowledge';

/** Permanent functions sent back by prestige; they survive every reset. */
export type FeatureId =
  | 'ancestral_hands'
  | 'rising_tide'
  | 'inherited_foundations'
  | 'temporal_foresight'
  | 'steward'
  | 'seasoned_memory'
  | 'lore_keepers'
  | 'apprentice_scholars'
  | 'second_wind'
  | 'twin_stewards'
  | 'chrono_dial'
  | 'grand_foundations'
  | 'echo_merchants'
  | 'master_scholars';

export type AutomationKey = 'assign' | 'advance' | 'build' | 'research';

export type AutomationSettings = Record<AutomationKey, boolean>;

export type ResourceName = 'food' | 'materials' | 'knowledge' | 'stability';

export interface LogEntry {
  id: string;
  tick: number;
  year: number;
  text: string;
  type: 'info' | 'milestone' | 'warning' | 'prestige';
}

export interface ResourceMap {
  food: number;
  materials: number;
  knowledge: number;
  stability: number;
}

export interface ResourceCaps {
  food: number;
  materials: number;
  knowledge: number;
}

export interface RolesMap {
  unassigned: number;
  forager: number;
  scholar: number;
  healer: number;
  builder: number;
}

export type BuildingsMap = Record<BuildingId, number>;

export interface PopulationState {
  total: number;
  max: number;
  roles: RolesMap;
}

export interface HistoryEntry {
  /** Which timeline this was (1 = the first). */
  number: number;
  /** 1 = Time Jump, 2 = Epoch Shift, 3 = Paradigm Shift, 4 = Ascension. */
  tier: 1 | 2 | 3 | 4;
  year: number;
  rung: RungId;
  gained: string;
}

/** Lifetime counters. They only ever go up and survive every prestige. */
export interface LifetimeStats {
  ticks: number;
  gathers: number;
  built: number;
  researched: number;
  traded: number;
}

export interface TimelineState {
  timelineId: string;
  schemaVersion: number;
  rulesetVersion: string;
  seed: number;
  tick: number;
  year: number;
  season: Season;
  furthestYear: number;
  timelinesCreated: number;
  insight: number;
  /** Tier 2 currency (Epoch Shift): +10% production each. */
  echoes: number;
  /** Tier 3 currency (Paradigm Shift): x1.25 production each and a head start up the rungs. */
  resonance: number;
  /** Tier 4 currency (Ascension): x2 production each. */
  eternity: number;
  /** Chosen edict per rung slot (free to swap). */
  edicts: Record<string, string>;
  /** Discoveries researched in this timeline (rediscovered each timeline). */
  discoveries: string[];
  /** The most recent ended timelines, newest first. */
  history: HistoryEntry[];
  /** Lifetime counters that survive every reset. */
  stats: LifetimeStats;
  /** The challenge currently being attempted, if any. */
  challenge: string | null;
  /** A choice event awaiting the player's pick (resolved automatically if they stay away). */
  pendingChoice: { eventId: string; tick: number } | null;
  /** Relics found in events. Permanent: never lost by any reset. */
  relics: string[];
  /** Earned achievement ids. Permanent; each adds Renown production. */
  achievements: string[];
  /** Functions unlocked by prestige. Never lost. */
  features: FeatureId[];
  /** Player on/off switches for unlocked automation. */
  automation: AutomationSettings;
  /** How many times each prestige tier has been performed (1 = Time Jump). */
  prestigeCounts: Record<1 | 2 | 3 | 4, number>;
  /** Legacy save field; manual actions are immediate and always responsive. */
  actionCooldown: number;
  rung: RungId;
  resources: ResourceMap;
  caps: ResourceCaps;
  population: PopulationState;
  buildings: BuildingsMap;
  logs: LogEntry[];
}

export type EngineAction =
  | { type: 'TICK' }
  | { type: 'FORAGE' }
  | { type: 'SCAVENGE' }
  | { type: 'STUDY' }
  | { type: 'ASSIGN_ROLE'; role: RoleId; delta: number }
  | { type: 'BUILD'; buildingId: BuildingId }
  | { type: 'ADVANCE_RUNG'; rungId: RungId }
  | { type: 'TIME_JUMP' }
  | { type: 'PRESTIGE'; tier: PrestigeTier }
  | { type: 'TOGGLE_AUTOMATION'; key: AutomationKey }
  | { type: 'RESEARCH'; discoveryId: string }
  | { type: 'START_CHALLENGE'; challengeId: string }
  | { type: 'ABANDON_CHALLENGE' }
  | { type: 'RESOLVE_CHOICE'; index: number }
  | { type: 'BARTER'; from: TradeableResource; to: TradeableResource; amount: number }
  | { type: 'SET_EDICT'; slot: RungId; edictId: string | null }
  | { type: 'DEV_ADD_RESOURCES'; amount: number }
  | { type: 'DEV_SET_YEAR'; year: number }
  | { type: 'DEV_SET_RUNG'; rung: RungId }
  | { type: 'DEV_ADD_INSIGHT'; amount: number }
  | { type: 'DEV_RESET' };

export interface EngineResult {
  success: boolean;
  state: TimelineState;
  error?: string;
  events: string[];
}

export interface NetRates {
  food: number;
  materials: number;
  knowledge: number;
  stability: number;
}
