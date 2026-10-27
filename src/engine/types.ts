export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export type RungId = 'hearth' | 'band' | 'settlement' | 'village';

export type RoleId = 'forager' | 'scholar' | 'healer' | 'builder';

export type BuildingId = 'hut' | 'granary' | 'workshop' | 'fire_pit' | 'chronicle_stone';

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

export interface BuildingsMap {
  hut: number;
  granary: number;
  workshop: number;
  fire_pit: number;
  chronicle_stone: number;
}

export interface PopulationState {
  total: number;
  max: number;
  roles: RolesMap;
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
  | { type: 'STUDY' }
  | { type: 'ASSIGN_ROLE'; role: RoleId; delta: number }
  | { type: 'BUILD'; buildingId: BuildingId }
  | { type: 'ADVANCE_RUNG'; rungId: RungId }
  | { type: 'TIME_JUMP' }
  | { type: 'DEV_ADD_RESOURCES'; amount: number }
  | { type: 'DEV_SET_YEAR'; year: number }
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
