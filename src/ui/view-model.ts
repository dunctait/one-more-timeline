import { ACHIEVEMENTS } from '../engine/achievements.js';
import { DISCOVERIES, legacyMet, legacyNote } from '../engine/discoveries.js';
import { CHALLENGES, getChallenge } from '../engine/challenges.js';
import { edictsForSlot } from '../engine/edicts.js';
import { EVENTS } from '../engine/events.js';
import { timelineSeed } from '../engine/events.js';
import { personName } from '../engine/people.js';
import { RELICS } from '../engine/relics.js';
import { manualMultiplier } from '../engine/engine.js';
import {
  describeBuildingGain,
  insightStartBonus,
  explainProduction,
  barterRatio,
  BARTER_BASE_RATIOS,
  BUILDINGS,
  marketRungFor,
  discoveryCost,
  calculateNetRates,
  RENOWN_PER_ACHIEVEMENT,
  calculatePrestigeGain,
  calculateTimeJumpInsight,
  checkPrestigeTier,
  checkTimeJump,
  isPrestigeTierRevealed,
  checkRungPrerequisites,
  FEATURES,
  FEATURE_IDS,
  featuresEarned,
  FeatureDef,
  getBuildingCost,
  getProductionMultiplier,
  getStartingRung,
  hasFeature,
  PRESTIGE_TIERS,
  PRESTIGE_TIER_ORDER,
  RUNGS,
  ROLE_MIN_RUNG,
  RUNG_ORDER,
  rungLevel,
  SEASON_PROFILES,
  WONDER_IDS,
} from '../engine/rules.js';
import {
  AutomationKey,
  BuildingId,
  FeatureId,
  LogEntry,
  PrestigeTier,
  RoleId,
  TradeableResource,
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
  affordable: boolean;
  /** A wonder that already stands. */
  maxed: boolean;
  /** Wonders live on their own page. */
  wonder: boolean;
  /** What one more would add, with the player's real multipliers applied. */
  gains: string[];
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

export interface TimeJumpCalculationItem {
  name: string;
  value: number;
  description: string;
}

export interface TimeJumpBenefitsBreakdown {
  whatIsInsight: string;
  currentMultiplier: string;
  projectedGain: string;
  startingBonus: string;
  currentProductionBonusPercent: number;
  projectedProductionBonusPercent: number;
  currentStartingFood: number;
  currentStartingMaterials: number;
  nextStartingFood: number;
  nextStartingMaterials: number;
  formulaExplanation: string;
  calculationDetails: TimeJumpCalculationItem[];
}

export interface TimeJumpViewModel {
  eligible: boolean;
  projectedInsight: number;
  description: string;
  currentInsight: number;
  currentMultiplier: string;
  projectedGain: string;
  startingBonus: string;
  breakdown: TimeJumpBenefitsBreakdown;
  benefits: TimeJumpBenefitsBreakdown;
  confirmationText: string;
  sendsBack: SendsBackViewModel[];
}

export interface SendsBackViewModel {
  id: FeatureId;
  name: string;
  icon: string;
  description: string;
}

export interface FeatureViewModel extends SendsBackViewModel {
  automation: AutomationKey | null;
  enabled: boolean;
}

export interface DisclosureViewModel {
  timeJump: boolean;
  legacy: boolean;
  challenges: boolean;
  market: boolean;
  edicts: boolean;
  discoveries: boolean;
  relics: boolean;
  deeper: boolean;
  wonders: boolean;
}

export interface PrestigeTierViewModel {
  tier: PrestigeTier;
  /** Progressive disclosure: false until the player first comes across this tier. */
  revealed: boolean;
  name: string;
  icon: string;
  actionLabel: string;
  currencyName: string;
  balance: number;
  eligible: boolean;
  reasons: string[];
  items: RungPrerequisiteItem[];
  /** Null when the player cannot yet see it (not eligible and no Temporal Foresight). */
  projectedGain: number | null;
  whatItDoes: string;
  nextRun: string;
  howEarned: string;
  resets: string;
  lore: string;
  sendsBack: SendsBackViewModel[];
  confirmationText: string;
}

export interface EdictSlotViewModel {
  slot: RungId;
  slotName: string;
  chosenId: string | null;
  options: Array<{ id: string; name: string; icon: string; description: string; chosen: boolean }>;
}

export interface HistoryRowViewModel {
  label: string;
  detail: string;
}

export interface GoalViewModel {
  title: string;
  steps: string[];
  /** Tab where the player can act on the goal. */
  tab: 'hearth' | 'settlement' | 'evolution';
  /** Sub-page of that tab where the goal can be acted on. */
  sub: string;
  ready: boolean;
}

export interface DiscoveryViewModel {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
  unlocked: boolean;
  unlockPrereq: string;
  researched: boolean;
  canAfford: boolean;
}

export interface AchievementViewModel {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  progressText: string;
}

export interface TabBadgesViewModel {
  hearth: boolean;
  settlement: boolean;
  evolution: boolean;
  chronicle: boolean;
  hearthCount: number;
  settlementCount: number;
  /** Which sub-page of each tab holds the waiting work, keyed `tab.sub`. */
  subs: Record<string, boolean>;
}

export interface TimelineViewModel {
  header: {
    timelineId: string;
    year: number;
    season: string;
    seasonClass: string;
    seasonNote: string;
    rungName: string;
    furthestYear: number;
    timelinesCreated: number;
    insight: number;
    echoes: number;
    resonance: number;
    eternity: number;
    totalMultiplier: string;
  };
  resources: {
    food: {
      current: number;
      max: number;
      rate: number;
      rateFormatted: string;
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
    unallocated: number;
    roles: RoleViewModel[];
  };
  actions: {
    canForage: boolean;
    canScavenge: boolean;
    canStudy: boolean;
    actionPacing: string;
    forageYield: number;
    pacing: string;
  };
  buildings: BuildingViewModel[];
  rungProgression: RungProgressionViewModel;
  timeJump: TimeJumpViewModel;
  prestige: PrestigeTierViewModel[];
  seasons: Array<{ name: string; note: string; current: boolean }>;
  /** Progressive disclosure: later mechanics stay out of sight until the player first comes across them. */
  disclosure: DisclosureViewModel;
  features: FeatureViewModel[];
  nextFeatures: Array<{ icon: string; name: string; condition: string; description: string }>;
  goal: GoalViewModel;
  challenges: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    goal: string;
    reward: string;
    lockedNote: string;
    status: 'locked' | 'available' | 'active' | 'done';
  }>;
  decision: {
    title: string;
    text: string;
    options: Array<{ label: string; description: string }>;
  } | null;
  productionNotes: Array<{ label: string; value: string }>;
  market: {
    unlocked: boolean;
    unlockPrereq: string;
    rows: Array<{
      from: TradeableResource;
      to: TradeableResource;
      ratio: number;
      offers: Array<{ amount: number; gain: number; canTrade: boolean }>;
    }>;
  };
  people: Array<{ name: string; role: string }>;
  relics: { found: number; total: number; list: Array<{ name: string; icon: string; description: string; owned: boolean }> };
  records: Array<{ label: string; value: string }>;
  shareText: string;
  history: HistoryRowViewModel[];
  discoveries: DiscoveryViewModel[];
  edictSlots: EdictSlotViewModel[];
  achievements: {
    earned: number;
    total: number;
    renownPercent: number;
    list: AchievementViewModel[];
  };
  tabBadges: TabBadgesViewModel;
  logs: LogEntry[];
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

/** Compact numbers for tight spaces: 1,234 becomes 1.2K, 2,500,000 becomes 2.5M. */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const trim = (x: number): string => x.toFixed(1).replace(/\.0$/, '');
  if (abs < 1000) return `${Math.floor(n)}`;
  if (abs < 1_000_000) return `${trim(n / 1000)}K`;
  if (abs < 1_000_000_000) return `${trim(n / 1_000_000)}M`;
  return `${trim(n / 1_000_000_000)}B`;
}

/** A full store says so, instead of showing a rate that silently does nothing. */
export function formatRateAtCap(rate: number, current: number, cap: number): string {
  if (rate > 0 && current >= cap) return 'FULL';
  return formatRate(rate);
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
  return { label: 'Critical', statusClass: 'status-critical' };
}

/** Seconds of play at 1x speed, shown compactly. */
export function formatDuration(ticks: number): string {
  const s = Math.max(0, Math.ceil(ticks));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

/** A rough time to reach a requirement at current rates; null when it cannot be estimated. */
function estimateTicks(
  state: TimelineState,
  name: string,
  required: number,
  rates: { food: number; materials: number; knowledge: number }
): string | null {
  if (name === 'Year') return `about ${formatDuration(Math.max(0, (required - 1) * 4 - state.tick))}`;
  const key = name === 'Food' ? 'food' : name === 'Materials' ? 'materials' : name === 'Knowledge' ? 'knowledge' : null;
  if (!key) return null;
  const rate = rates[key];
  if (rate <= 0) return 'gather by hand or assign people';
  return `about ${formatDuration((required - state.resources[key]) / rate)}`;
}

function buildGoal(
  state: TimelineState,
  nextRung: RungProgressionViewModel['nextRung'],
  prestige: PrestigeTierViewModel[],
  firstJumpReady: boolean
): GoalViewModel {
  if (firstJumpReady) {
    return {
      title: 'Time Jump is ready',
      steps: ['Your timeline has grown enough to collapse into lasting Insight, and to send a function back. Open Evolution to read what it does.'],
      tab: 'evolution',
      sub: 'jump',
      ready: true,
    };
  }
  prestige = prestige.filter((p) => p.revealed);
  if (nextRung) {
    if (nextRung.eligible) {
      return {
        title: `${nextRung.name} is within reach`,
        steps: ['Every requirement is met. Open Evolution to advance.'],
        tab: 'evolution',
        sub: 'rung',
        ready: true,
      };
    }
    const rates = calculateNetRates(state);
    const steps = nextRung.items
      .filter((i) => !i.met)
      .map((i) => {
        const isBuilding = Object.values(BUILDINGS).some((b) => b.name === i.name);
        if (isBuilding) return `Build ${i.required - i.current} more ${i.name} (${i.current}/${i.required})`;
        const eta = estimateTicks(state, i.name, i.required, rates);
        return `${i.name}: ${i.current}/${i.required}${eta ? ` (${eta})` : ''}`;
      });
    const needsBuilding = nextRung.items.some(
      (i) => !i.met && Object.values(BUILDINGS).some((b) => b.name === i.name)
    );
    return {
      title: `Next: ${nextRung.name}`,
      steps,
      tab: needsBuilding ? 'settlement' : 'hearth',
      sub: needsBuilding ? 'works' : 'gather',
      ready: false,
    };
  }
  const ready = prestige.filter((p) => p.eligible).pop();
  if (ready) {
    return {
      title: `${ready.name} is ready`,
      steps: [`Earn ${ready.currencyName} in Evolution. ${ready.resets}`],
      tab: 'evolution',
      sub: 'deeper',
      ready: true,
    };
  }
  if (prestige.length === 0) {
    return {
      title: 'Your realm stands',
      steps: ['Keep building. Time Jumps are always on offer in Evolution.'],
      tab: 'evolution',
      sub: 'jump',
      ready: false,
    };
  }
  // The tier being worked toward: the lowest whose currency has not yet unlocked the next tier.
  const nearest =
    prestige.find((p, i) => {
      const next = prestige[i + 1];
      return next ? p.balance < PRESTIGE_TIERS[next.tier].requiresAmount : true;
    }) ?? prestige[prestige.length - 1];
  const missing = nearest.items.filter((i) => !i.met).map((i) => `${i.name}: ${i.current}/${i.required}`);
  return {
    title: `Your realm stands. Next: ${nearest.name}`,
    steps: missing.length ? missing.concat(['Time Jumps bank Insight.']) : ['Open Evolution.'],
    tab: 'evolution',
    sub: 'deeper',
    ready: false,
  };
}

function buildChallenges(state: TimelineState): TimelineViewModel['challenges'] {
  return CHALLENGES.map((c) => {
    const trophy = RELICS.find((r) => r.id === c.reward);
    const done = state.relics.includes(c.reward);
    const status = done
      ? 'done'
      : state.challenge === c.id
        ? 'active'
        : state.prestigeCounts[1] < 1 || rungLevel(getStartingRung(state)) >= rungLevel(c.goalRung)
          ? 'locked'
          : 'available';
    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      description: c.description,
      goal: `Reach ${RUNGS[c.goalRung].name}${c.maxYear ? ` before Year ${c.maxYear + 1}` : ''}`,
      lockedNote:
        state.prestigeCounts[1] < 1
          ? 'Opens after your first Time Jump'
          : 'Your head start already passes this goal',
      reward: `${trophy?.icon ?? ''} ${trophy?.name ?? c.reward}: ${trophy?.description ?? ''}`,
      status,
    } as TimelineViewModel['challenges'][number];
  });
}

function buildDecision(state: TimelineState): TimelineViewModel['decision'] {
  const def = state.pendingChoice && EVENTS.find((e) => e.id === state.pendingChoice?.eventId);
  if (!def?.choices) return null;
  return {
    title: def.title,
    text: def.text,
    options: def.choices.map((c) => ({ label: c.label, description: c.description })),
  };
}

const TRADE_AMOUNTS = [30, 120];

function buildMarket(state: TimelineState): TimelineViewModel['market'] {
  const unlocked = rungLevel(state.rung) >= rungLevel(marketRungFor(state));
  return {
    unlocked,
    unlockPrereq: `Opens at ${RUNGS[marketRungFor(state)].name}`,
    rows: BARTER_BASE_RATIOS.map(({ from, to }) => {
      const ratio = barterRatio(state.buildings, from, to) ?? 1;
      const room = state.caps[to] - state.resources[to];
      return {
        from,
        to,
        ratio,
        offers: TRADE_AMOUNTS.map((amount) => {
          const gain = Math.min(Math.floor(amount / ratio), Math.floor(room));
          return {
            amount,
            gain,
            canTrade: unlocked && state.resources[from] >= amount && gain >= 1,
          };
        }),
      };
    }),
  };
}

/** A short, spoiler-free summary a player can paste anywhere. */
export function buildShareText(state: TimelineState): string {
  const parts = [
    `Furthest year ${state.furthestYear}`,
    `${state.prestigeCounts[1]} Time Jumps`,
    state.prestigeCounts[2] > 0 ? `${state.prestigeCounts[2]} Epoch Shifts` : null,
    state.prestigeCounts[3] > 0 ? `${state.prestigeCounts[3]} Paradigm Shifts` : null,
    state.prestigeCounts[4] > 0 ? `${state.prestigeCounts[4]} Ascensions` : null,
    `${state.achievements.length}/${ACHIEVEMENTS.length} achievements`,
    `${state.relics.length}/${RELICS.length} relics`,
  ].filter(Boolean);
  return `One More Timeline: ${parts.join(', ')}.`;
}

const MAX_PEOPLE_SHOWN = 12;

/** Names are cosmetic; roles are assigned to people in a fixed order so the roster is stable. */
function buildPeople(state: TimelineState): Array<{ name: string; role: string }> {
  const order: Array<[string, number]> = [
    ['Forager', state.population.roles.forager],
    ['Builder', state.population.roles.builder],
    ['Scholar', state.population.roles.scholar],
    ['Healer', state.population.roles.healer],
    ['Unassigned', state.population.roles.unassigned],
  ];
  const roles: string[] = order.flatMap(([label, n]) => Array<string>(Math.max(0, n)).fill(label));
  return roles.slice(0, MAX_PEOPLE_SHOWN).map((role, i) => ({ name: personName(timelineSeed(state.seed, state.timelinesCreated), i), role }));
}

/** The closest functions not yet earned, with exactly what earns them. */
function buildNextFeatures(
  state: TimelineState,
  timeJumpDisclosed: boolean,
  tiers: PrestigeTierViewModel[]
): Array<{ icon: string; name: string; condition: string; description: string }> {
  const visible = (tier: 1 | 2 | 3 | 4): boolean =>
    tier === 1 ? timeJumpDisclosed : Boolean(tiers.find((t) => t.tier === tier)?.revealed);
  return FEATURE_IDS.map((id) => FEATURES[id])
    .filter((f) => !hasFeature(state, f.id) && visible(f.tier))
    .map((f) => ({ f, remaining: f.onCount - state.prestigeCounts[f.tier] }))
    .filter(({ remaining }) => remaining > 0)
    .sort((a, b) => a.remaining - b.remaining || a.f.tier - b.f.tier)
    .slice(0, 3)
    .map(({ f, remaining }) => ({
      icon: f.icon,
      name: f.name,
      description: f.description,
      condition: `${remaining} more ${PRESTIGE_LABELS[f.tier]}${remaining > 1 ? 's' : ''}`,
    }));
}

const PRESTIGE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Time Jump',
  2: 'Epoch Shift',
  3: 'Paradigm Shift',
  4: 'Ascension',
};

function toSendsBack(f: FeatureDef): SendsBackViewModel {
  return { id: f.id, name: f.name, icon: f.icon, description: f.description };
}

function formatMultiplier(state: TimelineState): string {
  return `x${getProductionMultiplier(state).toFixed(2)}`;
}

function buildPrestigeTierViewModel(state: TimelineState, tier: PrestigeTier): PrestigeTierViewModel {
  const def = PRESTIGE_TIERS[tier];
  const check = checkPrestigeTier(state, tier);
  const gain = calculatePrestigeGain(state, tier);
  const balance = state[def.requires];
  const finalLevel = RUNG_ORDER.length - 1;
  const items: RungPrerequisiteItem[] = [
    {
      name: RUNGS[RUNG_ORDER[finalLevel]].name,
      current: rungLevel(state.rung),
      required: finalLevel,
      met: state.rung === RUNG_ORDER[finalLevel],
    },
    {
      name: 'Year',
      current: Math.min(state.year, def.requiresYear),
      required: def.requiresYear,
      met: state.year >= def.requiresYear,
    },
    {
      name: def.requiresName,
      current: balance,
      required: def.requiresAmount,
      met: balance >= def.requiresAmount,
    },
  ];
  const sendsBack = featuresEarned(tier, state.prestigeCounts[tier] + 1).map(toSendsBack);
  const canSeeGain = check.eligible || hasFeature(state, 'temporal_foresight');
  const sendsBackText = sendsBack.length
    ? `
• Sends back a new function: ${sendsBack.map((f) => f.name).join(', ')}`
    : '';

  return {
    tier,
    revealed: isPrestigeTierRevealed(state, tier),
    name: def.name,
    icon: def.icon,
    actionLabel: def.actionLabel,
    currencyName: def.currencyName,
    balance: state[def.currency],
    eligible: check.eligible,
    reasons: check.reasons,
    items,
    projectedGain: canSeeGain ? gain : null,
    whatItDoes: def.whatItDoes,
    nextRun: def.nextRun,
    howEarned: def.howEarned,
    resets: def.resets,
    lore: def.lore,
    sendsBack,
    confirmationText: `${def.actionLabel}?

• Gain: +${gain} ${def.currencyName}
• ${def.whatItDoes}
• ${def.resets}${sendsBackText}

This cannot be undone.`,
  };
}

export function buildTimelineViewModel(state: TimelineState): TimelineViewModel {
  const rates = calculateNetRates(state);

  const seasonClass = `season-${state.season.toLowerCase()}`;

  // Stability
  const { label: stabilityLabel, statusClass: stabilityClass } = getStabilityLabel(
    state.resources.stability
  );

  // Population roles
  const RUNG_LEVELS: Record<RungId, number> = Object.fromEntries(
    RUNG_ORDER.map((r, i) => [r, i])
  ) as Record<RungId, number>;
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
      minRung: ROLE_MIN_RUNG.forager,
      description: 'Gathers wild food (+1.5 Food/tick; +2.0 in Autumn, +0.9 in Winter).',
    },
    {
      id: 'builder',
      name: 'Builder',
      minRung: ROLE_MIN_RUNG.builder,
      description: 'Collects and shapes materials (+1.0 Materials/tick; +20% in Summer).',
    },
    {
      id: 'scholar',
      name: 'Scholar',
      minRung: ROLE_MIN_RUNG.scholar,
      description: 'Contemplates time and stone (+0.8 Knowledge/tick; +25% in Winter).',
    },
    {
      id: 'healer',
      name: 'Healer',
      minRung: ROLE_MIN_RUNG.healer,
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

    const maxed = def.maxCount !== undefined && count >= def.maxCount;
    const banned = Boolean(
      state.challenge && getChallenge(state.challenge)?.noBuildings?.includes(bId)
    );
    const canAfford =
      !maxed &&
      !banned &&
      state.resources.materials >= cost.materials &&
      state.resources.food >= (cost.food || 0) &&
      state.resources.knowledge >= (cost.knowledge || 0);

    return {
      id: bId,
      wonder: WONDER_IDS.has(bId),
      name: def.name,
      description: def.description,
      count,
      unlocked,
      unlockPrereq: `Unlocks at ${RUNGS[def.unlockedAt].name}`,
      cost,
      costString: costParts.join(', '),
      canAfford,
      affordable: canAfford,
      maxed,
      gains: describeBuildingGain(state, bId),
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
      for (const [id, needed] of Object.entries(prereqs.buildings ?? {}) as Array<[BuildingId, number]>) {
        items.push({
          name: BUILDINGS[id].name,
          current: state.buildings[id],
          required: needed,
          met: state.buildings[id] >= needed,
        });
      }
    }

    const unlockedFeatures: string[] = [...nextDef.unlocks];

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

  // Time Jump & Insight Benefits
  const timeJumpEligible = checkTimeJump(state).eligible;
  const projectedInsight = calculateTimeJumpInsight(state);

  const yearComponent = Math.floor(Math.sqrt(state.year));
  const rungBonus = RUNGS[state.rung].insightBonus;
  const knowledgeComponent = Math.floor(state.resources.knowledge / 40);
  const popComponent = Math.floor(state.population.total / 4);

  const currentProductionBonusPercent = Math.min(state.insight, 50);
  const nextTotalInsight = state.insight + projectedInsight;
  const currentMultiplier = `+${currentProductionBonusPercent}% permanent production to all roles and builders (+1% per Insight, up to +50%)`;

  const curBonus = insightStartBonus(state.insight);
  const nextBonus = insightStartBonus(nextTotalInsight);

  const projectedGain = timeJumpEligible
    ? `+${projectedInsight} Insight (production bonus becomes +${Math.min(nextTotalInsight, 50)}%, max +50%; starts with +${nextBonus.food} Food, +${nextBonus.materials} Materials)`
    : `+0 Insight (not yet available)`;

  const startingBonus = `+2 Food and +1 Materials per Insight at the dawn of each new timeline, up to +20 Food and +15 Materials (currently +${curBonus.food} Food, +${curBonus.materials} Materials; next timeline +${nextBonus.food} Food, +${nextBonus.materials} Materials)`;

  const formulaExplanation = `Calculated from Year (+${yearComponent}), Highest Rung (+${rungBonus}), Population (+${popComponent}), and Knowledge (+${knowledgeComponent}).`;

  const benefitsBreakdown: TimeJumpBenefitsBreakdown = {
    whatIsInsight: 'Permanent cosmic memory preserved across timeline collapses.',
    currentMultiplier,
    projectedGain,
    startingBonus,
    currentProductionBonusPercent,
    projectedProductionBonusPercent: projectedInsight,
    currentStartingFood: curBonus.food,
    currentStartingMaterials: curBonus.materials,
    nextStartingFood: nextBonus.food,
    nextStartingMaterials: nextBonus.materials,
    formulaExplanation,
    calculationDetails: [
      {
        name: 'Year Duration',
        value: yearComponent,
        description: `Year ${state.year} (floor(sqrt(${state.year})))`,
      },
      {
        name: 'Highest Rung',
        value: rungBonus,
        description: `${RUNGS[state.rung].name} (+${rungBonus})`,
      },
      {
        name: 'Population',
        value: popComponent,
        description: `${state.population.total} Pop (floor(${state.population.total} / 4))`,
      },
      {
        name: 'Knowledge',
        value: knowledgeComponent,
        description: `${Math.floor(state.resources.knowledge)} Knw (floor(${Math.floor(state.resources.knowledge)} / 40))`,
      },
    ],
  };

  const confirmationText = `Initiate Time Jump?\n\nThis will collapse the current timeline into permanent cosmic memory:\n• Gain: +${projectedInsight} permanent Insight\n• Production bonus from Insight becomes +${Math.min(nextTotalInsight, 50)}% (it stops growing at +50%; extra Insight still counts toward Epoch Shift)\n• Next dawn reserves: Starts with +${nextBonus.food} Food, +${nextBonus.materials} Materials\n• Retains Furthest Year record (${Math.max(state.furthestYear, state.year)})\n\nAre you ready to awaken in a new dawn?`;

  const timeJumpVm: TimeJumpViewModel = {
    eligible: timeJumpEligible,
    projectedInsight,
    description: timeJumpEligible
      ? `Collapse this timeline to awaken in a new dawn. Retains Furthest Year (${Math.max(
          state.furthestYear,
          state.year
        )}) and grants +${projectedInsight} permanent Insight (production bonus becomes +${Math.min(nextTotalInsight, 50)}%, max +50%; starts with +${nextBonus.food} Food, +${nextBonus.materials} Materials).`
      : `The timeline is not ready to collapse into Insight yet. ${checkTimeJump(state).reasons.join('. ')}.`,
    currentInsight: state.insight,
    currentMultiplier,
    projectedGain,
    startingBonus,
    breakdown: benefitsBreakdown,
    benefits: benefitsBreakdown,
    confirmationText,
    sendsBack: [],
  };

  timeJumpVm.sendsBack = featuresEarned(1, state.prestigeCounts[1] + 1).map(toSendsBack);
  if (timeJumpVm.sendsBack.length > 0 && timeJumpEligible) {
    timeJumpVm.confirmationText = timeJumpVm.confirmationText.replace(
      '\n\nAre you ready',
      `\n• Sends back a new function: ${timeJumpVm.sendsBack.map((f) => f.name).join(', ')}\n\nAre you ready`
    );
  }

  const prestigeVm = PRESTIGE_TIER_ORDER.map((tier) => buildPrestigeTierViewModel(state, tier));
  const jumped = state.prestigeCounts[1] > 0;
  const timeJumpDisclosed = jumped || timeJumpEligible;
  const featuresVm: FeatureViewModel[] = FEATURE_IDS.filter((id) => hasFeature(state, id)).map(
    (id) => ({
      ...toSendsBack(FEATURES[id]),
      automation: FEATURES[id].automation ?? null,
      enabled: FEATURES[id].automation ? state.automation[FEATURES[id].automation!] : true,
    })
  );

  const achievementList: AchievementViewModel[] = ACHIEVEMENTS.map((a) => {
    const earned = state.achievements.includes(a.id);
    const progress = a.progress?.(state);
    return {
      id: a.id,
      name: a.name,
      icon: a.icon,
      description: a.description,
      earned,
      progressText: earned ? 'Earned' : progress ? `${progress[0]}/${progress[1]}` : '',
    };
  });
  const achievementsVm = {
    earned: state.achievements.length,
    total: ACHIEVEMENTS.length,
    renownPercent: Math.round(state.achievements.length * RENOWN_PER_ACHIEVEMENT * 100),
    list: achievementList,
  };

  const discoveriesVm: DiscoveryViewModel[] = DISCOVERIES.map((d) => {
    const unlocked = rungLevel(state.rung) >= rungLevel(d.minRung) && legacyMet(state, d);
    const researched = state.discoveries.includes(d.id);
    return {
      id: d.id,
      name: d.name,
      icon: d.icon,
      description: d.description,
      cost: discoveryCost(state, d.cost),
      unlocked,
      unlockPrereq:
        rungLevel(state.rung) < rungLevel(d.minRung)
          ? `Unlocks at ${RUNGS[d.minRung].name}`
          : legacyNote(d),
      researched,
      canAfford: unlocked && !researched && state.resources.knowledge >= discoveryCost(state, d.cost),
    };
  });

  const marketVm = buildMarket(state);
  const disclosure: DisclosureViewModel = {
    timeJump: timeJumpDisclosed,
    // Everything a Time Jump brings back stays hidden until the first one has happened.
    legacy: jumped,
    challenges: jumped,
    // Earlier systems stay visible once the player has jumped past the rung that introduced them.
    market: marketVm.unlocked || jumped,
    edicts: rungLevel(state.rung) >= 1 || jumped,
    discoveries: discoveriesVm.some((d) => d.unlocked) || jumped,
    relics: state.relics.length > 0,
    deeper: prestigeVm.some((p) => p.revealed),
    wonders: buildingsVm.some((b) => b.wonder && b.unlocked) || jumped,
  };
  const goal = buildGoal(state, nextRungVm, prestigeVm, timeJumpDisclosed && !jumped && timeJumpEligible);
  const activeChallenge = state.challenge ? CHALLENGES.find((c) => c.id === state.challenge) : undefined;
  if (activeChallenge) {
    goal.title = `${activeChallenge.icon} Challenge: ${activeChallenge.name}`;
    goal.steps = [activeChallenge.description, `Goal: reach ${RUNGS[activeChallenge.goalRung].name}${activeChallenge.maxYear ? ` before Year ${activeChallenge.maxYear + 1}` : ''}`, ...goal.steps];
  }

  const edictSlotsVm: EdictSlotViewModel[] = RUNG_ORDER.filter(
    (r) => r !== 'hearth' && rungLevel(state.rung) >= rungLevel(r)
  ).map((slot) => ({
    slot,
    slotName: RUNGS[slot].name,
    chosenId: state.edicts[slot] ?? null,
    options: edictsForSlot(slot).map((e) => ({
      id: e.id,
      name: e.name,
      icon: e.icon,
      description: e.description,
      chosen: state.edicts[slot] === e.id,
    })),
  }));
  const emptyEdictSlots = edictSlotsVm.filter((s) => s.chosenId === null).length;

  // Actionable Tab Notification Badges
  // Unassigned people only need attention once some role is open to them.
  const rolesOpen = rungLevel(state.rung) >= rungLevel(ROLE_MIN_RUNG.forager);
  const unassignedCount = rolesOpen ? state.population.roles.unassigned : 0;
  const affordableBuildingsCount =
    buildingsVm.filter((b) => b.unlocked && (b.canAfford || b.affordable)).length +
    discoveriesVm.filter((d) => d.canAfford).length +
    emptyEdictSlots;
  const evolutionReady = Boolean(
    nextRungVm?.eligible ||
      prestigeVm.some((p) => p.eligible) ||
      // Time Jump is always on offer after Year 3; only flag it for a first jump or at the climax.
      (timeJumpEligible && (state.rung === 'realm' || state.prestigeCounts[1] === 0))
  );

  const tabBadges: TabBadgesViewModel = {
    hearth: unassignedCount > 0 || state.pendingChoice !== null,
    settlement: affordableBuildingsCount > 0,
    evolution: evolutionReady,
    chronicle: false,
    hearthCount: unassignedCount,
    settlementCount: affordableBuildingsCount,
    subs: {
      'hearth.gather': state.pendingChoice !== null,
      'hearth.roles': unassignedCount > 0,
      'settlement.works': buildingsVm.some((b) => !b.wonder && b.unlocked && (b.canAfford || b.affordable)),
      'settlement.wonders': buildingsVm.some((b) => b.wonder && b.unlocked && (b.canAfford || b.affordable)),
      'settlement.edicts': emptyEdictSlots > 0,
      'settlement.discoveries': discoveriesVm.some((d) => d.canAfford),
      'evolution.rung': Boolean(nextRungVm?.eligible),
      'evolution.jump': timeJumpEligible && (state.rung === 'realm' || state.prestigeCounts[1] === 0),
      'evolution.deeper': prestigeVm.some((p) => p.eligible),
    },
  };

  return {
    header: {
      timelineId: state.timelineId,
      year: state.year,
      season: state.season,
      seasonClass,
      seasonNote: SEASON_PROFILES[state.season].note,
      rungName: RUNGS[state.rung].name,
      furthestYear: state.furthestYear,
      timelinesCreated: state.timelinesCreated,
      insight: state.insight,
      echoes: state.echoes,
      resonance: state.resonance,
      eternity: state.eternity,
      totalMultiplier: formatMultiplier(state),
    },
    resources: {
      food: {
        current: Math.floor(state.resources.food),
        max: state.caps.food,
        rate: rates.food,
        rateFormatted: formatRateAtCap(rates.food, state.resources.food, state.caps.food),
        percentage: Math.min(100, Math.floor((state.resources.food / state.caps.food) * 100)),
      },
      materials: {
        current: Math.floor(state.resources.materials),
        max: state.caps.materials,
        rate: rates.materials,
        rateFormatted: formatRateAtCap(rates.materials, state.resources.materials, state.caps.materials),
        percentage: Math.min(
          100,
          Math.floor((state.resources.materials / state.caps.materials) * 100)
        ),
      },
      knowledge: {
        current: Math.floor(state.resources.knowledge),
        max: state.caps.knowledge,
        rate: rates.knowledge,
        rateFormatted: formatRateAtCap(rates.knowledge, state.resources.knowledge, state.caps.knowledge),
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
      unallocated: state.population.roles.unassigned,
      roles: rolesVm,
    },
     actions: {
       canForage: true,
       canScavenge: true,
       canStudy: true,
       actionPacing: 'Manual actions resolve immediately. Repeat any action whenever you choose.',
       forageYield: (state.season === 'Winter' ? 1.8 : 3) * manualMultiplier(state),
       pacing: 'Act quickly or let the timeline breathe; ticks continue independently.',
    },
    buildings: buildingsVm,
    rungProgression: {
      currentId: state.rung,
      currentName: RUNGS[state.rung].name,
      currentSubtitle: RUNGS[state.rung].subtitle,
      currentDescription: RUNGS[state.rung].description,
      nextRung: nextRungVm,
    },
    timeJump: timeJumpVm,
    prestige: prestigeVm,
    seasons: (Object.keys(SEASON_PROFILES) as Array<keyof typeof SEASON_PROFILES>).map((name) => ({
      name,
      note: SEASON_PROFILES[name].note,
      current: state.season === name,
    })),
    disclosure,
    features: featuresVm,
    nextFeatures: buildNextFeatures(state, timeJumpDisclosed, prestigeVm),
    goal,
    challenges: buildChallenges(state),
    decision: buildDecision(state),
    productionNotes: explainProduction(state),
    market: marketVm,
    people: buildPeople(state),
    relics: {
      found: state.relics.length,
      total: RELICS.length,
      list: RELICS.map((r) => ({
        name: state.relics.includes(r.id) ? r.name : '???',
        icon: state.relics.includes(r.id) ? r.icon : '❔',
        description: state.relics.includes(r.id)
          ? r.description
          : r.trophyOf
            ? `Earned by completing the "${CHALLENGES.find((c) => c.id === r.trophyOf)?.name ?? 'challenge'}" challenge.`
            : `Found in seasonal events once you reach ${RUNGS[r.minRung].name}.`,
        owned: state.relics.includes(r.id),
      })),
    },
    records: [
      { label: 'Furthest year', value: `${state.furthestYear}` },
      { label: 'Timelines begun', value: `${state.timelinesCreated + 1}` },
      { label: 'Time Jumps', value: `${state.prestigeCounts[1]}` },
      { label: 'Epoch Shifts', value: `${state.prestigeCounts[2]}` },
      { label: 'Paradigm Shifts', value: `${state.prestigeCounts[3]}` },
      { label: 'Ascensions', value: `${state.prestigeCounts[4]}` },
      { label: 'Total production', value: formatMultiplier(state) },
      { label: 'Functions sent back', value: `${state.features.length}/${FEATURE_IDS.length}` },
      { label: 'Time lived', value: `${Math.floor(state.stats.ticks / 3600)}h ${Math.floor((state.stats.ticks % 3600) / 60)}m` },
      { label: 'Gathered by hand', value: `${state.stats.gathers}` },
      { label: 'Buildings built', value: `${state.stats.built}` },
      { label: 'Discoveries made', value: `${state.stats.researched}` },
      { label: 'Trades', value: `${state.stats.traded}` },
    ],
    shareText: buildShareText(state),
    history: state.history.map((h) => ({
      label: `#${h.number} ${PRESTIGE_LABELS[h.tier]}`,
      detail: `Year ${h.year}, ${RUNGS[h.rung].name}: ${h.gained}`,
    })),
    discoveries: discoveriesVm,
    edictSlots: edictSlotsVm,
    achievements: achievementsVm,
    tabBadges,
    logs: state.logs,
  };
}
