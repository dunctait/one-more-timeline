import { findNewAchievements } from './achievements.js';
import { getChallenge } from './challenges.js';
import { DISCOVERIES, discoveryBonus, getDiscovery, legacyMet, legacyNote } from './discoveries.js';
import { edictBonus, getEdict } from './edicts.js';
import { EVENTS, eventScale, getEvent, MAX_WAITING_TALES, rollEvent, seededUnit, timelineSeed } from './events.js';
import type { EventChoice, EventDef } from './events.js';
import { personName } from './people.js';
import { getRelic, RELICS, RELIC_CHANCE, relicBonus } from './relics.js';
import {
  BUILDING_IDS,
  BUILDINGS,
  activeEdicts,
  barterRatio,
  calculateCaps,
  calculatePrestigeGain,
  checkPrestigeTier,
  checkTimeJump,
  createEmptyBuildings,
  getStartingRung,
  insightStartBonus,
  ROLE_MIN_RUNG,
  RUNG_ORDER,
  FEATURE_IDS,
  FEATURES,
  featuresEarned,
  hasFeature,
  LORE_KEEPER_DISCOVERIES,
  BOON_FIRST_JUMPBACK,
  START_POPULATION,
  openJobs,
  BOON_OFFERS,
  PACKED_PROVISIONS,
  marketRungFor,
  discoveryCost,
  PRESTIGE_TIERS,
  rungLevel,
  calculateNetRates,
  calculateTimeJumpInsight,
  checkRungPrerequisites,
  getBuildingCost,
  RUNGS,
  SEASONS,
} from './rules.js';
import {
  AutomationSettings,
  BuildingId,
  EngineAction,
  FeatureId,
  HistoryEntry,
  LifetimeStats,
  EngineResult,
  LogEntry,
  RoleId,
  TimelineState,
} from './types.js';

function createLog(
  tick: number,
  year: number,
  text: string,
  type: LogEntry['type'] = 'info'
): LogEntry {
  return {
    id: `log_${tick}_${year}_${text}`, 
    tick,
    year,
    text,
    type,
  };
}

/** Where a timeline's people begin, and the room they have before any shelter is built. */
function homePeople(features: readonly FeatureId[], relics: readonly string[]): number {
  return START_POPULATION + relicBonus(relics, 'startPeople') + (features.includes('founders') ? 1 : 0);
}

export function createInitialState(options?: {
  timelineId?: string;
  seed?: number;
  furthestYear?: number;
  timelinesCreated?: number;
  insight?: number;
  echoes?: number;
  resonance?: number;
  eternity?: number;
  features?: FeatureId[];
  achievements?: string[];
  automation?: AutomationSettings;
  prestigeCounts?: TimelineState['prestigeCounts'];
  pendingBoon?: FeatureId[] | null;
  edicts?: Record<string, string>;
  history?: HistoryEntry[];
  relics?: string[];
  challenge?: string | null;
}): TimelineState {
  const seed = options?.seed ?? 1337;
  const furthestYear = Math.max(1, options?.furthestYear ?? 1);
  const timelinesCreated = options?.timelinesCreated ?? 0;
  const insight = options?.insight ?? 0;
  const echoes = options?.echoes ?? 0;
  const resonance = options?.resonance ?? 0;
  const eternity = options?.eternity ?? 0;
  const startRung = getStartingRung({ resonance, eternity });
  const timelineId = options?.timelineId ?? `timeline_${seed}_${timelinesCreated}`;

  const features = options?.features ?? [];
  const buildings = createEmptyBuildings();
  if (features.includes('inherited_foundations')) {
    buildings.hut = 1;
    buildings.granary = 1;
    buildings.workshop = 1;
  }
  if (features.includes('grand_foundations')) {
    buildings.chronicle_stone = 1;
    buildings.fire_pit = 1;
  }

  const relics = options?.relics ?? [];
  const discoveries = features.includes('lore_keepers') ? [...LORE_KEEPER_DISCOVERIES] : [];
  const caps = calculateCaps(buildings, startRung, discoveries, homePeople(features, relics));
  const startPeople = caps.population;

  // Insight bonus: starting resources are enhanced by legacy Insight
  const bonus = insightStartBonus(insight);
  const packed = features.includes('packed_provisions') ? PACKED_PROVISIONS : { food: 0, materials: 0, knowledge: 0 };
  const startingFood = Math.min(caps.food, 12 + bonus.food + relicBonus(relics, 'startFood') + packed.food);
  const startingMaterials = Math.min(caps.materials, 6 + bonus.materials + packed.materials);
  const startingKnowledge = Math.min(caps.knowledge, bonus.knowledge + packed.knowledge);

  const initialLogText =
    timelinesCreated > 0
      ? `Timeline #${timelinesCreated + 1} begun with ${insight} Insight. Furthest recorded year: ${furthestYear}.`
      : 'You awaken beside a dim, flickering hearth. The timeline begins.';

  return {
    timelineId,
    schemaVersion: 1,
    rulesetVersion: '0.2.0',
    seed,
    tick: 0,
    year: 1,
    season: 'Spring',
    furthestYear,
    timelinesCreated,
    insight,
    echoes,
    resonance,
    eternity,
    features,
    achievements: options?.achievements ?? [],
    history: options?.history ?? [],
    relics,
    pendingChoice: null,
    waitingEvents: [],
    pendingBoon: options?.pendingBoon ?? null,
    stats: { ticks: 0, gathers: 0, built: 0, researched: 0, traded: 0, events: 0 },
    challenge: options?.challenge ?? null,
    edicts: features.includes('seasoned_memory') ? { ...(options?.edicts ?? {}) } : {},
    discoveries,
    automation: options?.automation ?? { assign: true, advance: true, build: true, research: true },
    prestigeCounts: options?.prestigeCounts ?? { 1: 0, 2: 0, 3: 0, 4: 0 },
    actionCooldown: 0,
    rung: startRung,
    resources: {
      food: startingFood,
      materials: startingMaterials,
      knowledge: startingKnowledge,
      stability: 75,
    },
    caps: { food: caps.food, materials: caps.materials, knowledge: caps.knowledge },
    population: {
      total: startPeople,
      max: caps.population,
      roles: {
        unassigned: startPeople,
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

export function manualMultiplier(
  state: Pick<TimelineState, 'discoveries' | 'edicts' | 'rung' | 'relics'>
): number {
  return (
    1 +
    discoveryBonus(state.discoveries, 'manual') +
    edictBonus(activeEdicts(state), 'manual') +
    relicBonus(state.relics, 'manual')
  );
}

const YEAR_OPENINGS = [
  (y: number) => `Year ${y} begins as the spring thaw settles in.`,
  (y: number) => `Year ${y} dawns with birdsong over the fields.`,
  (y: number) => `A new year, ${y}, breaks cold and clear.`,
  (y: number) => `Year ${y} arrives; the days begin to lengthen.`,
  (y: number) => `Spring rain greets Year ${y}.`,
  (y: number) => `Year ${y} opens with green shoots everywhere.`,
];

function yearOpening(seed: number, tick: number, year: number): string {
  return YEAR_OPENINGS[Math.floor(seededUnit(seed, tick, 7) * YEAR_OPENINGS.length)](year);
}

function carryFeatures(
  state: TimelineState,
  tier: 1 | 2 | 3 | 4
): Pick<TimelineState, 'features' | 'automation' | 'prestigeCounts' | 'achievements'> {
  const prestigeCounts = { ...state.prestigeCounts, [tier]: state.prestigeCounts[tier] + 1 };
  const earned = featuresEarned(tier, prestigeCounts[tier]).map((f) => f.id);
  return {
    features: [...new Set([...state.features, ...earned])],
    automation: state.automation,
    prestigeCounts,
    achievements: state.achievements,
  };
}

/** The boons a Jumpback offers: up to BOON_OFFERS not yet owned, picked by the timeline's seed. */
export function boonOptions(
  state: Pick<TimelineState, 'features' | 'seed' | 'timelinesCreated'>,
  jumpbackNumber: number
): FeatureId[] | null {
  if (jumpbackNumber < BOON_FIRST_JUMPBACK) return null;
  const pool = FEATURE_IDS.filter((id) => FEATURES[id].boon && !state.features.includes(id));
  if (pool.length === 0) return null;
  const tseed = timelineSeed(state.seed, state.timelinesCreated);
  const ranked = pool
    .map((id, i) => ({ id, key: seededUnit(tseed, jumpbackNumber * 31 + i, 11) }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.id);
  return ranked.slice(0, BOON_OFFERS);
}

function recordHistory(state: TimelineState, tier: 1 | 2 | 3 | 4, gained: string): HistoryEntry[] {
  const entry: HistoryEntry = {
    number: state.timelinesCreated + 1,
    tier,
    year: state.year,
    rung: state.rung,
    gained,
  };
  return [entry, ...state.history].slice(0, 12);
}

/** Tells the player what a prestige quietly closed: an unanswered decision or a running challenge. */
function closureLogs(state: TimelineState, endsChallenge: boolean): LogEntry[] {
  const logs: LogEntry[] = [];
  const decision = state.pendingChoice && EVENTS.find((e) => e.id === state.pendingChoice?.eventId);
  if (decision) {
    logs.push(createLog(0, 1, `${decision.title}: the decision went unanswered as the timeline ended. Nothing was lost.`));
  }
  const challenge = endsChallenge && state.challenge ? getChallenge(state.challenge) : undefined;
  if (challenge) {
    logs.push(createLog(0, 1, `${challenge.icon} ${challenge.name} ended with the timeline. Nothing was lost; begin it again any time.`));
  }
  return logs;
}

function unlockLogs(state: TimelineState, tier: 1 | 2 | 3 | 4): LogEntry[] {
  return featuresEarned(tier, state.prestigeCounts[tier] + 1).map((f) =>
    createLog(0, 1, `${f.icon} Sent back through time: ${f.name}. ${f.description}`, 'prestige')
  );
}

/** Awards any newly satisfied achievements (permanent, gift-only). */
function grantAchievements(state: TimelineState): TimelineState {
  const earned = findNewAchievements(state);
  if (earned.length === 0) return state;
  const logs = earned.map((a) =>
    createLog(state.tick, state.year, `${a.icon} Achievement: ${a.name}. ${a.description}`, 'milestone')
  );
  return {
    ...state,
    achievements: [...state.achievements, ...earned.map((a) => a.id)],
    logs: [...logs, ...state.logs].slice(0, 50),
  };
}

/** Completes or ends the active challenge when its goal is reached or its time runs out. */
function settleChallenge(state: TimelineState): TimelineState {
  const def = state.challenge ? getChallenge(state.challenge) : undefined;
  if (!def) return state;
  if (rungLevel(state.rung) >= rungLevel(def.goalRung)) {
    const trophy = RELICS.find((r) => r.id === def.reward);
    return {
      ...state,
      challenge: null,
      relics: state.relics.includes(def.reward) ? state.relics : [...state.relics, def.reward],
      logs: [
        createLog(state.tick, state.year, `${def.icon} Challenge complete: ${def.name}! Trophy earned: ${trophy?.name ?? def.reward}.`, 'prestige'),
        ...state.logs,
      ].slice(0, 50),
    };
  }
  if (def.maxYear !== undefined && state.year > def.maxYear) {
    return {
      ...state,
      challenge: null,
      logs: [
        createLog(state.tick, state.year, `${def.icon} The time for ${def.name} has passed. Nothing is lost; try again whenever you like.`, 'info'),
        ...state.logs,
      ].slice(0, 50),
    };
  }
  return state;
}

/** Carries the lifetime counters across any action, including ones that reset the timeline. */
function withStats(
  before: TimelineState,
  after: TimelineState,
  bump: Partial<LifetimeStats>
): TimelineState {
  const stats = { ...before.stats };
  for (const key of Object.keys(bump) as Array<keyof LifetimeStats>) stats[key] += bump[key] ?? 0;
  return { ...after, stats };
}

/**
 * One tick. An urgent event stops the timeline until the player answers it. `quiet` (used while the player is away)
 * lets no urgent event arrive, so absence never leaves a decision that cost them time.
 */
export function stepTick(state: TimelineState, options: { quiet?: boolean } = {}): TimelineState {
  if (state.pendingChoice) return state;
  // Stats are counted inside the tick too (automation), so carry them forward from the result.
  const next = settleChallenge(stepTickCore(state, Boolean(options.quiet)));
  return grantAchievements(withStats(next, next, { ticks: 1 }));
}

/**
 * Settles one choice of an event. Costs come out of what the player holds (never below zero) and gains stop at the
 * storage cap; stability and newcomers are only ever added. A relic is sometimes found in the telling.
 */
function applyEventChoice(state: TimelineState, def: EventDef, choice: EventChoice): TimelineState {
  const scale = eventScale(rungLevel(state.rung), def.minRung);
  const move = (have: number, delta: number | undefined, cap: number): number =>
    Number(Math.min(cap, Math.max(0, have + (delta ?? 0) * scale)).toFixed(2));
  const room = Math.max(0, state.population.max - state.population.total);
  const arrivals = Math.min(choice.people ?? 0, room);
  const logs: LogEntry[] = [createLog(state.tick, state.year, `${def.title}: you chose "${choice.label}".`, 'milestone')];
  let relics = state.relics;
  const tseed = timelineSeed(state.seed, state.timelinesCreated);
  const pool = RELICS.filter((x) => !x.trophyOf && !relics.includes(x.id) && rungLevel(x.minRung) <= rungLevel(state.rung));
  if (pool.length > 0 && seededUnit(tseed, state.tick + state.stats.events, 3) < RELIC_CHANCE) {
    const found = pool[Math.floor(seededUnit(tseed, state.tick + state.stats.events, 4) * pool.length)];
    relics = [...relics, found.id];
    logs.unshift(createLog(state.tick, state.year, `${found.icon} Relic found: ${found.name}. ${found.description}`, 'prestige'));
  }
  return {
    ...state,
    relics,
    resources: {
      food: move(state.resources.food, choice.food, state.caps.food),
      materials: move(state.resources.materials, choice.materials, state.caps.materials),
      knowledge: move(state.resources.knowledge, choice.knowledge, state.caps.knowledge),
      stability: Number(Math.min(100, state.resources.stability + (choice.stability ?? 0)).toFixed(2)),
    },
    population: {
      ...state.population,
      total: state.population.total + arrivals,
      roles: { ...state.population.roles, unassigned: state.population.roles.unassigned + arrivals },
    },
    logs: [...logs, ...state.logs].slice(0, 50),
  };
}

export function executeAction(state: TimelineState, action: EngineAction): EngineResult {
  const result = executeActionCore(state, action);
  if (!result.success || action.type === 'DEV_RESET') return result;
  const bump: Partial<LifetimeStats> =
    action.type === 'FORAGE' || action.type === 'SCAVENGE' || action.type === 'STUDY'
      ? { gathers: 1 }
      : action.type === 'BUILD'
        ? { built: 1 }
        : action.type === 'RESEARCH'
          ? { researched: 1 }
          : action.type === 'BARTER'
            ? { traded: 1 }
            : action.type === 'RESOLVE_CHOICE' || action.type === 'RESOLVE_TALE'
              ? { events: 1 }
              : {};
  // A plain tick already settled challenges, counted stats and granted achievements in stepTick.
  if (action.type === 'TICK') return result;
  return { ...result, state: grantAchievements(settleChallenge(withStats(state, result.state, bump))) };
}

function stepTickCore(state: TimelineState, quiet: boolean): TimelineState {
  const nextTick = state.tick + 1;
  const nextSeason = SEASONS[nextTick % 4];
  const nextYear = 1 + Math.floor(nextTick / 4);
  const nextFurthestYear = Math.max(state.furthestYear, nextYear);

  const newLogs: LogEntry[] = [];

  // New year notification
  // Only every fifth year is noted, so milestones are not pushed out of the Chronicle.
  if (nextTick % 4 === 0 && nextYear % 5 === 0) {
    newLogs.push(
      createLog(nextTick, nextYear, yearOpening(timelineSeed(state.seed, state.timelinesCreated), nextTick, nextYear), 'info')
    );
  }

  // Calculate net production rates
  const rates = calculateNetRates(state);

  let nextFood = Math.max(0, Math.min(state.caps.food, state.resources.food + rates.food));
  let nextMaterials = Math.max(
    0,
    Math.min(state.caps.materials, state.resources.materials + rates.materials)
  );
  let nextKnowledge = Math.max(
    0,
    Math.min(state.caps.knowledge, state.resources.knowledge + rates.knowledge)
  );

  let nextStability = Math.max(0, Math.min(100, state.resources.stability + rates.stability));

  // Events are decisions, never free gifts: a tale waits on the Events page; an urgent event stops the timeline.
  let pendingChoice = state.pendingChoice;
  let waitingEvents = state.waitingEvents;
  const event = rollEvent(state, nextTick, {
    urgent: !quiet && !pendingChoice,
    tales: waitingEvents.length < MAX_WAITING_TALES,
    exclude: waitingEvents.map((w) => w.eventId),
  });
  if (event?.kind === 'urgent') pendingChoice = { eventId: event.id, tick: nextTick };
  if (event?.kind === 'tale') waitingEvents = [...waitingEvents, { eventId: event.id, tick: nextTick }];

  let currentTotalPop = state.population.total;
  let currentUnassigned = state.population.roles.unassigned;

  // Population growth condition
  // Pop grows (at no cost) when food >= 10, stability >= 60, and pop total < pop max, every other tick
  if (
    nextFood >= 10 &&
    nextStability >= 60 &&
    currentTotalPop < state.population.max &&
    nextTick % 2 === 0
  ) {
    currentTotalPop += 1;
    currentUnassigned += 1;
    newLogs.push(
      createLog(
        nextTick,
        nextYear,
        `${personName(timelineSeed(state.seed, state.timelinesCreated), currentTotalPop - 1)}, drawn by your warm fire, joins your band.`,
        'info'
      )
    );
  }

  const relics = state.relics;
  if (event?.kind === 'urgent') {
    newLogs.push(createLog(nextTick, nextYear, `${event.title}: ${event.text} The timeline waits for your answer.`, 'milestone'));
  }

  // Limit logs to last 50 entries
  const combinedLogs = newLogs.length > 0 ? [...newLogs, ...state.logs].slice(0, 50) : state.logs;

  const advanced: TimelineState = {
    ...state,
    tick: nextTick,
    year: nextYear,
    season: nextSeason,
    furthestYear: nextFurthestYear,
    relics,
    pendingChoice,
    waitingEvents,
     // Kept at zero for save compatibility; manual actions are intentionally immediate.
     actionCooldown: 0,
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

  return runAutomation(advanced);
}

const AUTO_ROLES: RoleId[] = ['forager', 'builder', 'scholar'];

function autoAssign(state: TimelineState): TimelineState {
  const level = rungLevel(state.rung);
  const barred = (state.challenge && getChallenge(state.challenge)?.noRoles) || [];
  const open = AUTO_ROLES.filter((r) => level >= rungLevel(ROLE_MIN_RUNG[r]) && !barred.includes(r));
  let jobs = Math.min(state.population.roles.unassigned, openJobs(state.population));
  if (jobs <= 0 || open.length === 0) return state;
  const roles = { ...state.population.roles };
  while (jobs > 0) {
    const target = open.reduce((a, b) => (roles[b] < roles[a] ? b : a));
    roles[target] += 1;
    roles.unassigned -= 1;
    jobs -= 1;
  }
  return { ...state, population: { ...state.population, roles } };
}

function runAutomation(input: TimelineState): TimelineState {
  let current = input;

  if (hasFeature(current, 'ancestral_hands') && current.automation.assign) {
    current = autoAssign(current);
  }

  if (hasFeature(current, 'rising_tide') && current.automation.advance) {
    const nextRung = RUNG_ORDER[rungLevel(current.rung) + 1];
    if (nextRung && checkRungPrerequisites(current, nextRung).eligible) {
      const result = executeActionCore(current, { type: 'ADVANCE_RUNG', rungId: nextRung });
      if (result.success) current = result.state;
    }
  }

  // Automation never spends below what the next rung asks for, or progress could stall unseen.
  const next = RUNG_ORDER[rungLevel(current.rung) + 1];
  const need = next ? RUNGS[next].prerequisites : undefined;
  const reserve = {
    food: need?.food ?? 0,
    materials: need?.materials ?? 0,
    knowledge: need?.knowledge ?? 0,
  };

  if (hasFeature(current, 'apprentice_scholars') && current.automation.research) {
    const options = DISCOVERIES.filter(
      (d) =>
        !current.discoveries.includes(d.id) &&
        rungLevel(current.rung) >= rungLevel(d.minRung) &&
        legacyMet(current, d) &&
        current.resources.knowledge - discoveryCost(current, d.cost) >= reserve.knowledge
    ).sort((a, b) => a.cost - b.cost);
    if (options[0]) {
      const result = executeActionCore(current, { type: 'RESEARCH', discoveryId: options[0].id });
      if (result.success) current = withStats(current, result.state, { researched: 1 });
    }
  }

  const stewardBuilds = hasFeature(current, 'twin_stewards') ? 2 : 1;
  for (let n = 0; n < stewardBuilds; n++) {
    if (!(hasFeature(current, 'steward') && current.automation.build)) break;
    const required = need?.buildings ?? {};
    const isRequired = (id: BuildingId): boolean => current.buildings[id] < (required[id] ?? 0);
    let best: BuildingId | null = null;
    let bestScore = Infinity;
    for (const id of BUILDING_IDS) {
      if (rungLevel(current.rung) < rungLevel(BUILDINGS[id].unlockedAt)) continue;
      if (current.buildings[id] >= (BUILDINGS[id].maxCount ?? Infinity)) continue;
      if ((current.challenge && getChallenge(current.challenge)?.noBuildings)?.includes(id)) continue;
      const cost = getBuildingCost(id, current.buildings[id]);
      const affordable =
        current.resources.materials >= cost.materials &&
        current.resources.food >= cost.food &&
        current.resources.knowledge >= cost.knowledge;
      if (!affordable) continue;
      // Buildings the next rung requires come first and may dip into the reserve; the rest must not.
      const required1 = isRequired(id);
      if (
        !required1 &&
        (current.resources.materials - cost.materials < reserve.materials ||
          current.resources.food - cost.food < reserve.food ||
          current.resources.knowledge - cost.knowledge < reserve.knowledge)
      ) {
        continue;
      }
      const score = (required1 ? 0 : 1e6) + cost.materials + cost.food + cost.knowledge;
      if (score < bestScore) {
        best = id;
        bestScore = score;
      }
    }
    if (best) {
      const result = executeActionCore(current, { type: 'BUILD', buildingId: best });
      if (result.success) current = withStats(current, result.state, { built: 1 });
    }
  }

  return current;
}

function executeActionCore(
  state: TimelineState,
  action: EngineAction
): EngineResult {
  switch (action.type) {
    case 'TICK': {
      const nextState = stepTick(state);
      return { success: true, state: nextState, events: ['Ticked'] };
    }

    case 'FORAGE': {
      // Pure food yield, scaled by season (winter is harsher)
      const isWinter = state.season === 'Winter';
      const foodGain = Number(((isWinter ? 1.8 : 3.0) * manualMultiplier(state)).toFixed(2));

      const newFood = Math.min(state.caps.food, state.resources.food + foodGain);

      const log = createLog(
        state.tick,
        state.year,
        `Foraged wild roots and game (+${foodGain} Food).`
      );

      const nextState: TimelineState = {
        ...state,
        resources: {
          ...state.resources,
          food: Number(newFood.toFixed(2)),
        },
         actionCooldown: 0,
         logs: [log, ...state.logs].slice(0, 50),
      };

      return {
        success: true,
        state: nextState,
        events: [`Foraged +${foodGain} Food`],
      };
    }

    case 'SCAVENGE': {
      // Scavenge yields materials: flint, dry boughs, river stones
      const materialsGain = Number((1.5 * manualMultiplier(state)).toFixed(2));

      const newMaterials = Math.min(
        state.caps.materials,
        state.resources.materials + materialsGain
      );

      const log = createLog(
        state.tick,
        state.year,
        `Scavenged flint, dry boughs, and river stones (+${materialsGain} Materials).`
      );

      const nextState: TimelineState = {
        ...state,
        resources: {
          ...state.resources,
          materials: Number(newMaterials.toFixed(2)),
        },
         actionCooldown: 0,
         logs: [log, ...state.logs].slice(0, 50),
      };

      return {
        success: true,
        state: nextState,
        events: [`Scavenged +${materialsGain} Materials`],
      };
    }

    case 'STUDY': {
      // Manual contemplation/ponder yields knowledge and a small stability grounding
      const knowledgeGain = Number((1.5 * manualMultiplier(state)).toFixed(2));
      const newKnowledge = Math.min(
        state.caps.knowledge,
        state.resources.knowledge + knowledgeGain
      );
      const newStability = Math.min(100, state.resources.stability + 0.5);

      const log = createLog(
        state.tick,
        state.year,
        `Pondered the embers and night sky (+${knowledgeGain} Knowledge).`
      );

      const nextState: TimelineState = {
        ...state,
        resources: {
          ...state.resources,
          knowledge: Number(newKnowledge.toFixed(2)),
          stability: Number(newStability.toFixed(2)),
        },
         actionCooldown: 0,
         logs: [log, ...state.logs].slice(0, 50),
      };

      return {
        success: true,
        state: nextState,
        events: [`Pondered +${knowledgeGain} Knowledge`],
      };
    }

    case 'ASSIGN_ROLE': {
      const { role, delta } = action;
      if (!Number.isInteger(delta) || delta === 0) {
        return { success: false, state, error: 'Choose a whole number of people to move.', events: [] };
      }

      const activeChallenge = state.challenge ? getChallenge(state.challenge) : undefined;
      if (delta > 0 && activeChallenge?.noRoles?.includes(role)) {
        return {
          success: false,
          state,
          error: `${activeChallenge.name}: nobody may be a ${role} during this challenge.`,
          events: [],
        };
      }

      // Roles unlock at fixed rungs (single source: ROLE_MIN_RUNG).
      if (rungLevel(state.rung) < rungLevel(ROLE_MIN_RUNG[role])) {
        return {
          success: false,
          state,
          error: `You must reach the ${RUNGS[ROLE_MIN_RUNG[role]].name} rung to assign ${role}s.`,
          events: [],
        };
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
        const jobs = openJobs(state.population);
        if (delta > jobs) {
          return {
            success: false,
            state,
            error: `Only half of your people can work: ${jobs === 0 ? 'every job is taken' : `${jobs} job${jobs > 1 ? 's' : ''} open`}. More people (build Huts) means more jobs.`,
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
        `${delta > 0 ? 'Assigned' : 'Unassigned'} ${Math.abs(delta)} ${role}.`
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
      if (rungLevel(state.rung) < rungLevel(def.unlockedAt)) {
        return {
          success: false,
          state,
          error: `${def.name} requires reaching ${RUNGS[def.unlockedAt].name}.`,
          events: [],
        };
      }

      const buildChallenge = state.challenge ? getChallenge(state.challenge) : undefined;
      if (buildChallenge?.noBuildings?.includes(buildingId)) {
        return {
          success: false,
          state,
          error: `${buildChallenge.name}: ${def.name} cannot be built during this challenge.`,
          events: [],
        };
      }

      const currentCount = state.buildings[buildingId] || 0;
      if (def.maxCount !== undefined && currentCount >= def.maxCount) {
        return {
          success: false,
          state,
          error: `${def.name} is a wonder and can only be built once per timeline.`,
          events: [],
        };
      }
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

      const nextCaps = calculateCaps(nextBuildings, state.rung, state.discoveries, homePeople(state.features, state.relics));

      const log = createLog(
        state.tick,
        state.year,
        currentCount === 0 ? `Your first ${def.name} stands.` : `Constructed a ${def.name}.`,
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

      const nextCaps = calculateCaps(state.buildings, rungId, state.discoveries, homePeople(state.features, state.relics));
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
      const jumpCheck = checkTimeJump(state);
      if (!jumpCheck.eligible) {
        return {
          success: false,
          state,
          error: `Not yet: ${jumpCheck.reasons.join('; ')}.`,
          events: [],
        };
      }

      const gainedInsight = calculateTimeJumpInsight(state);
      const newFurthestYear = Math.max(state.furthestYear, state.year);
      const nextTimelinesCreated = state.timelinesCreated + 1;
      const totalInsight = state.insight + gainedInsight;

      const resetState = createInitialState({
        seed: state.seed,
        furthestYear: newFurthestYear,
        timelinesCreated: nextTimelinesCreated,
        insight: totalInsight,
        echoes: state.echoes,
        resonance: state.resonance,
        eternity: state.eternity,
        ...carryFeatures(state, 1),
        edicts: state.edicts,
        relics: state.relics,
        history: recordHistory(state, 1, `+${gainedInsight} Insight`),
      });

      const jumpLog = createLog(
        0,
        1,
        `Timeline collapsed at Year ${state.year}. Gained +${gainedInsight} Insight (Total: ${totalInsight}). Furthest Year: ${newFurthestYear}.`,
        'prestige'
      );

      resetState.pendingBoon = boonOptions(
        { features: resetState.features, seed: state.seed, timelinesCreated: state.timelinesCreated },
        nextTimelinesCreated
      );

      resetState.logs = [
        jumpLog,
        ...closureLogs(state, true),
        ...unlockLogs(state, 1),
        ...resetState.logs,
      ];

      return {
        success: true,
        state: resetState,
        events: [`Jumpback completed: +${gainedInsight} Insight`],
      };
    }

    case 'PRESTIGE': {
      const def = PRESTIGE_TIERS[action.tier];
      if (!def) {
        return { success: false, state, error: 'Unknown prestige tier.', events: [] };
      }
      const check = checkPrestigeTier(state, action.tier);
      if (!check.eligible) {
        return {
          success: false,
          state,
          error: `Cannot begin ${def.name}: ${check.reasons.join(', ')}`,
          events: [],
        };
      }

      const gain = calculatePrestigeGain(state, action.tier);
      const carried = {
        echoes: state.echoes,
        resonance: state.resonance,
        eternity: state.eternity,
        insight: state.insight,
      };
      // Each tier resets everything below itself and banks its own currency.
      if (action.tier === 2) {
        carried.insight = 0;
        carried.echoes += gain;
      } else if (action.tier === 3) {
        carried.insight = 0;
        carried.echoes = 0;
        carried.resonance += gain;
      } else {
        carried.insight = 0;
        carried.echoes = 0;
        carried.resonance = 0;
        carried.eternity += gain;
      }

      const newFurthestYear = Math.max(state.furthestYear, state.year);
      const resetState = createInitialState({
        seed: state.seed,
        furthestYear: newFurthestYear,
        timelinesCreated: state.timelinesCreated + 1,
        ...carried,
        ...carryFeatures(state, action.tier),
        pendingBoon: state.pendingBoon,
        edicts: state.edicts,
        relics: state.relics,
        history: recordHistory(state, action.tier, `+${gain} ${def.currencyName}`),
      });
      resetState.logs = [
        createLog(
          0,
          1,
          `${def.name} at Year ${state.year}. Gained +${gain} ${def.currencyName}. Furthest Year: ${newFurthestYear}.`,
          'prestige'
        ),
        ...closureLogs(state, true),
        ...unlockLogs(state, action.tier),
        ...resetState.logs,
      ];

      return {
        success: true,
        state: resetState,
        events: [`${def.name} completed: +${gain} ${def.currencyName}`],
      };
    }

    case 'SET_EDICT': {
      if (!RUNG_ORDER.includes(action.slot) || action.slot === 'hearth') {
        return { success: false, state, error: 'That is not an edict slot.', events: [] };
      }
      if (action.edictId === null) {
        const { [action.slot]: _removed, ...rest } = state.edicts;
        return { success: true, state: { ...state, edicts: rest }, events: ['Edict cleared'] };
      }
      const def = getEdict(action.edictId);
      if (!def || def.slot !== action.slot) {
        return { success: false, state, error: 'That edict is not available in this slot.', events: [] };
      }
      if (rungLevel(state.rung) < rungLevel(action.slot)) {
        return {
          success: false,
          state,
          error: `This slot opens at ${RUNGS[action.slot].name}.`,
          events: [],
        };
      }
      return {
        success: true,
        state: {
          ...state,
          edicts: { ...state.edicts, [action.slot]: def.id },
          logs: [
            createLog(state.tick, state.year, `${def.icon} Decreed ${def.name}. ${def.description}`),
            ...state.logs,
          ].slice(0, 50),
        },
        events: [`Decreed ${def.name}`],
      };
    }

    case 'BARTER': {
      const marketRung = marketRungFor(state);
      if (rungLevel(state.rung) < rungLevel(marketRung)) {
        return {
          success: false,
          state,
          error: `The marketplace opens at ${RUNGS[marketRung].name}.`,
          events: [],
        };
      }
      const ratio = barterRatio(state.buildings, action.from, action.to);
      if (ratio === null) {
        return { success: false, state, error: 'Those two stores cannot be traded.', events: [] };
      }
      const wanted = Math.floor(action.amount);
      if (!(wanted > 0) || state.resources[action.from] < wanted) {
        return {
          success: false,
          state,
          error: `Not enough ${action.from} to trade ${Math.max(0, wanted)}.`,
          events: [],
        };
      }
      // Never spend more than the destination can hold: nothing is traded into waste.
      const room = Math.floor(state.caps[action.to] - state.resources[action.to]);
      // Whole units only, so the preview and the result always agree.
      const gain = Math.min(Math.floor(wanted / ratio), room);
      if (gain < 1) {
        return {
          success: false,
          state,
          error: `Your ${action.to} stores have no room for that trade.`,
          events: [],
        };
      }
      const spent = Math.min(wanted, Math.ceil(gain * ratio));
      return {
        success: true,
        state: {
          ...state,
          resources: {
            ...state.resources,
            [action.from]: Number((state.resources[action.from] - spent).toFixed(2)),
            [action.to]: Number((state.resources[action.to] + gain).toFixed(2)),
          },
          logs: [
            createLog(
              state.tick,
              state.year,
              `Traded ${spent} ${action.from} for ${gain} ${action.to}.`
            ),
            ...state.logs,
          ].slice(0, 50),
        },
        events: [`Traded ${spent} ${action.from} for ${gain} ${action.to}`],
      };
    }

    case 'RESOLVE_CHOICE': {
      const def = state.pendingChoice ? getEvent(state.pendingChoice.eventId) : undefined;
      const choice = def?.choices[action.index];
      if (!def || !choice) {
        return { success: false, state, error: 'There is no decision to make.', events: [] };
      }
      return {
        success: true,
        state: { ...applyEventChoice(state, def, choice), pendingChoice: null },
        events: [`Chose ${choice.label}`],
      };
    }

    case 'RESOLVE_TALE': {
      const waiting = state.waitingEvents.find((w) => w.eventId === action.eventId);
      const def = waiting ? getEvent(waiting.eventId) : undefined;
      const choice = def?.choices[action.index];
      if (!waiting || !def || !choice) {
        return { success: false, state, error: 'That tale is not waiting.', events: [] };
      }
      return {
        success: true,
        state: {
          ...applyEventChoice(state, def, choice),
          waitingEvents: state.waitingEvents.filter((w) => w.eventId !== action.eventId),
        },
        events: [`Chose ${choice.label}`],
      };
    }

    case 'CHOOSE_BOON': {
      const id = action.featureId;
      if (!state.pendingBoon || !state.pendingBoon.includes(id) || !FEATURES[id]?.boon) {
        return { success: false, state, error: 'That boon is not on offer.', events: [] };
      }
      const buildings = { ...state.buildings };
      let discoveries = state.discoveries;
      const resources = { ...state.resources };
      const roles = { ...state.population.roles };
      let total = state.population.total;
      // The boon helps the timeline already under way, not only the ones that follow.
      if (id === 'grand_foundations') {
        buildings.chronicle_stone = Math.max(1, buildings.chronicle_stone);
        buildings.fire_pit = Math.max(1, buildings.fire_pit);
      }
      if (id === 'lore_keepers') discoveries = [...new Set([...discoveries, ...LORE_KEEPER_DISCOVERIES])];
      const nextCaps = calculateCaps(buildings, state.rung, discoveries, homePeople([...state.features, id], state.relics));
      if (id === 'packed_provisions') {
        resources.food = Math.min(nextCaps.food, resources.food + PACKED_PROVISIONS.food);
        resources.materials = Math.min(nextCaps.materials, resources.materials + PACKED_PROVISIONS.materials);
        resources.knowledge = Math.min(nextCaps.knowledge, resources.knowledge + PACKED_PROVISIONS.knowledge);
      }
      if (id === 'founders' && total < nextCaps.population) {
        total += 1;
        roles.unassigned += 1;
      }
      const def = FEATURES[id];
      return {
        success: true,
        state: {
          ...state,
          features: [...state.features, id],
          pendingBoon: null,
          buildings,
          discoveries,
          resources,
          caps: { food: nextCaps.food, materials: nextCaps.materials, knowledge: nextCaps.knowledge },
          population: { ...state.population, total, max: nextCaps.population, roles },
          logs: [createLog(state.tick, state.year, `${def.icon} Boon chosen: ${def.name}. ${def.description}`, 'milestone'), ...state.logs].slice(0, 50),
        },
        events: [`Chose ${def.name}`],
      };
    }

    case 'START_CHALLENGE': {
      const def = getChallenge(action.challengeId);
      if (!def) return { success: false, state, error: 'Unknown challenge.', events: [] };
      if (state.prestigeCounts[1] < 1) {
        return { success: false, state, error: 'Challenges open after your first Jumpback.', events: [] };
      }
      if (state.challenge) {
        return { success: false, state, error: 'Finish or abandon the current challenge first.', events: [] };
      }
      if (state.relics.includes(def.reward)) {
        return { success: false, state, error: `${def.name} is already complete.`, events: [] };
      }
      if (rungLevel(getStartingRung(state)) >= rungLevel(def.goalRung)) {
        return {
          success: false,
          state,
          error: `Your head start already begins at or past ${RUNGS[def.goalRung].name}, so this challenge would be free.`,
          events: [],
        };
      }
      const startCheck = checkTimeJump(state);
      if (!startCheck.eligible) {
        return {
          success: false,
          state,
          error: `Beginning a challenge ends this timeline like a Jumpback, so it must be ready first: ${startCheck.reasons.join('; ')}.`,
          events: [],
        };
      }
      // Ending the run this way is a Jumpback: it pays the same Insight and counts as one.
      const gainedInsight = calculateTimeJumpInsight(state);
      // A fresh timeline with every permanent bonus intact; nothing is gained or lost by starting.
      const fresh = createInitialState({
        seed: state.seed,
        furthestYear: Math.max(state.furthestYear, state.year),
        timelinesCreated: state.timelinesCreated + 1,
        insight: state.insight + gainedInsight,
        echoes: state.echoes,
        resonance: state.resonance,
        eternity: state.eternity,
        ...carryFeatures(state, 1),
        edicts: state.edicts,
        relics: state.relics,
        history: recordHistory(state, 1, `+${gainedInsight} Insight (challenge: ${def.name})`),
        challenge: def.id,
      });
      fresh.logs = [
        ...closureLogs(state, false),
        ...unlockLogs(state, 1),
        createLog(0, 1, `${def.icon} Challenge begun: ${def.name}. ${def.description}${gainedInsight > 0 ? ` The old timeline paid out +${gainedInsight} Insight.` : ''}`, 'prestige'),
        ...fresh.logs,
      ].slice(0, 50);
      return { success: true, state: fresh, events: [`Challenge begun: ${def.name}`] };
    }

    case 'ABANDON_CHALLENGE': {
      const def = state.challenge ? getChallenge(state.challenge) : undefined;
      if (!def) return { success: false, state, error: 'No challenge is active.', events: [] };
      return {
        success: true,
        state: {
          ...state,
          challenge: null,
          logs: [
            createLog(state.tick, state.year, `${def.icon} ${def.name} set aside. Nothing was lost.`),
            ...state.logs,
          ].slice(0, 50),
        },
        events: [`Abandoned ${def.name}`],
      };
    }

    case 'RESEARCH': {
      const def = getDiscovery(action.discoveryId);
      if (!def) {
        return { success: false, state, error: 'Unknown discovery.', events: [] };
      }
      if (state.discoveries.includes(def.id)) {
        return { success: false, state, error: `${def.name} is already researched.`, events: [] };
      }
      if (rungLevel(state.rung) < rungLevel(def.minRung)) {
        return {
          success: false,
          state,
          error: `${def.name} requires reaching ${RUNGS[def.minRung].name}.`,
          events: [],
        };
      }
      if (!legacyMet(state, def)) {
        return { success: false, state, error: `${def.name}: ${legacyNote(def)}.`, events: [] };
      }
      const cost = discoveryCost(state, def.cost);
      if (state.resources.knowledge < cost) {
        return {
          success: false,
          state,
          error: `Requires ${cost} Knowledge (have ${Math.floor(state.resources.knowledge)}).`,
          events: [],
        };
      }
      const discoveries = [...state.discoveries, def.id];
      const nextCaps = calculateCaps(state.buildings, state.rung, discoveries, homePeople(state.features, state.relics));
      return {
        success: true,
        state: {
          ...state,
          discoveries,
          resources: {
            ...state.resources,
            knowledge: Number((state.resources.knowledge - cost).toFixed(2)),
          },
          caps: { food: nextCaps.food, materials: nextCaps.materials, knowledge: nextCaps.knowledge },
          population: { ...state.population, max: nextCaps.population },
          logs: [
            createLog(state.tick, state.year, `${def.icon} Discovered ${def.name}. ${def.description}`, 'milestone'),
            ...state.logs,
          ].slice(0, 50),
        },
        events: [`Discovered ${def.name}`],
      };
    }

    case 'TOGGLE_AUTOMATION': {
      return {
        success: true,
        state: {
          ...state,
          automation: { ...state.automation, [action.key]: !state.automation[action.key] },
        },
        events: [`Toggled ${action.key} automation`],
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

    case 'DEV_SET_RUNG': {
      const nextCaps = calculateCaps(state.buildings, action.rung, state.discoveries, homePeople(state.features, state.relics));
      return {
        success: true,
        state: {
          ...state,
          rung: action.rung,
          caps: { food: nextCaps.food, materials: nextCaps.materials, knowledge: nextCaps.knowledge },
          resources: {
            ...state.resources,
            food: Math.min(state.resources.food, nextCaps.food),
            materials: Math.min(state.resources.materials, nextCaps.materials),
            knowledge: Math.min(state.resources.knowledge, nextCaps.knowledge),
          },
          population: { ...state.population, max: nextCaps.population },
          logs: [
            createLog(state.tick, state.year, `[DEV MODE] Warped to ${RUNGS[action.rung].name}.`),
            ...state.logs,
          ].slice(0, 50),
        },
        events: [`[Dev] Warped to ${RUNGS[action.rung].name}`],
      };
    }

    case 'DEV_ADD_INSIGHT': {
      return {
        success: true,
        state: { ...state, insight: state.insight + Math.max(0, action.amount) },
        events: [`[Dev] Added ${action.amount} Insight`],
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

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/**
 * Makes any loaded or imported save safe to play: fills fields added after the
 * save was written, drops wrongly typed values, and recomputes derived storage.
 */
export function normalizeState(saved: TimelineState): TimelineState {
  const old: Partial<TimelineState> = saved;
  const defaults = createInitialState();
  const buildings = { ...createEmptyBuildings() };
  for (const id of BUILDING_IDS) {
    const count = Math.floor(asNumber(old.buildings?.[id]));
    buildings[id] = Math.min(count, BUILDINGS[id].maxCount ?? count);
  }
  const discoveries = asStringArray(old.discoveries).filter((id) => getDiscovery(id));
  const rung = RUNG_ORDER.includes(saved.rung) ? saved.rung : 'hearth';
  const edicts: Record<string, string> = {};
  if (old.edicts && typeof old.edicts === 'object') {
    for (const [slot, id] of Object.entries(old.edicts)) {
      if (typeof id === 'string' && getEdict(id)?.slot === slot) edicts[slot] = id;
    }
  }
  const counts: Partial<TimelineState['prestigeCounts']> = old.prestigeCounts ?? {};
  const prestigeCounts = {
    1: asNumber(counts[1], asNumber(old.timelinesCreated)),
    2: asNumber(counts[2]),
    3: asNumber(counts[3]),
    4: asNumber(counts[4]),
  };
  const features = [
    ...new Set([
      ...asStringArray(old.features).filter((id): id is FeatureId => Object.hasOwn(FEATURES, id)),
      ...FEATURE_IDS.filter((id) => {
        const at = FEATURES[id].onCount;
        return at !== undefined && prestigeCounts[FEATURES[id].tier] >= at;
      }),
    ]),
  ];
  const caps = calculateCaps(buildings, rung, discoveries, homePeople(features, asStringArray(old.relics)));
  const rawRoles: Partial<TimelineState['population']['roles']> = old.population?.roles ?? {};
  const roles = {
    unassigned: Math.floor(asNumber(rawRoles.unassigned)),
    forager: Math.floor(asNumber(rawRoles.forager)),
    scholar: Math.floor(asNumber(rawRoles.scholar)),
    healer: Math.floor(asNumber(rawRoles.healer)),
    builder: Math.floor(asNumber(rawRoles.builder)),
  };
  const sumRoles = (): number => Object.values(roles).reduce((a, b) => a + b, 0);
  if (sumRoles() < 1) roles.unassigned = 1;
  // An edited save cannot hold more people than the cap allows; trim from the idle end first.
  let excess = sumRoles() - Math.max(1, caps.population);
  for (const key of ['unassigned', 'builder', 'scholar', 'forager', 'healer'] as const) {
    const take = Math.min(roles[key], Math.max(0, excess));
    roles[key] -= take;
    excess -= take;
  }
  const tick = Math.floor(asNumber(old.tick));
  const rawRes: Partial<TimelineState['resources']> = old.resources ?? {};
  const season = (SEASONS as readonly string[]).includes(saved.season) ? saved.season : SEASONS[tick % 4];
  return {
    ...saved,
    rulesetVersion: defaults.rulesetVersion,
    tick,
    year: 1 + Math.floor(tick / 4),
    season,
    furthestYear: Math.max(1, Math.floor(asNumber(old.furthestYear, 1)), 1 + Math.floor(tick / 4)),
    timelinesCreated: Math.floor(asNumber(old.timelinesCreated)),
    insight: Math.floor(asNumber(old.insight)),
    resources: {
      food: Math.min(caps.food, asNumber(rawRes.food)),
      materials: Math.min(caps.materials, asNumber(rawRes.materials)),
      knowledge: Math.min(caps.knowledge, asNumber(rawRes.knowledge)),
      stability: Math.min(100, asNumber(rawRes.stability, 75)),
    },
    rung,
    echoes: asNumber(old.echoes),
    resonance: asNumber(old.resonance),
    eternity: asNumber(old.eternity),
    buildings,
    features,
    achievements: asStringArray(old.achievements),
    history: (Array.isArray(old.history) ? old.history : [])
      .filter(
        (h): h is HistoryEntry =>
          !!h &&
          [1, 2, 3, 4].includes(h.tier) &&
          RUNG_ORDER.includes(h.rung) &&
          typeof h.year === 'number' &&
          typeof h.number === 'number' &&
          typeof h.gained === 'string'
      )
      .slice(0, 12),
    logs: (Array.isArray(old.logs) ? old.logs : [])
      .filter((l) => !!l && typeof l.text === 'string' && typeof l.id === 'string')
      .slice(0, 50),
    relics: asStringArray(old.relics).filter((id) => getRelic(id)),
    stats: {
      ticks: Math.floor(asNumber(old.stats?.ticks, asNumber(old.tick))),
      gathers: Math.floor(asNumber(old.stats?.gathers)),
      built: Math.floor(asNumber(old.stats?.built)),
      researched: Math.floor(asNumber(old.stats?.researched)),
      traded: Math.floor(asNumber(old.stats?.traded)),
      events: Math.floor(asNumber(old.stats?.events)),
    },
    // A completed challenge (trophy already owned) does not linger.
    challenge:
      old.challenge &&
      getChallenge(old.challenge) &&
      !asStringArray(old.relics).includes(getChallenge(old.challenge)!.reward)
        ? old.challenge
        : null,
    pendingBoon: (() => {
      const offered = asStringArray(old.pendingBoon).filter(
        (id): id is FeatureId => Object.hasOwn(FEATURES, id) && Boolean(FEATURES[id as FeatureId].boon) && !features.includes(id as FeatureId)
      );
      return offered.length > 0 ? offered : null;
    })(),
    pendingChoice:
      old.pendingChoice && EVENTS.some((e) => e.id === old.pendingChoice?.eventId && e.kind === 'urgent')
        ? { eventId: old.pendingChoice.eventId, tick: asNumber(old.pendingChoice.tick) }
        : null,
    waitingEvents: (Array.isArray(old.waitingEvents) ? old.waitingEvents : [])
      .filter((w, i, all) => !!w && EVENTS.some((e) => e.id === w.eventId && e.kind === 'tale') && all.findIndex((x) => x?.eventId === w.eventId) === i)
      .slice(0, MAX_WAITING_TALES)
      .map((w) => ({ eventId: w.eventId, tick: asNumber(w.tick) })),
    discoveries,
    edicts,
    automation: {
      assign: old.automation?.assign !== false,
      advance: old.automation?.advance !== false,
      build: old.automation?.build !== false,
      research: old.automation?.research !== false,
    },
    prestigeCounts,
    caps: { food: caps.food, materials: caps.materials, knowledge: caps.knowledge },
    population: { total: Math.max(1, Object.values(roles).reduce((a, b) => a + b, 0)), max: caps.population, roles },
  };
}

export const MAX_AWAY_TICKS = 8 * 60 * 60;
export const SECOND_WIND_AWAY_TICKS = 24 * 60 * 60;

export function awayCapTicks(state: Pick<TimelineState, 'features' | 'relics'>): number {
  const base = hasFeature(state, 'second_wind') ? SECOND_WIND_AWAY_TICKS : MAX_AWAY_TICKS;
  return base + Math.round(relicBonus(state.relics, 'awayHours') * 3600);
}

export interface AwaySummary {
  ticks: number;
  years: number;
  food: number;
  materials: number;
  knowledge: number;
  population: number;
  rungChanged: boolean;
}

/** Adds one entry to the Chronicle (newest first, capped). */
export function appendLog(state: TimelineState, text: string, type: LogEntry['type'] = 'info'): TimelineState {
  return { ...state, logs: [createLog(state.tick, state.year, text, type), ...state.logs].slice(0, 50) };
}

export function summarizeAway(before: TimelineState, after: TimelineState, ticks: number): AwaySummary {
  return {
    ticks,
    years: after.year - before.year,
    food: Number((after.resources.food - before.resources.food).toFixed(1)),
    materials: Number((after.resources.materials - before.resources.materials).toFixed(1)),
    knowledge: Number((after.resources.knowledge - before.resources.knowledge).toFixed(1)),
    population: after.population.total - before.population.total,
    rungChanged: after.rung !== before.rung,
  };
}

/**
 * Advances the timeline while the player is away. Nothing can be lost
 * (see the "Number only goes up" pillar), so absence is always safe.
 */
export function fastForward(
  state: TimelineState,
  requestedTicks: number
): { state: TimelineState; summary: AwaySummary } {
  const ticks = Math.max(0, Math.min(awayCapTicks(state), Math.floor(requestedTicks)));
  let next = state;
  for (let i = 0; i < ticks; i++) next = stepTick(next, { quiet: true });
  return { state: next, summary: summarizeAway(state, next, ticks) };
}
