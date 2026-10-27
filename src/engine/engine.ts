import {
  BUILDINGS,
  calculateCaps,
  calculateNetRates,
  calculateTimeJumpInsight,
  checkRungPrerequisites,
  getBuildingCost,
  RUNGS,
  SEASONS,
} from './rules.js';
import {
  BuildingId,
  EngineAction,
  EngineResult,
  LogEntry,
  RoleId,
  TimelineState,
} from './types.js';

let logIdCounter = 0;
function createLog(
  tick: number,
  year: number,
  text: string,
  type: LogEntry['type'] = 'info'
): LogEntry {
  logIdCounter += 1;
  return {
    id: `log_${tick}_${logIdCounter}`,
    tick,
    year,
    text,
    type,
  };
}

export function createInitialState(options?: {
  timelineId?: string;
  seed?: number;
  furthestYear?: number;
  timelinesCreated?: number;
  insight?: number;
}): TimelineState {
  const seed = options?.seed ?? 1337;
  const furthestYear = Math.max(1, options?.furthestYear ?? 1);
  const timelinesCreated = options?.timelinesCreated ?? 0;
  const insight = options?.insight ?? 0;
  const timelineId =
    options?.timelineId ?? `timeline_${Date.now().toString(36)}_${timelinesCreated}`;

  const buildings = {
    hut: 0,
    granary: 0,
    workshop: 0,
    fire_pit: 0,
    chronicle_stone: 0,
  };

  const caps = calculateCaps(buildings, 'hearth');

  // Insight bonus: starting resources are enhanced by legacy Insight
  const startingFood = Math.min(caps.food, 12 + Math.min(insight * 2, 20));
  const startingMaterials = Math.min(caps.materials, 6 + Math.min(insight, 15));
  const startingKnowledge = Math.min(caps.knowledge, Math.floor(insight * 0.5));

  const initialLogText =
    timelinesCreated > 0
      ? `Timeline #${timelinesCreated + 1} begun with ${insight} Insight. Furthest recorded year: ${furthestYear}.`
      : 'You awaken beside a dim, flickering hearth. The timeline begins.';

  return {
    timelineId,
    schemaVersion: 1,
    rulesetVersion: '0.1.0',
    seed,
    tick: 0,
    year: 1,
    season: 'Spring',
    furthestYear,
    timelinesCreated,
    insight,
    rung: 'hearth',
    resources: {
      food: startingFood,
      materials: startingMaterials,
      knowledge: startingKnowledge,
      stability: 75,
    },
    caps,
    population: {
      total: 1,
      max: caps.population,
      roles: {
        unassigned: 1,
        forager: 0,
        scholar: 0,
        healer: 0,
        builder: 0,
      },
    },
    buildings,
    logs: [createLog(0, 1, initialLogText, timelinesCreated > 0 ? 'prestige' : 'milestone')],
  };
}

export function stepTick(state: TimelineState): TimelineState {
  const nextTick = state.tick + 1;
  const nextSeason = SEASONS[nextTick % 4];
  const nextYear = 1 + Math.floor(nextTick / 4);
  const nextFurthestYear = Math.max(state.furthestYear, nextYear);

  const newLogs: LogEntry[] = [];

  // New year notification
  if (nextTick % 4 === 0) {
    newLogs.push(
      createLog(nextTick, nextYear, `Year ${nextYear} begins as the spring thaw settles in.`, 'info')
    );
  }

  // Calculate net production rates
  const rates = calculateNetRates(state);

  let nextFood = Math.max(0, Math.min(state.caps.food, state.resources.food + rates.food));
  const nextMaterials = Math.max(
    0,
    Math.min(state.caps.materials, state.resources.materials + rates.materials)
  );
  const nextKnowledge = Math.max(
    0,
    Math.min(state.caps.knowledge, state.resources.knowledge + rates.knowledge)
  );

  let nextStability = Math.max(
    0,
    Math.min(100, state.resources.stability + rates.stability)
  );

  let currentTotalPop = state.population.total;
  let currentUnassigned = state.population.roles.unassigned;

  // Starvation condition
  if (state.resources.food <= 0 && rates.food < 0) {
    nextStability = Math.max(0, nextStability - 8);
    newLogs.push(
      createLog(
        nextTick,
        nextYear,
        'Food stores are empty! Desperation grips your settlement.',
        'warning'
      )
    );

    // If starving and stability critically low, someone may perish or leave
    if (nextStability <= 10 && currentTotalPop > 1) {
      currentTotalPop -= 1;
      if (currentUnassigned > 0) {
        currentUnassigned -= 1;
      } else {
        // Remove from a role
        const roleOrder: RoleId[] = ['scholar', 'builder', 'forager', 'healer'];
        for (const r of roleOrder) {
          if (state.population.roles[r] > 0) {
            state.population.roles[r] -= 1;
            break;
          }
        }
      }
      newLogs.push(
        createLog(
          nextTick,
          nextYear,
          'A member of your community was lost to famine.',
          'warning'
        )
      );
    }
  }

  // Population growth condition
  // Pop grows when there is food room, stability >= 60, pop total < pop max, and spring/autumn
  if (
    nextFood >= 10 &&
    nextStability >= 60 &&
    currentTotalPop < state.population.max &&
    nextTick % 2 === 0
  ) {
    // Consume 5 food for welcoming new member
    nextFood = Math.max(0, nextFood - 4);
    currentTotalPop += 1;
    currentUnassigned += 1;
    newLogs.push(
      createLog(
        nextTick,
        nextYear,
        'Attracted by your warm fire, a wanderer joins your band.',
        'info'
      )
    );
  }

  // Limit logs to last 50 entries
  const combinedLogs = [...newLogs, ...state.logs].slice(0, 50);

  return {
    ...state,
    tick: nextTick,
    year: nextYear,
    season: nextSeason,
    furthestYear: nextFurthestYear,
    resources: {
      food: Number(nextFood.toFixed(2)),
      materials: Number(nextMaterials.toFixed(2)),
      knowledge: Number(nextKnowledge.toFixed(2)),
      stability: Number(nextStability.toFixed(2)),
    },
    population: {
      ...state.population,
      total: currentTotalPop,
      roles: {
        ...state.population.roles,
        unassigned: currentUnassigned,
      },
    },
    logs: combinedLogs,
  };
}

export function executeAction(
  state: TimelineState,
  action: EngineAction
): EngineResult {
  switch (action.type) {
    case 'TICK': {
      const nextState = stepTick(state);
      return { success: true, state: nextState, events: ['Ticked'] };
    }

    case 'FORAGE': {
      // Foraging yields food and sometimes a trace of materials
      const isWinter = state.season === 'Winter';
      const foodGain = isWinter ? 2.0 : 3.5;
      const materialsGain = isWinter ? 0.5 : 1.0;

      const newFood = Math.min(state.caps.food, state.resources.food + foodGain);
      const newMaterials = Math.min(
        state.caps.materials,
        state.resources.materials + materialsGain
      );

      const log = createLog(
        state.tick,
        state.year,
        `Foraged the wilderness (+${foodGain} Food, +${materialsGain} Materials).`
      );

      const nextState: TimelineState = {
        ...state,
        resources: {
          ...state.resources,
          food: Number(newFood.toFixed(2)),
          materials: Number(newMaterials.toFixed(2)),
        },
        logs: [log, ...state.logs].slice(0, 50),
      };

      return {
        success: true,
        state: nextState,
        events: [`Foraged +${foodGain} Food, +${materialsGain} Materials`],
      };
    }

    case 'STUDY': {
      // Manual study yields knowledge and a small stability grounding
      const knowledgeGain = 2.0;
      const newKnowledge = Math.min(
        state.caps.knowledge,
        state.resources.knowledge + knowledgeGain
      );
      const newStability = Math.min(100, state.resources.stability + 1);

      const log = createLog(
        state.tick,
        state.year,
        `Gazed into the embers and night sky (+${knowledgeGain} Knowledge).`
      );

      const nextState: TimelineState = {
        ...state,
        resources: {
          ...state.resources,
          knowledge: Number(newKnowledge.toFixed(2)),
          stability: Number(newStability.toFixed(2)),
        },
        logs: [log, ...state.logs].slice(0, 50),
      };

      return {
        success: true,
        state: nextState,
        events: [`Studied +${knowledgeGain} Knowledge`],
      };
    }

    case 'ASSIGN_ROLE': {
      const { role, delta } = action;

      // Check role unlocks based on rung
      if (role === 'forager' || role === 'builder') {
        if (state.rung === 'hearth') {
          return {
            success: false,
            state,
            error: 'You must reach the Gathering Band rung to assign Foragers and Builders.',
            events: [],
          };
        }
      } else if (role === 'scholar') {
        if (state.rung === 'hearth' || state.rung === 'band') {
          return {
            success: false,
            state,
            error: 'You must reach the Settled Camp rung to appoint Scholars.',
            events: [],
          };
        }
      } else if (role === 'healer') {
        if (state.rung !== 'village') {
          return {
            success: false,
            state,
            error: 'You must reach the Dawn Village rung to appoint Healers.',
            events: [],
          };
        }
      }

      if (delta > 0) {
        if (state.population.roles.unassigned < delta) {
          return {
            success: false,
            state,
            error: 'Not enough unassigned population available.',
            events: [],
          };
        }
      } else if (delta < 0) {
        if (state.population.roles[role] < Math.abs(delta)) {
          return {
            success: false,
            state,
            error: `Cannot remove more ${role}s than currently assigned.`,
            events: [],
          };
        }
      }

      const nextRoles = {
        ...state.population.roles,
        unassigned: state.population.roles.unassigned - delta,
        [role]: state.population.roles[role] + delta,
      };

      const log = createLog(
        state.tick,
        state.year,
        `${delta > 0 ? 'Assigned' : 'Unassigned'} 1 ${role}.`
      );

      const nextState: TimelineState = {
        ...state,
        population: {
          ...state.population,
          roles: nextRoles,
        },
        logs: [log, ...state.logs].slice(0, 50),
      };

      return {
        success: true,
        state: nextState,
        events: [`Updated role ${role}: ${nextRoles[role]}`],
      };
    }

    case 'BUILD': {
      const { buildingId } = action;
      const def = BUILDINGS[buildingId];
      if (!def) {
        return {
          success: false,
          state,
          error: `Unknown building: ${buildingId}`,
          events: [],
        };
      }

      // Check rung prerequisite
      const RUNG_LEVELS = { hearth: 0, band: 1, settlement: 2, village: 3 };
      if (RUNG_LEVELS[state.rung] < RUNG_LEVELS[def.unlockedAt]) {
        return {
          success: false,
          state,
          error: `${def.name} requires reaching ${RUNGS[def.unlockedAt].name}.`,
          events: [],
        };
      }

      const currentCount = state.buildings[buildingId] || 0;
      const cost = getBuildingCost(buildingId, currentCount);

      if (state.resources.materials < cost.materials) {
        return {
          success: false,
          state,
          error: `Requires ${cost.materials} Materials (have ${Math.floor(state.resources.materials)}).`,
          events: [],
        };
      }
      if (cost.food && state.resources.food < cost.food) {
        return {
          success: false,
          state,
          error: `Requires ${cost.food} Food (have ${Math.floor(state.resources.food)}).`,
          events: [],
        };
      }
      if (cost.knowledge && state.resources.knowledge < cost.knowledge) {
        return {
          success: false,
          state,
          error: `Requires ${cost.knowledge} Knowledge (have ${Math.floor(state.resources.knowledge)}).`,
          events: [],
        };
      }

      const nextBuildings = {
        ...state.buildings,
        [buildingId]: currentCount + 1,
      };

      const nextCaps = calculateCaps(nextBuildings, state.rung);

      const log = createLog(
        state.tick,
        state.year,
        `Constructed a ${def.name}.`,
        'milestone'
      );

      const nextState: TimelineState = {
        ...state,
        resources: {
          ...state.resources,
          materials: Number((state.resources.materials - cost.materials).toFixed(2)),
          food: Number((state.resources.food - cost.food).toFixed(2)),
          knowledge: Number((state.resources.knowledge - cost.knowledge).toFixed(2)),
        },
        caps: {
          food: nextCaps.food,
          materials: nextCaps.materials,
          knowledge: nextCaps.knowledge,
        },
        population: {
          ...state.population,
          max: nextCaps.population,
        },
        buildings: nextBuildings,
        logs: [log, ...state.logs].slice(0, 50),
      };

      return {
        success: true,
        state: nextState,
        events: [`Constructed ${def.name}`],
      };
    }

    case 'ADVANCE_RUNG': {
      const { rungId } = action;
      const check = checkRungPrerequisites(state, rungId);
      if (!check.eligible) {
        return {
          success: false,
          state,
          error: `Cannot advance to ${RUNGS[rungId].name}: ${check.reasons.join(', ')}`,
          events: [],
        };
      }

      const nextCaps = calculateCaps(state.buildings, rungId);
      const log = createLog(
        state.tick,
        state.year,
        `Advanced to the "${RUNGS[rungId].name}" rung! ${RUNGS[rungId].subtitle}`,
        'milestone'
      );

      const nextState: TimelineState = {
        ...state,
        rung: rungId,
        caps: {
          food: nextCaps.food,
          materials: nextCaps.materials,
          knowledge: nextCaps.knowledge,
        },
        population: {
          ...state.population,
          max: nextCaps.population,
        },
        logs: [log, ...state.logs].slice(0, 50),
      };

      return {
        success: true,
        state: nextState,
        events: [`Advanced to ${RUNGS[rungId].name}`],
      };
    }

    case 'TIME_JUMP': {
      if (state.year < 3) {
        return {
          success: false,
          state,
          error: 'The timeline must persist until at least Year 3 before a Time Jump can be achieved.',
          events: [],
        };
      }

      const gainedInsight = calculateTimeJumpInsight(state);
      const newFurthestYear = Math.max(state.furthestYear, state.year);
      const nextTimelinesCreated = state.timelinesCreated + 1;
      const totalInsight = state.insight + gainedInsight;

      const resetState = createInitialState({
        furthestYear: newFurthestYear,
        timelinesCreated: nextTimelinesCreated,
        insight: totalInsight,
      });

      const jumpLog = createLog(
        0,
        1,
        `Timeline collapsed at Year ${state.year}. Gained +${gainedInsight} Insight (Total: ${totalInsight}). Furthest Year: ${newFurthestYear}.`,
        'prestige'
      );

      resetState.logs = [jumpLog, ...resetState.logs];

      return {
        success: true,
        state: resetState,
        events: [`Time jump completed: +${gainedInsight} Insight`],
      };
    }

    case 'DEV_ADD_RESOURCES': {
      const amount = action.amount || 50;
      const nextState: TimelineState = {
        ...state,
        resources: {
          food: Math.min(state.caps.food, state.resources.food + amount),
          materials: Math.min(state.caps.materials, state.resources.materials + amount),
          knowledge: Math.min(state.caps.knowledge, state.resources.knowledge + amount),
          stability: Math.min(100, state.resources.stability + 20),
        },
        logs: [
          createLog(
            state.tick,
            state.year,
            `[DEV MODE] Added +${amount} resources to inventory.`
          ),
          ...state.logs,
        ].slice(0, 50),
      };

      return {
        success: true,
        state: nextState,
        events: [`[Dev] Added +${amount} resources`],
      };
    }

    case 'DEV_SET_YEAR': {
      const targetYear = Math.max(1, action.year);
      const targetTick = (targetYear - 1) * 4;
      const nextState: TimelineState = {
        ...state,
        year: targetYear,
        tick: targetTick,
        furthestYear: Math.max(state.furthestYear, targetYear),
        season: 'Spring',
        logs: [
          createLog(
            targetTick,
            targetYear,
            `[DEV MODE] Timeline warped to Year ${targetYear}.`
          ),
          ...state.logs,
        ].slice(0, 50),
      };

      return {
        success: true,
        state: nextState,
        events: [`[Dev] Warped to Year ${targetYear}`],
      };
    }

    case 'DEV_RESET': {
      const resetState = createInitialState();
      return {
        success: true,
        state: resetState,
        events: ['[Dev] Completely reset game state'],
      };
    }

    default:
      return {
        success: false,
        state,
        error: 'Unsupported engine action',
        events: [],
      };
  }
}
