import {
  BuildingId,
  BuildingsMap,
  NetRates,
  RoleId,
  RungId,
  TimelineState,
} from './types.js';

export const SEASONS: readonly ['Spring', 'Summer', 'Autumn', 'Winter'] = [
  'Spring',
  'Summer',
  'Autumn',
  'Winter',
] as const;

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
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  hut: {
    id: 'hut',
    name: 'Thatched Hut',
    description: 'A modest shelter against the wind. Increases maximum population by +2.',
    unlockedAt: 'band',
    baseCost: { materials: 10, food: 5 },
    costMultiplier: 1.2,
  },
  granary: {
    id: 'granary',
    name: 'Elevated Granary',
    description: 'Dry woven storage protecting harvest from vermin. Increases Food capacity by +50.',
    unlockedAt: 'band',
    baseCost: { materials: 15 },
    costMultiplier: 1.25,
  },
  workshop: {
    id: 'workshop',
    name: 'Tool Workshop',
    description: 'Sharpened flint and wooden levers. Increases Materials capacity by +40, Knowledge cap by +10, and boosts builder output.',
    unlockedAt: 'settlement',
    baseCost: { materials: 25, knowledge: 10 },
    costMultiplier: 1.3,
  },
  fire_pit: {
    id: 'fire_pit',
    name: 'Eternal Fire Pit',
    description: 'A deep communal fire that warms spirits in winter. Provides +5 Stability and protects against freeze.',
    unlockedAt: 'settlement',
    baseCost: { materials: 20, food: 10 },
    costMultiplier: 1.25,
  },
  chronicle_stone: {
    id: 'chronicle_stone',
    name: 'Chronicle Obelisk',
    description: 'Tall pillars scored with astronomical markings. Increases Knowledge cap by +30 and produces +0.5 Knowledge/tick.',
    unlockedAt: 'settlement',
    baseCost: { materials: 30, knowledge: 15 },
    costMultiplier: 1.35,
  },
};

export interface RungDef {
  id: RungId;
  order: number;
  name: string;
  subtitle: string;
  description: string;
  prerequisites?: {
    year: number;
    population?: number;
    knowledge: number;
    food?: number;
    materials?: number;
    huts?: number;
    workshop?: number;
    granary?: number;
  };
}

export const RUNGS: Record<RungId, RungDef> = {
  hearth: {
    id: 'hearth',
    order: 0,
    name: 'Solitary Hearth',
    subtitle: 'The fragile flame in the dawn.',
    description: 'A single campfire against the primordial cold. Forage wild roots and ponder the sky.',
  },
  band: {
    id: 'band',
    order: 1,
    name: 'Gathering Band',
    subtitle: 'Voices join in the firelight.',
    description: 'Others gather to your fire. Assign roles to community members and build basic shelters.',
    prerequisites: {
      year: 2,
      knowledge: 12,
      food: 12,
    },
  },
  settlement: {
    id: 'settlement',
    order: 2,
    name: 'Settled Camp',
    subtitle: 'Roots take hold.',
    description: 'Paths are beaten into the earth. Erect workshops, communal hearths, and set scholars to study.',
    prerequisites: {
      year: 4,
      population: 1,
      huts: 1,
      knowledge: 20,
      materials: 15,
    },
  },
  village: {
    id: 'village',
    order: 3,
    name: 'Dawn Village',
    subtitle: 'A beacon across the ages.',
    description: 'Permanent architecture and memory stones. Support healers and record timelines for the next leap.',
    prerequisites: {
      year: 8,
      population: 6,
      workshop: 1,
      granary: 1,
      knowledge: 60,
    },
  },
};

export const RUNG_ORDER: RungId[] = ['hearth', 'band', 'settlement', 'village'];

export function isRungUnlocked(currentRung: RungId, targetRung: RungId): boolean {
  const currentIdx = RUNG_ORDER.indexOf(currentRung);
  const targetIdx = RUNG_ORDER.indexOf(targetRung);
  return currentIdx >= targetIdx;
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

export function calculateCaps(buildings: BuildingsMap, rung: RungId): {
  food: number;
  materials: number;
  knowledge: number;
  population: number;
} {
  const food = 30 + buildings.granary * 50;
  const materials = 25 + buildings.workshop * 40;
  const knowledge =
    20 +
    buildings.workshop * 10 +
    buildings.chronicle_stone * 30 +
    (rung === 'village' ? 50 : 0);
  const population = 2 + buildings.hut * 2;

  return { food, materials, knowledge, population };
}

export function calculateNetRates(state: TimelineState): NetRates {
  const { season, population, buildings, insight } = state;
  const { roles } = population;

  // Insight efficiency: +1% production per insight point (max +50%)
  const insightEfficiency = 1 + Math.min(insight * 0.01, 0.5);

  // Food calculation:
  // Forager base: 1.5. In winter: 0.9.
  const foragerYield = season === 'Winter' ? 0.9 : 1.5;
  const foodProduced = roles.forager * foragerYield * insightEfficiency;
  // Consumption: 0.5 food per population member per tick
  const foodConsumed = population.total * 0.35;
  const foodRate = foodProduced - foodConsumed;

  // Materials calculation:
  // Builder base: 1.0. Workshop adds +0.25 per workshop.
  const builderYield = (1.0 + buildings.workshop * 0.25) * insightEfficiency;
  const materialsRate = roles.builder * builderYield;

  // Knowledge calculation:
  // Scholar base: 0.8. Chronicle stone: +0.5 each.
  const scholarYield = 0.8 * insightEfficiency;
  const knowledgeProduced =
    roles.scholar * scholarYield + buildings.chronicle_stone * 0.5;
  const knowledgeRate = knowledgeProduced;

  // Stability calculation:
  // Base natural drift towards 70.
  // Healers add +2.0 per tick.
  // Fire pits add +0.5 per tick (especially helpful in winter).
  // Food deficit causes severe drain (-10).
  let stabilityDelta = 0;
  if (roles.healer > 0) {
    stabilityDelta += roles.healer * 2.0;
  }
  stabilityDelta += buildings.fire_pit * 0.5;

  if (season === 'Winter' && buildings.fire_pit === 0) {
    stabilityDelta -= 1.0; // Winter chill without fire pit
  }

  // If population is content (food rate > 0 and stability < 80), natural slow recovery
  if (foodRate >= 0 && state.resources.stability < 70) {
    stabilityDelta += 0.5;
  }

  return {
    food: Number(foodRate.toFixed(2)),
    materials: Number(materialsRate.toFixed(2)),
    knowledge: Number(knowledgeRate.toFixed(2)),
    stability: Number(stabilityDelta.toFixed(2)),
  };
}

export function checkRungPrerequisites(
  state: TimelineState,
  targetRung: RungId
): { eligible: boolean; reasons: string[] } {
  const def = RUNGS[targetRung];
  const reasons: string[] = [];

  const currentIdx = RUNG_ORDER.indexOf(state.rung);
  const targetIdx = RUNG_ORDER.indexOf(targetRung);

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
  if (prereqs.huts && state.buildings.hut < prereqs.huts) {
    reasons.push(
      `Requires ${prereqs.huts} Huts (Current: ${state.buildings.hut})`
    );
  }
  if (prereqs.workshop && state.buildings.workshop < prereqs.workshop) {
    reasons.push(
      `Requires ${prereqs.workshop} Workshop (Current: ${state.buildings.workshop})`
    );
  }
  if (prereqs.granary && state.buildings.granary < prereqs.granary) {
    reasons.push(
      `Requires ${prereqs.granary} Granary (Current: ${state.buildings.granary})`
    );
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
  const rungBonus =
    state.rung === 'village'
      ? 5
      : state.rung === 'settlement'
      ? 3
      : state.rung === 'band'
      ? 1
      : 0;

  const yearComponent = Math.floor(Math.sqrt(state.year));
  const knowledgeComponent = Math.floor(state.resources.knowledge / 40);
  const popComponent = Math.floor(state.population.total / 4);

  return Math.max(1, yearComponent + rungBonus + knowledgeComponent + popComponent);
}
