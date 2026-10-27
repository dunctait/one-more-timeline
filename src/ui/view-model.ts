import {
  BUILDINGS,
  calculateNetRates,
  calculateTimeJumpInsight,
  checkRungPrerequisites,
  getBuildingCost,
  RUNGS,
  RUNG_ORDER,
} from '../engine/rules.js';
import {
  BuildingId,
  LogEntry,
  RoleId,
  RungId,
  TimelineState,
} from '../engine/types.js';

export interface RoleViewModel {
  id: RoleId;
  name: string;
  count: number;
  unlocked: boolean;
  unlockPrereq: string;
  canAdd: boolean;
  canRemove: boolean;
  description: string;
}

export interface BuildingViewModel {
  id: BuildingId;
  name: string;
  description: string;
  count: number;
  unlocked: boolean;
  unlockPrereq: string;
  cost: { materials: number; food: number; knowledge: number };
  costString: string;
  canAfford: boolean;
}

export interface RungPrerequisiteItem {
  name: string;
  current: number;
  required: number;
  met: boolean;
}

export interface RungProgressionViewModel {
  currentId: RungId;
  currentName: string;
  currentSubtitle: string;
  currentDescription: string;
  nextRung: {
    id: RungId;
    name: string;
    subtitle: string;
    description: string;
    unlockedFeatures: string[];
    eligible: boolean;
    reasons: string[];
    items: RungPrerequisiteItem[];
  } | null;
}

export interface TimeJumpViewModel {
  eligible: boolean;
  projectedInsight: number;
  description: string;
}

export interface TimelineViewModel {
  header: {
    timelineId: string;
    year: number;
    season: string;
    seasonClass: string;
    rungName: string;
    furthestYear: number;
    timelinesCreated: number;
    insight: number;
  };
  resources: {
    food: {
      current: number;
      max: number;
      rate: number;
      rateFormatted: string;
      isDeficit: boolean;
      percentage: number;
    };
    materials: {
      current: number;
      max: number;
      rate: number;
      rateFormatted: string;
      percentage: number;
    };
    knowledge: {
      current: number;
      max: number;
      rate: number;
      rateFormatted: string;
      percentage: number;
    };
    stability: {
      current: number;
      label: string;
      statusClass: string;
    };
  };
  population: {
    total: number;
    max: number;
    unassigned: number;
    roles: RoleViewModel[];
  };
  actions: {
    canForage: boolean;
    canScavenge: boolean;
    canStudy: boolean;
    actionPacing: string;
    forageYield: number;
    pacing: string;
    learningGrace: string;
  };
  buildings: BuildingViewModel[];
  rungProgression: RungProgressionViewModel;
  timeJump: TimeJumpViewModel;
  logs: LogEntry[];
}

export const PRESTIGE_TOAST_MESSAGE =
  '🌀 Temporal Horizon Reached: The timeline has reached its zenith! Time Jump is now ready in Evolution to collapse this timeline into enduring Insight.';

export function shouldShowPrestigeToast(
  state: TimelineState,
  dismissedTimelineId: string | null
): boolean {
  return state.year >= 3 && dismissedTimelineId !== state.timelineId;
}

export function countNewLogIds(
  logs: LogEntry[],
  seenIds: ReadonlySet<string>
): { count: number; updatedSeenIds: Set<string> } {
  const updatedSeenIds = new Set(seenIds);
  const newLogs = logs.filter((log) => !updatedSeenIds.has(log.id));
  newLogs.forEach((log) => updatedSeenIds.add(log.id));
  return { count: newLogs.length, updatedSeenIds };
}

export function formatRate(rate: number): string {
  if (rate > 0) return `+${rate.toFixed(1)}/t`;
  if (rate < 0) return `${rate.toFixed(1)}/t`;
  return '0.0/t';
}

export function getStabilityLabel(stability: number): {
  label: string;
  statusClass: string;
} {
  if (stability >= 80) return { label: 'Thriving', statusClass: 'status-thriving' };
  if (stability >= 55) return { label: 'Stable', statusClass: 'status-stable' };
  if (stability >= 30) return { label: 'Strained', statusClass: 'status-strained' };
  if (stability > 0) return { label: 'Critical', statusClass: 'status-critical' };
  return { label: 'Starving', statusClass: 'status-starving' };
}

export function buildTimelineViewModel(state: TimelineState): TimelineViewModel {
  const rawRates = calculateNetRates(state);
  const rates =
    state.learningGraceTicks > 0 && state.rung === 'hearth'
      ? { ...rawRates, food: Math.max(0, rawRates.food) }
      : rawRates;

  const seasonClass = `season-${state.season.toLowerCase()}`;

  // Stability
  const { label: stabilityLabel, statusClass: stabilityClass } = getStabilityLabel(
    state.resources.stability
  );

  // Population roles
  const RUNG_LEVELS: Record<RungId, number> = {
    hearth: 0,
    band: 1,
    settlement: 2,
    village: 3,
  };
  const currentLevel = RUNG_LEVELS[state.rung];

  const roleDefinitions: Array<{
    id: RoleId;
    name: string;
    minRung: RungId;
    description: string;
  }> = [
    {
      id: 'forager',
      name: 'Forager',
      minRung: 'band',
      description: 'Gathers wild food (+1.5 Food/tick, +0.9 in Winter).',
    },
    {
      id: 'builder',
      name: 'Builder',
      minRung: 'band',
      description: 'Collects and shapes materials (+1.0 Materials/tick).',
    },
    {
      id: 'scholar',
      name: 'Scholar',
      minRung: 'settlement',
      description: 'Contemplates time and stone (+0.8 Knowledge/tick).',
    },
    {
      id: 'healer',
      name: 'Healer',
      minRung: 'village',
      description: 'Tends to the sick and preserves community (+2.0 Stability/tick).',
    },
  ];

  const rolesVm: RoleViewModel[] = roleDefinitions.map((roleDef) => {
    const unlocked = currentLevel >= RUNG_LEVELS[roleDef.minRung];
    const count = state.population.roles[roleDef.id];
    const canAdd = unlocked && state.population.roles.unassigned > 0;
    const canRemove = count > 0;

    return {
      id: roleDef.id,
      name: roleDef.name,
      count,
      unlocked,
      unlockPrereq: `Unlocks at ${RUNGS[roleDef.minRung].name}`,
      canAdd,
      canRemove,
      description: roleDef.description,
    };
  });

  // Buildings
  const buildingsVm: BuildingViewModel[] = (
    Object.keys(BUILDINGS) as BuildingId[]
  ).map((bId) => {
    const def = BUILDINGS[bId];
    const count = state.buildings[bId];
    const unlocked = currentLevel >= RUNG_LEVELS[def.unlockedAt];
    const cost = getBuildingCost(bId, count);

    const costParts: string[] = [];
    if (cost.materials) costParts.push(`${cost.materials} Mats`);
    if (cost.food) costParts.push(`${cost.food} Food`);
    if (cost.knowledge) costParts.push(`${cost.knowledge} Knw`);

    const canAfford =
      state.resources.materials >= cost.materials &&
      state.resources.food >= (cost.food || 0) &&
      state.resources.knowledge >= (cost.knowledge || 0);

    return {
      id: bId,
      name: def.name,
      description: def.description,
      count,
      unlocked,
      unlockPrereq: `Unlocks at ${RUNGS[def.unlockedAt].name}`,
      cost,
      costString: costParts.join(', '),
      canAfford,
    };
  });

  // Rung progression
  const currentRungIdx = RUNG_ORDER.indexOf(state.rung);
  const nextRungId =
    currentRungIdx < RUNG_ORDER.length - 1 ? RUNG_ORDER[currentRungIdx + 1] : null;

  let nextRungVm: RungProgressionViewModel['nextRung'] = null;
  if (nextRungId) {
    const check = checkRungPrerequisites(state, nextRungId);
    const nextDef = RUNGS[nextRungId];
    const items: RungPrerequisiteItem[] = [];
    const prereqs = nextDef.prerequisites;
    if (prereqs) {
      if (prereqs.year) {
        items.push({
          name: 'Year',
          current: state.year,
          required: prereqs.year,
          met: state.year >= prereqs.year,
        });
      }
      if (prereqs.knowledge) {
        items.push({
          name: 'Knowledge',
          current: Math.floor(state.resources.knowledge),
          required: prereqs.knowledge,
          met: state.resources.knowledge >= prereqs.knowledge,
        });
      }
      if (prereqs.food) {
        items.push({
          name: 'Food',
          current: Math.floor(state.resources.food),
          required: prereqs.food,
          met: state.resources.food >= prereqs.food,
        });
      }
      if (prereqs.materials) {
        items.push({
          name: 'Materials',
          current: Math.floor(state.resources.materials),
          required: prereqs.materials,
          met: state.resources.materials >= prereqs.materials,
        });
      }
      if (prereqs.population) {
        items.push({
          name: 'Population',
          current: state.population.total,
          required: prereqs.population,
          met: state.population.total >= prereqs.population,
        });
      }
      if (prereqs.huts) {
        items.push({
          name: 'Huts',
          current: state.buildings.hut,
          required: prereqs.huts,
          met: state.buildings.hut >= prereqs.huts,
        });
      }
      if (prereqs.workshop) {
        items.push({
          name: 'Workshop',
          current: state.buildings.workshop,
          required: prereqs.workshop,
          met: state.buildings.workshop >= prereqs.workshop,
        });
      }
      if (prereqs.granary) {
        items.push({
          name: 'Granary',
          current: state.buildings.granary,
          required: prereqs.granary,
          met: state.buildings.granary >= prereqs.granary,
        });
      }
    }

    const unlockedFeatures: string[] = [];
    if (nextRungId === 'band') {
      unlockedFeatures.push('Foragers', 'Builders', 'Thatched Huts', 'Elevated Granaries');
    } else if (nextRungId === 'settlement') {
      unlockedFeatures.push('Scholars', 'Tool Workshops', 'Eternal Fire Pits', 'Chronicle Obelisks');
    } else if (nextRungId === 'village') {
      unlockedFeatures.push('Healers', 'Expanded Horizon');
    }

    nextRungVm = {
      id: nextRungId,
      name: nextDef.name,
      subtitle: nextDef.subtitle,
      description: nextDef.description,
      unlockedFeatures,
      eligible: check.eligible,
      reasons: check.reasons,
      items,
    };
  }

  // Time Jump
  const timeJumpEligible = state.year >= 3;
  const projectedInsight = calculateTimeJumpInsight(state);

  return {
    header: {
      timelineId: state.timelineId,
      year: state.year,
      season: state.season,
      seasonClass,
      rungName: RUNGS[state.rung].name,
      furthestYear: state.furthestYear,
      timelinesCreated: state.timelinesCreated,
      insight: state.insight,
    },
    resources: {
      food: {
        current: Math.floor(state.resources.food),
        max: state.caps.food,
        rate: rates.food,
        rateFormatted: formatRate(rates.food),
        isDeficit: rates.food < 0,
        percentage: Math.min(100, Math.floor((state.resources.food / state.caps.food) * 100)),
      },
      materials: {
        current: Math.floor(state.resources.materials),
        max: state.caps.materials,
        rate: rates.materials,
        rateFormatted: formatRate(rates.materials),
        percentage: Math.min(
          100,
          Math.floor((state.resources.materials / state.caps.materials) * 100)
        ),
      },
      knowledge: {
        current: Math.floor(state.resources.knowledge),
        max: state.caps.knowledge,
        rate: rates.knowledge,
        rateFormatted: formatRate(rates.knowledge),
        percentage: Math.min(
          100,
          Math.floor((state.resources.knowledge / state.caps.knowledge) * 100)
        ),
      },
      stability: {
        current: Math.floor(state.resources.stability),
        label: stabilityLabel,
        statusClass: stabilityClass,
      },
    },
    population: {
      total: state.population.total,
      max: state.population.max,
      unassigned: state.population.roles.unassigned,
      roles: rolesVm,
    },
     actions: {
       canForage: true,
       canScavenge: true,
       canStudy: true,
       actionPacing: 'Manual actions resolve immediately. Repeat any action whenever you choose.',
       forageYield: state.season === 'Winter' ? 1.8 : 3,
       pacing: 'Act quickly or let the timeline breathe; ticks continue independently.',
      learningGrace:
        state.learningGraceTicks > 0
          ? `Learning grace: ${state.learningGraceTicks} ticks. Reading and exploring will not drain the hearth.`
          : 'Learning grace ended: keep an eye on food and stability.',
    },
    buildings: buildingsVm,
    rungProgression: {
      currentId: state.rung,
      currentName: RUNGS[state.rung].name,
      currentSubtitle: RUNGS[state.rung].subtitle,
      currentDescription: RUNGS[state.rung].description,
      nextRung: nextRungVm,
    },
    timeJump: {
      eligible: timeJumpEligible,
      projectedInsight,
      description: timeJumpEligible
        ? `Collapse this timeline to awaken in a new dawn. Retains Furthest Year (${Math.max(
            state.furthestYear,
            state.year
          )}) and grants +${projectedInsight} permanent Insight.`
        : 'The timeline is too fragile to yield Insight. Endure until at least Year 3 to initiate a Time Jump.',
    },
    logs: state.logs,
  };
}
