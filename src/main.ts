import {
  createInitialState,
  appendLog,
  awayCapTicks,
  fastForward,
  summarizeAway,
  executeAction,
  stepTick,
} from './engine/engine.js';
import { AutomationKey, BuildingId, EngineAction, FeatureId, PrestigeTier, RoleId, RungId, TimelineState, TradeableResource } from './engine/types.js';
import { BUILDINGS, openJobs, checkPrestigeTier, FEATURES, PRESTIGE_TIER_ORDER, PRESTIGE_TIERS, RUNGS, RUNG_ORDER, rungLevel } from './engine/rules.js';
import { resolveTheme, themeOptions } from './ui/themes.js';
import { playSound, soundForAction } from './ui/sound.js';
import {
  clearDevProposals,
  clearGame,
  consumeStorageNotice,
  getDevProposals,
  isDevMode,
  loadGame,
  saveDevProposal,
  saveGame,
  getDisplayPrefs,
  getSpeed,
  getPaused,
  setPaused,
  takeFirstRunWelcome,
  setSpeed,
  setDisplayPrefs,
  secondsSinceLastSeen,
  exportSaveString,
  parseSaveString,
  setDevMode,
} from './ui/storage.js';
import {
  buildTimelineViewModel,
  countNewLogIds,
  formatCompact,
  TimelineViewModel,
  BadgeLevel,
} from './ui/view-model.js';
import { bindLayoutEvents, refreshLayout, selectedSub, setLayoutInputs } from './ui/layout.js';

// Application state
let state: TimelineState = loadGame() ?? createInitialState();
let devModeActive = isDevMode(); // Strictly false unless localStorage has explicitly 'true'
let tickIntervalMs = 1000;
let chosenSpeed: 1 | 2 | 4 = getSpeed();

/** Chrono Dial speed applies only once the feature has been sent back. */
function baseIntervalMs(): number {
  const speed = state.features.includes('chrono_dial') ? chosenSpeed : 1;
  return 1000 / speed;
}
let tickTimer: ReturnType<typeof setInterval> | null = null;
let isPaused = getPaused();

type TabId = 'hearth' | 'settlement' | 'evolution' | 'chronicle' | 'settings';
let activeTab: TabId = 'hearth';
let seenLogIds = new Set(state.logs.map((log) => log.id));
let proposalOpener: HTMLButtonElement | null = null;
const seenUnlocksKey = 'omt.seenUnlocks';

/** Remembering which unlocks were announced is a nicety; a blocked store must not break play. */
function rememberSeenUnlocks(): void {
  try {
    localStorage.setItem(seenUnlocksKey, JSON.stringify([...seenUnlocks].slice(-50)));
  } catch {
    // Storage unavailable: the announcement may simply repeat next session.
  }
}
function loadSeenUnlocks(): Set<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(seenUnlocksKey) ?? '[]');
    return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}
const seenUnlocks = loadSeenUnlocks();


interface ToastPayload {
  id: string;
  message: string;
  type?: 'prestige' | 'milestone' | 'info' | 'feedback';
  actionLabel?: string;
  onAction?: () => void;
  persistent?: boolean;
}

let activeToast: ToastPayload | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// Persistent Header Status Elements
const elStatYear = document.getElementById('stat-year') as HTMLElement;
const elStatSeason = document.getElementById('stat-season') as HTMLElement;
const elStatRung = document.getElementById('stat-rung') as HTMLElement;
const elStatFurthest = document.getElementById('stat-furthest') as HTMLElement;
const elStatInsight = document.getElementById('stat-insight') as HTMLElement;
const elStatInsightPill = document.getElementById('stat-insight-pill') as HTMLElement;
const elStatTimelines = document.getElementById('stat-timelines') as HTMLElement;
const elStatTimelinesWrap = document.getElementById('stat-timelines-wrap') as HTMLElement;

// Resources
const elResFoodCurrent = document.getElementById('res-food-current') as HTMLElement;
const elResFoodMax = document.getElementById('res-food-max') as HTMLElement;
const elResFoodRate = document.getElementById('res-food-rate') as HTMLElement;
const elResFoodBar = document.getElementById('res-food-bar') as HTMLElement;

const elResMaterialsCurrent = document.getElementById('res-materials-current') as HTMLElement;
const elResMaterialsMax = document.getElementById('res-materials-max') as HTMLElement;
const elResMaterialsRate = document.getElementById('res-materials-rate') as HTMLElement;
const elResMaterialsBar = document.getElementById('res-materials-bar') as HTMLElement;

const elResKnowledgeCurrent = document.getElementById('res-knowledge-current') as HTMLElement;
const elResKnowledgeMax = document.getElementById('res-knowledge-max') as HTMLElement;
const elResKnowledgeRate = document.getElementById('res-knowledge-rate') as HTMLElement;
const elResKnowledgeBar = document.getElementById('res-knowledge-bar') as HTMLElement;

const elResStabilityCurrent = document.getElementById('res-stability-current') as HTMLElement;
const elResStabilityBadge = document.getElementById('res-stability-badge') as HTMLElement;
const elResStabilityBar = document.getElementById('res-stability-bar') as HTMLElement;

const elPopTotal = document.getElementById('pop-total') as HTMLElement;
const elPopMax = document.getElementById('pop-max') as HTMLElement;
const elPopUnassigned = document.getElementById('pop-unassigned') as HTMLElement;
const elRoleSlots = document.getElementById('role-slots') as HTMLElement;
const elResPopBar = document.getElementById('res-pop-bar') as HTMLElement;

// Tab 1: Hearth
const elBtnForage = document.getElementById('btn-forage') as HTMLButtonElement;
const elBtnScavenge = document.getElementById('btn-scavenge') as HTMLButtonElement;
const elBtnStudy = document.getElementById('btn-study') as HTMLButtonElement;
const elRoleList = document.getElementById('role-list') as HTMLElement;

// Tab 2: Settlement
const elBuildingGrid = document.getElementById('building-grid') as HTMLElement;
const elWonderGrid = document.getElementById('wonder-grid') as HTMLElement;
const elSeasonList = document.getElementById('season-list') as HTMLElement;

// Tab 3: Evolution
const elCurrentRungName = document.getElementById('current-rung-name') as HTMLElement;
const elCurrentRungSubtitle = document.getElementById('current-rung-subtitle') as HTMLElement;
const elCurrentRungDesc = document.getElementById('current-rung-desc') as HTMLElement;
const elNextRungContainer = document.getElementById('next-rung-container') as HTMLElement;
const elNextRungLabel = document.getElementById('next-rung-label') as HTMLElement;
const elNextRungSubtitle = document.getElementById('next-rung-subtitle') as HTMLElement;
const elNextRungPrerequisites = document.getElementById('next-rung-prerequisites') as HTMLElement;
const elBtnAdvanceRung = document.getElementById('btn-advance-rung') as HTMLButtonElement;
const elInsightBadge = document.getElementById('insight-badge') as HTMLElement;
const elTimeJumpDesc = document.getElementById('time-jump-desc') as HTMLElement;
const elTimeJumpBreakdown = document.getElementById('time-jump-breakdown') as HTMLElement;
const elBtnTimeJump = document.getElementById('btn-time-jump') as HTMLButtonElement;
const elStatDeepPill = document.getElementById('stat-deep-pill') as HTMLElement;
const elLegacyBox = document.getElementById('legacy-functions-box') as HTMLElement;
const elNextFunctions = document.getElementById('next-functions-list') as HTMLElement;
const elLegacyList = document.getElementById('legacy-functions-list') as HTMLElement;
const elGatherHint = document.getElementById('gather-hint') as HTMLElement;
const elDeepPrestigeList = document.getElementById('deep-prestige-list') as HTMLElement;

// Actionable bottom navigation badges
const elTabBadgeHearth = document.getElementById('tab-badge-hearth') as HTMLElement;
const elTabBadgeSettlement = document.getElementById('tab-badge-settlement') as HTMLElement;
const elTabBadgeEvolution = document.getElementById('tab-badge-evolution') as HTMLElement;

// Tab 4: Chronicle
const elChronicleLog = document.getElementById('chronicle-log') as HTMLElement;

// Tab 5: Settings & Dev Controls
const elSaveString = document.getElementById('save-string') as HTMLTextAreaElement;
const elBtnExportSave = document.getElementById('btn-export-save') as HTMLButtonElement;
const elBtnImportSave = document.getElementById('btn-import-save') as HTMLButtonElement;
const elAchievementsList = document.getElementById('achievements-list') as HTMLElement;
const elAchievementsSummary = document.getElementById('achievements-summary') as HTMLElement;
const elDiscoveryList = document.getElementById('discovery-list') as HTMLElement;
const elThemeList = document.getElementById('theme-list') as HTMLElement;
const elBtnSound = document.getElementById('btn-sound') as HTMLButtonElement;
const elBtnLargeText = document.getElementById('btn-large-text') as HTMLButtonElement;
const elBtnReduceMotion = document.getElementById('btn-reduce-motion') as HTMLButtonElement;
const elProductionNotes = document.getElementById('production-notes') as HTMLElement;
const elPeopleList = document.getElementById('people-list') as HTMLElement;
const elPeopleCount = document.getElementById('people-count') as HTMLElement;
const elMarketList = document.getElementById('market-list') as HTMLElement;
const elChallengeList = document.getElementById('challenge-list') as HTMLElement;
const elEdictList = document.getElementById('edict-list') as HTMLElement;
const elDecisionCard = document.getElementById('decision-card') as HTMLElement;
const elDecisionTitle = document.getElementById('decision-title') as HTMLElement;
const elDecisionText = document.getElementById('decision-text') as HTMLElement;
const elDecisionOptions = document.getElementById('decision-options') as HTMLElement;
const elGoalCard = document.getElementById('goal-card') as HTMLElement;
const elGoalTitle = document.getElementById('goal-title') as HTMLElement;
const elGoalSteps = document.getElementById('goal-steps') as HTMLElement;
const elGoalGo = document.getElementById('goal-go') as HTMLButtonElement;
let goalTab: 'hearth' | 'settlement' | 'evolution' = 'hearth';
let goalSub = 'gather';
const elReadyBanner = document.getElementById('ready-banner') as HTMLElement;
const elReadyBannerTitle = document.getElementById('ready-banner-title') as HTMLElement;
const elReadyBannerSteps = document.getElementById('ready-banner-steps') as HTMLElement;
const elReadyBannerGo = document.getElementById('ready-banner-go') as HTMLButtonElement;
const elRelicsList = document.getElementById('relics-list') as HTMLElement;
const elRelicsSummary = document.getElementById('relics-summary') as HTMLElement;
const elBtnCopySummary = document.getElementById('btn-copy-summary') as HTMLButtonElement;
const elRecordsList = document.getElementById('records-list') as HTMLElement;
const elHistoryList = document.getElementById('history-list') as HTMLElement;
const elBtnManualSave = document.getElementById('btn-manual-save') as HTMLButtonElement;
const elBtnResetGame = document.getElementById('btn-reset-game') as HTMLButtonElement;
const elBtnToggleDev = document.getElementById('btn-toggle-dev') as HTMLButtonElement;
const elBtnDisableDev = document.getElementById('btn-disable-dev') as HTMLButtonElement;
const elDevPanel = document.getElementById('dev-panel') as HTMLElement;
const elDevTick = document.getElementById('dev-tick') as HTMLElement;
const elDevSeed = document.getElementById('dev-seed') as HTMLElement;
const elDevRawState = document.getElementById('dev-raw-state') as HTMLElement;

const elDevSpeedPause = document.getElementById('dev-speed-pause') as HTMLButtonElement;
const elDevSpeed1x = document.getElementById('dev-speed-1x') as HTMLButtonElement;
const elDevSpeed2x = document.getElementById('dev-speed-2x') as HTMLButtonElement;
const elDevSpeed5x = document.getElementById('dev-speed-5x') as HTMLButtonElement;
const elDevSpeedStep = document.getElementById('dev-speed-step') as HTMLButtonElement;
const elDevAddResources = document.getElementById('dev-add-resources') as HTMLButtonElement;
const elDevNextRung = document.getElementById('dev-next-rung') as HTMLButtonElement;
const elDevAddInsight = document.getElementById('dev-add-insight') as HTMLButtonElement;
const elDevSetYear10 = document.getElementById('dev-set-year-10') as HTMLButtonElement;
const elDevClearSave = document.getElementById('dev-clear-save') as HTMLButtonElement;

// Modal
const elBtnOpenProposal = document.getElementById('btn-open-proposal') as HTMLButtonElement;
const elProposalModalBackdrop = document.getElementById('proposal-modal-backdrop') as HTMLElement;
const elBtnCloseProposal = document.getElementById('btn-close-proposal') as HTMLButtonElement;
const elBtnCancelProposal = document.getElementById('btn-cancel-proposal') as HTMLButtonElement;
const elProposalForm = document.getElementById('proposal-form') as HTMLFormElement;
const elBtnSubmitProposal = document.getElementById('btn-submit-proposal') as HTMLButtonElement;
const elDevProposalsContainer = document.getElementById('dev-proposals-container') as HTMLElement;
const elDevProposalsList = document.getElementById('dev-proposals-list') as HTMLElement;
const elBtnClearProposals = document.getElementById('btn-clear-proposals') as HTMLButtonElement;
const elToastRegion = document.getElementById('toast-region') as HTMLElement;
const elForageYield = document.getElementById('forage-yield') as HTMLElement;
const elActionPacing = document.getElementById('action-pacing') as HTMLElement;
const elBtnSpeed = document.getElementById('btn-speed') as HTMLButtonElement;
const elBtnPause = document.getElementById('btn-pause') as HTMLButtonElement;

// Bottom Tab Navigation buttons & panels
const tabButtons: Record<TabId, HTMLButtonElement> = {
  hearth: document.getElementById('tab-btn-hearth') as HTMLButtonElement,
  settlement: document.getElementById('tab-btn-settlement') as HTMLButtonElement,
  evolution: document.getElementById('tab-btn-evolution') as HTMLButtonElement,
  chronicle: document.getElementById('tab-btn-chronicle') as HTMLButtonElement,
  settings: document.getElementById('tab-btn-settings') as HTMLButtonElement,
};

const tabPanels: Record<TabId, HTMLElement> = {
  hearth: document.getElementById('tab-hearth') as HTMLElement,
  settlement: document.getElementById('tab-settlement') as HTMLElement,
  evolution: document.getElementById('tab-evolution') as HTMLElement,
  chronicle: document.getElementById('tab-chronicle') as HTMLElement,
  settings: document.getElementById('tab-settings') as HTMLElement,
};

function switchTab(target: TabId, sub?: string): void {
  activeTab = target;
  (Object.keys(tabButtons) as TabId[]).forEach((tab) => {
    const btn = tabButtons[tab];
    const panel = tabPanels[tab];
    if (tab === target) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      btn.tabIndex = 0;
      panel.hidden = false;
      panel.classList.add('active');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
      btn.tabIndex = -1;
      panel.hidden = true;
      panel.classList.remove('active');
    }
  });

  refreshLayout(target, tabPanels[target], sub);
  if (target === 'chronicle') {
    seenLogIds = new Set(state.logs.map((log) => log.id));
  }
}

type ChronicleFilter = 'all' | 'milestones' | 'quiet';
let chronicleFilter: ChronicleFilter = 'all';

let displayPrefs = getDisplayPrefs();
let lastThemeAchievementCount = -1;

function applyDisplayPrefs(): void {
  const root = document.documentElement;
  if (displayPrefs.largeText) root.dataset.text = 'large';
  else delete root.dataset.text;
  const theme = resolveTheme(displayPrefs.theme, state.achievements);
  if (theme === 'ember') delete root.dataset.theme;
  else root.dataset.theme = theme;
  elThemeList.innerHTML = themeOptions(state.achievements)
    .map(
      (t) =>
        `<button type="button" class="btn btn-sm" data-theme="${t.id}" aria-pressed="${t.id === theme}" ${t.unlocked ? '' : 'disabled'} title="${t.unlocked ? '' : t.hint}">${t.unlocked ? '' : '🔒 '}${t.name}</button>`
    )
    .join('');
  if (displayPrefs.reduceMotion) root.dataset.motion = 'reduced';
  else delete root.dataset.motion;
  elBtnLargeText.textContent = `🔠 Larger Text: ${displayPrefs.largeText ? 'On' : 'Off'}`;
  elBtnLargeText.setAttribute('aria-pressed', String(displayPrefs.largeText));
  elBtnReduceMotion.textContent = `🎞️ Reduce Motion: ${displayPrefs.reduceMotion ? 'On' : 'Off'}`;
  elBtnReduceMotion.setAttribute('aria-pressed', String(displayPrefs.reduceMotion));
  elBtnSound.textContent = `🔈 Sound: ${displayPrefs.sound ? 'On' : 'Off'}`;
  elBtnSound.setAttribute('aria-pressed', String(displayPrefs.sound));
}

const MIN_AWAY_TICKS = 30;

let catchingUp = false;
const AWAY_CHUNK_TICKS = 1500;

/**
 * Catches the timeline up for time spent away and welcomes the player back.
 * Runs in slices so a long absence never freezes the page.
 */
async function applyAwayProgress(
  seconds: number = secondsSinceLastSeen() * (1000 / baseIntervalMs())
): Promise<void> {
  // A paused timeline holds perfectly still, including while the player is away.
  if (isPaused || catchingUp) return;
  const away = Math.min(seconds, awayCapTicks(state));
  if (away < MIN_AWAY_TICKS) return;
  catchingUp = true;
  const previous = state;
  let next = state;
  try {
    let remaining = away;
    if (away > AWAY_CHUNK_TICKS) {
      showToast('⏳ Catching up on your time away…', { id: 'away', type: 'milestone', persistent: true });
    }
    while (remaining > 0) {
      const slice = Math.min(AWAY_CHUNK_TICKS, remaining);
      next = fastForward(next, slice).state;
      remaining -= slice;
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } catch (err) {
    console.warn('Catch-up failed; the timeline is unchanged', err);
    dismissToast('away');
    return;
  } finally {
    catchingUp = false;
    // Time already simulated must not be credited again by the next tick.
    lastTickAt = Date.now();
  }
  // The player may have imported or reset during catch-up; never overwrite that with older state.
  if (state !== previous) {
    dismissToast('away');
    return;
  }
  state = next;
  const summary = summarizeAway(previous, state, away);
  checkForProgressionFeedback(previous, state);
  persistState();
  // Ticks run faster than seconds at higher speeds; report the real time away.
  const minutes = Math.round(summary.ticks / (1000 / baseIntervalMs()) / 60);
  const parts = [
    summary.years > 0 ? `${summary.years} years passed` : null,
    summary.food > 0 ? `+${Math.floor(summary.food)} Food` : null,
    summary.materials > 0 ? `+${Math.floor(summary.materials)} Materials` : null,
    summary.knowledge > 0 ? `+${Math.floor(summary.knowledge)} Knowledge` : null,
    summary.population > 0 ? `+${summary.population} people` : null,
  ].filter(Boolean);
  if (parts.length <= 1) parts.push('your stores are full, so spend them!');
  state = appendLog(state, `You were away for ${minutes} min: ${parts.join(', ')}.`, 'milestone');
  persistState();
  showToast(
    `👋 Welcome back! While you were away (${minutes} min): ${parts.join(', ')}.`,
    { id: 'away', type: 'milestone', persistent: false }
  );
  render();
}

function persistState(): boolean {
  const result = saveGame(state);
  if (!result.ok) {
    showStorageMessage(result.error ?? 'Your timeline could not be saved locally.');
  }
  return result.ok;
}

function showStorageMessage(message: string): void {
  const existing = document.getElementById('storage-notice');
  if (existing) existing.remove();
  const notice = document.createElement('div');
  notice.id = 'storage-notice';
  notice.setAttribute('role', 'alert');
  notice.textContent = message;
  document.querySelector('.app-shell')?.prepend(notice);
}

function dismissToast(id?: string): void {
  if (id && activeToast && activeToast.id !== id) {
    return;
  }
  activeToast = null;
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  elToastRegion.replaceChildren();
}

function showToast(message: string, options?: Partial<ToastPayload>): void {
  const payload: ToastPayload = {
    id: options?.id ?? `toast_${Date.now()}`,
    message,
    type: options?.type ?? 'info',
    actionLabel: options?.actionLabel,
    onAction: options?.onAction,
    persistent: options?.persistent ?? false,
  };

  activeToast = payload;
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  const toastEl = document.createElement('div');
  const typeClass =
    payload.type === 'prestige'
      ? 'toast-prestige'
      : payload.type === 'milestone'
      ? 'toast-milestone'
      : 'toast-info';
  toastEl.className = `toast ${typeClass}`;
  toastEl.setAttribute('role', 'status');

  const contentEl = document.createElement('div');
  contentEl.className = 'toast-content';
  contentEl.textContent = payload.message;
  toastEl.appendChild(contentEl);

  const actionsEl = document.createElement('div');
  actionsEl.className = 'toast-actions';

  if (payload.actionLabel && payload.onAction) {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'btn-toast-action';
    actionBtn.textContent = payload.actionLabel;
    actionBtn.addEventListener('click', () => {
      payload.onAction?.();
      dismissToast(payload.id);
    });
    actionsEl.appendChild(actionBtn);
  }

  const dismissBtn = document.createElement('button');
  dismissBtn.type = 'button';
  dismissBtn.className = 'btn-toast-dismiss';
  dismissBtn.setAttribute('aria-label', 'Dismiss notification');
  dismissBtn.textContent = '✕';
  dismissBtn.addEventListener('click', () => {
    dismissToast(payload.id);
  });
  actionsEl.appendChild(dismissBtn);

  toastEl.appendChild(actionsEl);

  elToastRegion.replaceChildren(toastEl);

  if (!payload.persistent) {
    toastTimer = setTimeout(() => {
      dismissToast(payload.id);
    }, 8000);
  }
}

function checkForProgressionFeedback(previousState: TimelineState, nextState: TimelineState): void {
  if (previousState.rung !== nextState.rung) {
    const rungDef = RUNGS[nextState.rung];
    const unlockKey = `rung_${nextState.rung}`;
    if (!seenUnlocks.has(unlockKey)) {
      seenUnlocks.add(unlockKey);
      rememberSeenUnlocks();
      showToast(
        `🌟 ${rungDef.name} Reached: ${rungDef.subtitle} ${rungDef.description}`,
        {
          id: unlockKey,
          type: 'milestone',
          actionLabel:
            rungLevel(nextState.rung) >= 2
              ? 'View Settlement'
              : 'View Hearth',
          onAction: () => {
            switchTab(
              rungLevel(nextState.rung) >= 2
                ? 'settlement'
                : 'hearth'
            );
          },
          persistent: true,
        }
      );
      return;
    }
  }
  // Achievements and events are quiet: they live in the Chronicle, never in a toast.
}

/** A short ceremony: the tier's line, and the names of any functions just sent back. */
function announcePrestige(action: EngineAction, before: TimelineState, after: TimelineState): void {
  const sent = after.features
    .filter((id) => !before.features.includes(id))
    .map((id) => `${FEATURES[id].icon} ${FEATURES[id].name}`);
  const title =
    action.type === 'PRESTIGE'
      ? `${PRESTIGE_TIERS[action.tier].icon} ${PRESTIGE_TIERS[action.tier].name} complete.`
      : action.type === 'START_CHALLENGE'
        ? '🏁 Challenge begun.'
        : '🌀 Jumpback complete.';
  const lore = action.type === 'PRESTIGE' ? ` ${PRESTIGE_TIERS[action.tier].lore}` : '';
  showToast(`${title}${lore}${sent.length ? ` Sent back through time: ${sent.join(', ')}.` : ''}`, {
    id: 'prestige-done',
    type: 'milestone',
    persistent: false,
  });
}

function dispatch(action: EngineAction): void {
  if (catchingUp) return;
  const previousState = state;
  const result = executeAction(state, action);
  if (result.success) {
    state = result.state;
    const sound = soundForAction(action.type);
    if (sound) playSound(sound, displayPrefs.sound);
    // The first of anything is an event: the player earned it, so it gets a moment.
    if (action.type === 'BUILD' && previousState.buildings[action.buildingId] === 0) {
      showToast(`🏗️ Your first ${BUILDINGS[action.buildingId].name} stands.`, { id: 'first-build', type: 'milestone', persistent: false });
    }
    if (action.type === 'TIME_JUMP' || action.type === 'PRESTIGE' || action.type === 'START_CHALLENGE') {
      dismissToast();
      // A newly sent-back Chrono Dial changes the tick rate right away.
      if (!isPaused) resetTickTimer(baseIntervalMs());
      announcePrestige(action, previousState, state);
    }
    // A reset is not a rung being reached; only genuine advancement earns that toast.
    const resets = ['TIME_JUMP', 'PRESTIGE', 'START_CHALLENGE', 'DEV_RESET'].includes(action.type);
    if (!resets) checkForProgressionFeedback(previousState, state);
    persistState();
    checkForNewLogs();
    render();
  } else if (result.error) {
    alert(result.error);
  }
}

let lastTickAt = Date.now();

function handleTick(): void {
  if (isPaused || catchingUp) return;
  // Background tabs throttle timers; any gap longer than a moment is time the timeline still owes.
  const now = Date.now();
  const gapSeconds = Math.floor((now - lastTickAt) / 1000);
  lastTickAt = now;
  if (gapSeconds >= MIN_AWAY_TICKS) {
    // Ticks owed = wall-clock gap times the current speed (the Chrono Dial runs the clock faster).
    void applyAwayProgress(Math.round(gapSeconds * (1000 / tickIntervalMs)));
    return;
  }
  const previousState = state;
  state = stepTick(state);
  checkForProgressionFeedback(previousState, state);
  // Writing the whole save every second is wasteful on a phone; every 5 ticks plus page-leave is enough.
  if (state.tick % 5 === 0) persistState();
  checkForNewLogs();
  render();
}

function checkForNewLogs(): void {
  const result = countNewLogIds(state.logs, seenLogIds);
  if (result.count > 0) {
    seenLogIds = result.updatedSeenIds;
  }
}

function updatePauseButton(): void {
  elBtnPause.textContent = isPaused ? 'Resume timeline' : 'Pause timeline';
  elBtnPause.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
}

function resetTickTimer(intervalMs: number): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
  tickIntervalMs = intervalMs;
  lastTickAt = Date.now();
  if (!isPaused && intervalMs > 0) {
    tickTimer = setInterval(handleTick, intervalMs);
  }
}

function updateDevModeUI(): void {
  // Dev panel strictly visible only if dev mode is enabled
  elDevPanel.hidden = !devModeActive;
  elDevProposalsContainer.hidden = !devModeActive;

  elBtnToggleDev.setAttribute('aria-pressed', devModeActive ? 'true' : 'false');
  elBtnOpenProposal.disabled = !devModeActive;
  elBtnOpenProposal.title = devModeActive
    ? 'Open the local Dev Mode proposal simulation'
    : 'Feature proposals are currently in closed incubation';
  elBtnToggleDev.textContent = devModeActive ? '🛠️ Dev Mode: On (Active)' : '🛠️ Dev Mode: Off';
  if (devModeActive) {
    elBtnToggleDev.classList.add('btn-accent');
  } else {
    elBtnToggleDev.classList.remove('btn-accent');
  }

  // Feature submission intake
  if (devModeActive) {
    elBtnSubmitProposal.disabled = false;
    elBtnSubmitProposal.title = 'Simulate submitting this proposal into local Dev Mode queue';
    elBtnSubmitProposal.textContent = 'Simulate Submission (Dev Mode)';
  } else {
    elBtnSubmitProposal.disabled = true;
    elBtnSubmitProposal.title = 'Feature submission is in closed incubation mode';
    elBtnSubmitProposal.textContent = 'Submit Proposal';
  }

  renderDevProposals();
}

function renderDevProposals(): void {
  if (!devModeActive) return;
  const proposals = getDevProposals();
  if (proposals.length === 0) {
    elDevProposalsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.7rem;">No simulated proposals in local queue.</p>';
    return;
  }

  elDevProposalsList.innerHTML = proposals
    .map(
      (p) => `
      <div style="border-bottom: 1px solid #332200; padding: 0.2rem 0;">
        <div style="display: flex; justify-content: space-between;">
          <strong style="color: #ffedd5;">${escapeHtml(p.title)}</strong>
          <span style="font-size: 0.65rem; color: #ffc480;">${escapeHtml(p.category)}</span>
        </div>
        <div style="font-size: 0.68rem; color: #fed7aa;">${escapeHtml(p.whatToChange)}</div>
      </div>
    `
    )
    .join('');
}

/** A filled orange pill for something NEW the player can do; a hollow ring for more of what they already know. */
function paintBadge(el: HTMLElement, level: BadgeLevel | undefined): void {
  const novel = level?.novel ?? 0;
  const open = level?.available ?? 0;
  el.hidden = novel + open === 0;
  el.textContent = novel > 0 ? String(novel) : open > 0 ? String(open) : '';
  el.classList.add('badge-count');
  el.classList.toggle('badge-novel', novel > 0);
  el.classList.toggle('badge-open', novel === 0 && open > 0);
  el.setAttribute('aria-label', novel > 0 ? `${novel} new thing${novel > 1 ? 's' : ''} to do` : `${open} thing${open > 1 ? 's' : ''} to do`);
}

function render(): void {
  const vm: TimelineViewModel = buildTimelineViewModel(state);
  setLayoutInputs({ disclosure: { ...vm.disclosure }, badges: vm.tabBadges.levels, locks: vm.locks });
  elGatherHint.textContent = state.features.includes('steady_hands') ? 'Immediate agency · keys 1, 2, 3 · hold to repeat' : 'Immediate agency · keys 1, 2, 3';

  // Persistent Status Header
  elStatYear.textContent = `Year ${vm.header.year}`;
  elStatSeason.textContent = vm.header.season;
  elStatSeason.className = `meta-pill season-badge ${vm.header.seasonClass}`;
  elStatSeason.title = vm.header.seasonNote;
  elStatRung.textContent = vm.header.rungName;
  elStatFurthest.textContent = `Yr ${vm.header.furthestYear}`;
  elStatInsight.textContent = `${vm.header.insight}`;
  // Insight is not mentioned until the first Jumpback has been met.
  elStatInsightPill.hidden = !vm.disclosure.timeJump;
  elStatInsightPill.title = `${vm.timeJump.breakdown.whatIsInsight} Current effect: ${vm.timeJump.currentMultiplier}. ${vm.timeJump.breakdown.startingBonus}`;
  elStatTimelines.textContent = `${vm.header.timelinesCreated}`;

  // Keep actionable tab badges live as resources, population, and progression change.
  paintBadge(elTabBadgeHearth, vm.tabBadges.levels.hearth);
  paintBadge(elTabBadgeSettlement, vm.tabBadges.levels.settlement);
  paintBadge(elTabBadgeEvolution, vm.tabBadges.levels.evolution);
  elForageYield.textContent = `+${vm.actions.forageYield.toFixed(1)} Food`;
  elActionPacing.textContent = vm.actions.pacing;

  if (vm.header.timelinesCreated > 0) {
    elStatTimelinesWrap.style.display = 'inline-block';
  }

  // Dev panel debug stats
  if (devModeActive) {
    elDevTick.textContent = `${state.tick}`;
    elDevSeed.textContent = `${state.seed}`;
    elDevRawState.textContent = JSON.stringify(state, null, 2);
  }

  // Resources: Food
  elBtnForage.disabled = !vm.actions.canForage;
  elBtnScavenge.disabled = !vm.actions.canScavenge;
  elBtnStudy.disabled = !vm.actions.canStudy;
  elBtnForage.title = vm.actions.actionPacing;
  elBtnScavenge.title = vm.actions.actionPacing;
  elBtnStudy.title = vm.actions.actionPacing;
  elResFoodCurrent.textContent = formatCompact(vm.resources.food.current);
  elResFoodMax.textContent = formatCompact(vm.resources.food.max);
  elResFoodRate.textContent = vm.resources.food.rateFormatted;
  elResFoodBar.style.width = `${vm.resources.food.percentage}%`;

  // Resources: Materials
  elResMaterialsCurrent.textContent = formatCompact(vm.resources.materials.current);
  elResMaterialsMax.textContent = formatCompact(vm.resources.materials.max);
  elResMaterialsRate.textContent = vm.resources.materials.rateFormatted;
  elResMaterialsBar.style.width = `${vm.resources.materials.percentage}%`;

  // Resources: Knowledge
  elResKnowledgeCurrent.textContent = formatCompact(vm.resources.knowledge.current);
  elResKnowledgeMax.textContent = formatCompact(vm.resources.knowledge.max);
  elResKnowledgeRate.textContent = vm.resources.knowledge.rateFormatted;
  elResKnowledgeBar.style.width = `${vm.resources.knowledge.percentage}%`;

  // Resources: Stability
  elResStabilityCurrent.textContent = `${vm.resources.stability.current}`;
  elResStabilityBadge.textContent = vm.resources.stability.label;
  elResStabilityBadge.className = `res-status-badge ${vm.resources.stability.statusClass}`;
  elResStabilityBar.style.width = `${Math.min(100, Math.max(0, vm.resources.stability.current))}%`;

  // Population
  elPopTotal.textContent = `${vm.population.total}`;
  elPopMax.textContent = `${vm.population.max}`;
  elPopUnassigned.textContent = `${vm.population.jobs.open}`;
  elRoleSlots.textContent = `Jobs ${vm.population.jobs.taken} / ${vm.population.jobs.total} (half work)`;
  elRoleSlots.title = 'Only half of your people work; the rest raise the young and keep the fires. Build Huts for more people, and so more jobs.';
  const popPercent = Math.min(100, Math.floor((vm.population.total / vm.population.max) * 100));
  elResPopBar.style.width = `${popPercent}%`;

  // Tab 1: Community Roles
  const hasFreePop = vm.population.jobs.open > 0;
  elRoleList.innerHTML = vm.population.roles
    .map((role) => {
      if (!role.unlocked) {
        return `
          <div class="role-row locked">
            <div class="role-info">
              <div class="role-title-row">
                <span class="role-title">🔒 ${role.name}</span>
                <span class="unlock-badge">${role.unlockPrereq}</span>
              </div>
              <span class="role-effect">${role.description}</span>
            </div>
            <div style="font-size: 0.7rem; color: var(--text-dim); font-style: italic;">
              Locked
            </div>
          </div>
        `;
      }

      return `
        <div class="role-row">
          <div class="role-info">
            <div class="role-title-row">
              <span class="role-title">${role.name}</span>
            </div>
            <span class="role-effect">${role.description}</span>
          </div>
          <div class="role-controls">
            <button class="btn-ctrl btn-role-minus" data-role="${role.id}" ${role.canRemove ? '' : 'disabled'} aria-label="Remove 1 ${role.name}">-</button>
            <span class="role-count-num">${role.count}</span>
            <button class="btn-ctrl btn-role-plus ${hasFreePop ? 'highlight-add' : ''}" data-role="${role.id}" ${role.canAdd ? '' : 'disabled'} aria-label="Add 1 ${role.name}">+</button>
            <button class="btn-ctrl btn-role-all" data-role="${role.id}" ${role.canAdd ? '' : 'disabled'} aria-label="Assign every idle person as ${role.name}">All</button>
          </div>
        </div>
      `;
    })
    .join('');

  // Tab 2: Buildings
  const costHtml = (b: (typeof vm.buildings)[number]): string =>
    b.costChips.map((c) => `<span class="cost-chip${c.short ? ' short' : ''}"><span aria-hidden="true">${c.icon}</span>${c.amount}</span>`).join('');
  const buildingHtml = (list: typeof vm.buildings, empty: string): string => {
    const shown = list.filter((b) => b.unlocked);
    if (shown.length === 0) return `<p class="settings-copy">${escapeHtml(empty)}</p>`;
    return shown
      .map(
        (b) => `
        <div class="building-card ${b.canAfford ? 'affordable' : ''}${b.maxed ? ' built' : ''}">
          <div class="bc-body">
            <div class="bc-head">
              <span class="building-name">${b.name}</span>
              ${b.wonder ? '' : `<span class="building-count-chip" title="Built: ${b.count}">×${b.count}</span>`}
            </div>
            <p class="bc-flavour">${escapeHtml(b.flavour)}</p>
            <div class="bc-chips">${b.chips.map((c) => `<span class="chip" title="${escapeHtml(c.title)}"><span aria-hidden="true">${c.icon}</span>${escapeHtml(c.text)}</span>`).join('')}</div>
          </div>
          <button class="btn-build-action btn-build ${b.canAfford ? 'can-buy' : ''}" data-building="${b.id}" ${b.canAfford ? '' : 'disabled'} aria-label="${b.maxed ? `${b.name} is built` : `Build ${b.name} (${escapeHtml(b.costString)})`}">
            <span class="bb-verb">${b.maxed ? 'Built' : 'Build'}</span>
            ${b.maxed ? '' : `<span class="bb-cost">${costHtml(b)}</span>`}
            ${b.eta ? `<span class="bb-eta">⏱ ${escapeHtml(b.eta)}</span>` : ''}
          </button>
        </div>`
      )
      .join('');
  };
  elBuildingGrid.innerHTML = buildingHtml(vm.buildings.filter((b) => !b.wonder), 'Reach the Gathering Band to start building.');
  elWonderGrid.innerHTML = buildingHtml(vm.buildings.filter((b) => b.wonder), 'No wonder can be raised yet.');
  elSeasonList.innerHTML = vm.seasons
    .map((x) => `<div class="season-row${x.current ? ' current' : ''}"><strong>${escapeHtml(x.name)}${x.current ? ' (now)' : ''}</strong><span>${escapeHtml(x.note)}</span></div>`)
    .join('');

  // Tab 3: Evolution (Rung Progression & Jumpback)
  elCurrentRungName.textContent = vm.rungProgression.currentName;
  elCurrentRungSubtitle.textContent = vm.rungProgression.currentSubtitle;
  elCurrentRungDesc.textContent = vm.rungProgression.currentDescription;

  const nextRung = vm.rungProgression.nextRung;
  if (!nextRung) {
    elNextRungLabel.textContent = '🌟 You have reached the pinnacle of settlement evolution!';
    elNextRungSubtitle.textContent = '';
    elNextRungPrerequisites.replaceChildren();
    elBtnAdvanceRung.textContent = '';
    elBtnAdvanceRung.disabled = true;
    elBtnAdvanceRung.classList.remove('ready');
  } else {
    elNextRungLabel.textContent = `Next Rung: ${nextRung.name}`;
    elNextRungSubtitle.textContent = nextRung.subtitle;
    const unlocksHtml = nextRung.unlockedFeatures.length > 0
      ? `<div class="next-rung-unlocks">${nextRung.unlockedFeatures.map((u) => `<span class="unlock-pill">🔓 ${escapeHtml(u)}</span>`).join('')}</div>`
      : '';
    const descHtml = nextRung.description
      ? `<p class="next-rung-description">${escapeHtml(nextRung.description)}</p>`
      : '';
    elNextRungPrerequisites.innerHTML = `
      ${descHtml}
      ${unlocksHtml}
      <div class="prereq-grid">
        ${nextRung.items
          .map(
            (item) => `
            <div class="prereq-chip ${item.met ? 'met' : 'unmet'}">
              <span>${item.name}: ${item.current} / ${item.required}</span>
              <span>${item.met ? '✅' : '❌'}</span>
            </div>
          `
          )
          .join('')}
      </div>
    `;
    elBtnAdvanceRung.textContent = nextRung.eligible
      ? `🌟 Advance to ${nextRung.name}`
      : `Prerequisites Incomplete for ${nextRung.name}`;
    elBtnAdvanceRung.disabled = !nextRung.eligible;
    elBtnAdvanceRung.classList.toggle('ready', nextRung.eligible);
  }

  // Jumpback Card
  elInsightBadge.textContent = `+${vm.timeJump.projectedInsight} Insight`;
  elTimeJumpDesc.textContent = vm.timeJump.description;
  elTimeJumpBreakdown.innerHTML = `
    <div class="time-jump-card-section">
      <div class="time-jump-section-title">✨ What Insight means</div>
      <p class="time-jump-concept-callout">${escapeHtml(vm.timeJump.breakdown.whatIsInsight)}</p>
      <ul class="time-jump-stat-list">
        <li><span class="time-jump-stat-label">Current production</span><span class="time-jump-stat-val highlight">${escapeHtml(vm.timeJump.currentMultiplier)}</span></li>
      </ul>
    </div>
    <div class="time-jump-card-section">
      <div class="time-jump-section-title">🌀 Next Jumpback</div>
      <ul class="time-jump-stat-list">
        <li><span class="time-jump-stat-label">Projected gain</span><span class="time-jump-stat-val highlight">${escapeHtml(vm.timeJump.projectedGain)}</span></li>
        <li><span class="time-jump-stat-label">Next timeline reserves</span><span class="time-jump-stat-val">+${vm.timeJump.breakdown.nextStartingFood} Food, +${vm.timeJump.breakdown.nextStartingMaterials} Materials</span></li>
      </ul>
      ${vm.timeJump.sendsBack.map((f) => `<p class="deep-sends-back">${f.icon} Sends back: <strong>${escapeHtml(f.name)}</strong> — ${escapeHtml(f.description)}</p>`).join('')}
    </div>
  `;
  elBtnTimeJump.disabled = !vm.timeJump.eligible;

  // Chrono Dial
  const hasDial = vm.features.some((f) => f.id === 'chrono_dial');
  elBtnSpeed.hidden = !hasDial;
  elBtnSpeed.textContent = `Speed: ${chosenSpeed}x`;

  // Pending choice event
  elDecisionCard.hidden = vm.decision === null;
  if (vm.decision) {
    elDecisionTitle.textContent = `✨ ${vm.decision.title}: a decision awaits`;
    elDecisionText.textContent = vm.decision.text;
    elDecisionOptions.innerHTML = vm.decision.options
      .map(
        (o, i) => `<button type="button" class="btn-edict" data-choice="${i}"><strong>${escapeHtml(o.label)}</strong><br>${escapeHtml(o.description)}</button>`
      )
      .join('');
  }

  // Current goal
  elGoalTitle.textContent = `🎯 ${vm.goal.title}`;
  elGoalSteps.innerHTML = vm.goal.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
  elGoalCard.classList.toggle('ready', vm.goal.ready);
  elGoalGo.textContent = vm.goal.tab === 'hearth' ? 'Keep gathering' : 'Go';
  elGoalGo.hidden = vm.goal.tab === 'hearth';
  goalTab = vm.goal.tab;
  goalSub = vm.goal.sub;
  // A ready goal rises to the banner, which every tab shows; the card is for steps still to take.
  elGoalCard.hidden = vm.goal.ready;
  elReadyBanner.hidden = !vm.goal.ready;
  if (vm.goal.ready) {
    elReadyBannerTitle.textContent = `🎯 ${vm.goal.title}`;
    elReadyBannerSteps.textContent = vm.goal.steps[0] ?? '';
    elReadyBannerGo.hidden = activeTab === vm.goal.tab && selectedSub(activeTab) === vm.goal.sub;
  }

  // Where production comes from
  elProductionNotes.innerHTML = vm.productionNotes
    .map((n) => `<li>${escapeHtml(n.label)}: <span>${escapeHtml(n.value)}</span></li>`)
    .join('');

  // Your people
  elPeopleCount.textContent = vm.population.total > vm.people.length ? `showing ${vm.people.length} of ${vm.population.total}` : `${vm.population.total} living`;
  elPeopleList.innerHTML = vm.people
    .map((p) => `<li>${escapeHtml(p.name)} <span>· ${escapeHtml(p.role)}</span></li>`)
    .join('');

  // Challenges
  elChallengeList.innerHTML = vm.challenges
    .filter((c) => c.status !== 'locked')
    .map((c) => {
      const action =
        c.status === 'done'
          ? '<span class="unlock-pill">Trophy earned</span>'
          : c.status === 'locked'
            ? `<span class="unlock-pill">${escapeHtml(c.lockedNote)}</span>`
            : c.status === 'active'
              ? `<button type="button" class="btn-trade" data-challenge-abandon="1">Set aside</button>`
              : `<button type="button" class="btn-trade" data-challenge-start="${c.id}">Begin</button>`;
      return `<div class="discovery ${c.status === 'done' ? 'researched' : ''}">
        <div><strong>${c.icon} ${escapeHtml(c.name)}</strong>
          <p title="${escapeHtml(`${c.description} ${c.goal}. Trophy: ${c.reward}`)}">${escapeHtml(c.description)} 🏆 ${escapeHtml(c.reward)}</p></div>
        ${action}
      </div>`;
    })
    .join('');

  // Marketplace
  elMarketList.innerHTML = vm.market.unlocked
    ? vm.market.rows
        .map(
          (row) => `<div class="market-row">
        <span>${escapeHtml(row.from)} → ${escapeHtml(row.to)} <span class="section-hint">${row.ratio}:1</span></span>
        <span class="market-buttons">
          ${row.offers
            .map(
              (o) => `<button type="button" class="btn-trade" data-trade-from="${row.from}" data-trade-to="${row.to}" data-trade-amount="${o.amount}" ${o.canTrade ? '' : 'disabled'}>${o.amount} → ${o.gain}</button>`
            )
            .join('')}
        </span>
      </div>`
        )
        .join('')
    : `<p class="settings-copy">${escapeHtml(vm.market.unlockPrereq)}.</p>`;

  // Edicts
  elEdictList.innerHTML = vm.edictSlots.length
    ? vm.edictSlots
        .map(
          (slot) => `<div>
        <div class="edict-slot-title ${slot.chosenId ? '' : 'empty'}">${escapeHtml(slot.slotName)}${slot.chosenId ? '' : ' — choose an edict'}</div>
        <div class="edict-options">
          ${slot.options
            .map(
              (o) => `<button type="button" class="btn-edict" data-edict-slot="${slot.slot}" data-edict-id="${o.id}" aria-pressed="${o.chosen}"><strong>${o.icon} ${escapeHtml(o.name)}</strong><br>${escapeHtml(o.description)}</button>`
            )
            .join('')}
        </div>
      </div>`
        )
        .join('')
    : '<p class="settings-copy">Reach the Gathering Band to issue your first edict.</p>';

  // Discoveries
  elDiscoveryList.innerHTML = vm.discoveries
    .filter((d) => d.unlocked || d.researched)
    .map((d) => {
      const cls = d.researched ? 'researched' : d.unlocked ? '' : 'locked';
      const button = d.researched
        ? '<span class="unlock-pill">Known</span>'
        : d.unlocked
          ? `<button type="button" class="btn-research" data-discovery="${d.id}" ${d.canAfford ? '' : 'disabled'}>Research<br>${d.cost} Knw</button>`
          : `<span class="unlock-pill">${escapeHtml(d.unlockPrereq)}</span>`;
      return `<div class="discovery ${cls}">
        <div><strong>${d.icon} ${escapeHtml(d.name)}</strong><p>${escapeHtml(d.description)}</p></div>
        ${button}
      </div>`;
    })
    .join('');

  // Relics
  elRelicsSummary.textContent = `${vm.relics.found}/${vm.relics.total} found`;
  elRelicsList.innerHTML = vm.relics.list
    .map(
      (r) => `<div class="achievement ${r.owned ? 'earned' : ''}">
        <strong>${r.icon} ${escapeHtml(r.name)}</strong>
        <span>${escapeHtml(r.description)}</span>
      </div>`
    )
    .join('');

  // Records & past timelines
  elRecordsList.innerHTML = vm.records
    .map((r) => `<div><dt>${escapeHtml(r.label)}</dt><dd>${escapeHtml(r.value)}</dd></div>`)
    .join('');
  elHistoryList.innerHTML = vm.history.length
    ? vm.history.map((h) => `<li><strong>${escapeHtml(h.label)}</strong> — ${escapeHtml(h.detail)}</li>`).join('')
    : '<li>No timelines have ended yet.</li>';

  // Achievements (a new unlock may open a new theme)
  if (vm.achievements.earned !== lastThemeAchievementCount) {
    if (lastThemeAchievementCount >= 0 && vm.achievements.earned > lastThemeAchievementCount) {
      playSound('chime', displayPrefs.sound);
    }
    lastThemeAchievementCount = vm.achievements.earned;
    applyDisplayPrefs();
  }
  elAchievementsSummary.textContent = `${vm.achievements.earned}/${vm.achievements.total} · +${vm.achievements.renownPercent}% Renown`;
  elAchievementsList.innerHTML = vm.achievements.list
    .map(
      (a) => `<div class="achievement ${a.earned ? 'earned' : ''}" title="${escapeHtml(a.description)}">
        <strong>${a.icon} ${escapeHtml(a.name)}</strong>
        <span>${escapeHtml(a.description)}</span>
        ${a.progressText ? `<div class="ach-progress">${escapeHtml(a.progressText)}</div>` : ''}
      </div>`
    )
    .join('');

  // Deeper currencies in the header (shown once earned)
  const deepParts: string[] = [];
  if (vm.header.echoes > 0) deepParts.push(`🌅 ${vm.header.echoes}`);
  if (vm.header.resonance > 0) deepParts.push(`🔮 ${vm.header.resonance}`);
  if (vm.header.eternity > 0) deepParts.push(`♾️ ${vm.header.eternity}`);
  elStatDeepPill.hidden = deepParts.length === 0;
  elStatDeepPill.textContent = deepParts.join('  ');
  elStatDeepPill.title = `Echoes, Resonance and Eternity Marks. Total permanent production: ${vm.header.totalMultiplier}.`;

  // Functions sent back through time
  elNextFunctions.innerHTML = vm.nextFeatures
    .map((f) => `<li title="${escapeHtml(f.description)}">${f.icon} <strong>${escapeHtml(f.name)}</strong> · ${escapeHtml(f.condition)}</li>`)
    .join('');
  const boonOffers = vm.boons
    .map(
      (b) => `
      <div class="legacy-item boon-offer">
        <div>
          <strong>${b.icon} ${escapeHtml(b.name)}</strong>
          <p>${escapeHtml(b.description)}</p>
        </div>
        <button type="button" class="btn-trade" data-boon="${b.id}">Take</button>
      </div>`
    )
    .join('');
  elLegacyList.innerHTML = boonOffers + vm.features
    .map(
      (f) => `
      <div class="legacy-item">
        <div>
          <strong>${f.icon} ${escapeHtml(f.name)}</strong>
          <p>${escapeHtml(f.description)}</p>
        </div>
        ${
          f.automation
            ? `<button type="button" class="btn-toggle" data-automation="${f.automation}" aria-pressed="${f.enabled}" aria-label="${escapeHtml(f.name)}: ${f.enabled ? 'on' : 'off'}">${f.enabled ? 'On' : 'Off'}</button>`
            : '<span class="unlock-pill">Always on</span>'
        }
      </div>`
    )
    .join('');

  // Deeper prestige tiers
  elDeepPrestigeList.innerHTML = vm.prestige
    .filter((p) => p.revealed)
    .map((p) => {
      const sends = p.sendsBack
        .map((f) => `<p class="deep-sends-back">${f.icon} Sends back: <strong>${escapeHtml(f.name)}</strong> — ${escapeHtml(f.description)}</p>`)
        .join('');
      const reqs = p.items
        .map((i) => `<span class="prereq-chip ${i.met ? 'met' : 'unmet'}">${i.met ? '✓' : '○'} ${escapeHtml(i.name)} ${i.current}/${i.required}</span>`)
        .join(' ');
      const gain = p.projectedGain === null ? '' : ` <span class="deep-currency">+${p.projectedGain} ${escapeHtml(p.currencyName)}</span>`;
      return `
      <section class="section-box deep-card ${p.eligible ? 'is-ready' : ''}">
        <div class="section-header">
          <h3>${p.icon} ${escapeHtml(p.name)}</h3>
          <span class="deep-currency">${escapeHtml(p.currencyName)}: ${p.balance}</span>
        </div>
        <p><em>${escapeHtml(p.lore)}</em></p>
        <p><strong>What ${escapeHtml(p.currencyName)} do now:</strong> ${escapeHtml(p.whatItDoes)}</p>
        <p><strong>Next run:</strong> ${escapeHtml(p.nextRun)}</p>
        <p><strong>How earned:</strong> ${escapeHtml(p.howEarned)}</p>
        <p><strong>Resets:</strong> ${escapeHtml(p.resets)}</p>
        ${sends}
        <div class="prereq-grid">${reqs}</div>
        <button type="button" class="btn-deep" data-prestige-tier="${p.tier}" ${p.eligible ? '' : 'disabled'}>${escapeHtml(p.actionLabel)}${p.eligible ? gain : ''}</button>
      </section>`;
    })
    .join('');

  // Tab 4: Chronicle
  elChronicleLog.innerHTML = vm.logs
    .filter((log) => chronicleFilter === 'all' || (chronicleFilter === 'milestones' ? log.type !== 'info' : log.type === 'info'))
    .map((log) => {
      let typeClass = '';
      if (log.type === 'milestone') typeClass = 'log-type-milestone';
      else if (log.type === 'warning') typeClass = 'log-type-warning';
      else if (log.type === 'prestige') typeClass = 'log-type-prestige';

      return `
        <div class="log-entry ${typeClass}">
          <span class="log-time">[Y${log.year}]</span>
          <span>${escapeHtml(log.text)}</span>
        </div>
      `;
    })
    .join('');

  // Everything shown is fitted to the screen after the content is in place.
  refreshLayout(activeTab, tabPanels[activeTab]);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Event Listeners setup
function setupListeners(): void {
  // Tapping a greyed-out page says when it opens.
  document.addEventListener('omt:locked', (event) => {
    showToast((event as CustomEvent<string>).detail, { id: 'locked-page', type: 'info', persistent: false });
  });

  // Tab switching
  (Object.keys(tabButtons) as TabId[]).forEach((tab) => {
    tabButtons[tab].addEventListener('click', () => switchTab(tab));
  });

  // Direct Manual Actions
  // Tap once to act; hold to repeat (about 8 times a second) so nobody has to hammer a button.
  const bindGather = (button: HTMLButtonElement, action: EngineAction): void => {
    let delay: ReturnType<typeof setTimeout> | undefined;
    let repeat: ReturnType<typeof setInterval> | undefined;
    let held = false;
    const stop = (): void => {
      clearTimeout(delay);
      clearInterval(repeat);
      delay = undefined;
      repeat = undefined;
    };
    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      held = false;
      // Holding to repeat is a function sent back by the first Jumpback; until then every gather is a tap.
      if (!state.features.includes('steady_hands')) return;
      delay = setTimeout(() => {
        held = true;
        repeat = setInterval(() => dispatch(action), 125);
      }, 450);
    });
    // Releasing over the button keeps `held` so the click that follows is swallowed;
    // leaving or cancelling produces no click, so the hold is forgotten.
    button.addEventListener('pointerup', stop);
    ['pointerleave', 'pointercancel'].forEach((type) =>
      button.addEventListener(type, () => {
        stop();
        held = false;
      })
    );
    button.addEventListener('click', (event) => {
      if (held) {
        held = false;
        event.preventDefault();
        return;
      }
      dispatch(action);
    });
  };
  bindGather(elBtnForage, { type: 'FORAGE' });
  bindGather(elBtnScavenge, { type: 'SCAVENGE' });
  bindGather(elBtnStudy, { type: 'STUDY' });

  // Population Role buttons delegation
  elRoleList.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    if (target.classList.contains('btn-role-plus')) {
      const role = target.getAttribute('data-role') as RoleId;
      if (role) dispatch({ type: 'ASSIGN_ROLE', role, delta: 1 });
    } else if (target.classList.contains('btn-role-all')) {
      const role = target.getAttribute('data-role') as RoleId;
      const idle = Math.min(state.population.roles.unassigned, openJobs(state.population));
      if (role && idle > 0) dispatch({ type: 'ASSIGN_ROLE', role, delta: idle });
    } else if (target.classList.contains('btn-role-minus')) {
      const role = target.getAttribute('data-role') as RoleId;
      if (role) dispatch({ type: 'ASSIGN_ROLE', role, delta: -1 });
    }
  });

  // Buildings buy buttons delegation
  [elBuildingGrid, elWonderGrid].forEach((grid) =>
    grid.addEventListener('click', (ev) => {
      // The button holds icon and number spans, so a tap usually lands on one of those.
      const target = (ev.target as HTMLElement).closest<HTMLElement>('.btn-build');
      if (target && !(target as HTMLButtonElement).disabled) {
        const buildingId = target.getAttribute('data-building') as BuildingId;
        if (buildingId) dispatch({ type: 'BUILD', buildingId });
      }
    })
  );

  // Advance Rung: the button is stable across renders, so clicks remain attached during ticks.
  elBtnAdvanceRung.addEventListener('click', () => {
    const vm = buildTimelineViewModel(state);
    if (vm.rungProgression.nextRung?.eligible) {
      dispatch({ type: 'ADVANCE_RUNG', rungId: vm.rungProgression.nextRung.id });
    }
  });

  document.querySelectorAll<HTMLButtonElement>('[data-jump]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.jump as string);
      const behavior = displayPrefs.reduceMotion ? 'auto' : 'smooth';
      target?.closest('section')?.scrollIntoView({ behavior, block: 'start' });
    });
  });

  // Arrow keys, Home and End move between the tabs (roving tabindex, per the ARIA tabs pattern).
  const tabKeys = Object.values(tabButtons);
  tabKeys.forEach((button, index) => {
    button.addEventListener('keydown', (event) => {
      const last = tabKeys.length - 1;
      const next =
        event.key === 'ArrowRight' ? (index + 1) % tabKeys.length
        : event.key === 'ArrowLeft' ? (index + last) % tabKeys.length
        : event.key === 'Home' ? 0
        : event.key === 'End' ? last
        : -1;
      if (next < 0) return;
      event.preventDefault();
      tabKeys[next].focus();
      tabKeys[next].click();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-chronicle-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      chronicleFilter = chip.dataset.chronicleFilter as ChronicleFilter;
      document.querySelectorAll<HTMLButtonElement>('[data-chronicle-filter]').forEach((other) => {
        other.setAttribute('aria-pressed', String(other === chip));
      });
      render();
    });
  });

  elGoalGo.addEventListener('click', () => switchTab(goalTab, goalSub));
  elReadyBannerGo.addEventListener('click', () => switchTab(goalTab, goalSub));
  bindLayoutEvents();

  elDecisionOptions.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-choice]');
    if (!button) return;
    dispatch({ type: 'RESOLVE_CHOICE', index: Number(button.dataset.choice) });
  });

  elBtnSpeed.addEventListener('click', () => {
    chosenSpeed = chosenSpeed === 1 ? 2 : chosenSpeed === 2 ? 4 : 1;
    setSpeed(chosenSpeed);
    tickIntervalMs = baseIntervalMs();
    if (!isPaused) resetTickTimer(tickIntervalMs);
    render();
  });

  // Normal-player pause control; Dev Mode speed controls remain separate diagnostics.
  elBtnPause.addEventListener('click', () => {
    isPaused = !isPaused;
    setPaused(isPaused);
    if (!isPaused) {
      lastTickAt = Date.now();
      persistState();
    }
    if (isPaused) {
      resetTickTimer(0);
      tickIntervalMs = baseIntervalMs();
    } else {
      resetTickTimer(tickIntervalMs);
    }
    updatePauseButton();
  });

  // Deeper prestige tiers
  elDeepPrestigeList.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-prestige-tier]');
    if (!button || button.disabled) return;
    const tier = Number(button.dataset.prestigeTier) as PrestigeTier;
    const vm = buildTimelineViewModel(state);
    const entry = vm.prestige.find((p) => p.tier === tier);
    if (!entry || !entry.eligible) return;
    if (confirm(entry.confirmationText)) {
      dispatch({ type: 'PRESTIGE', tier });
      switchTab('hearth', 'gather');
    }
  });

  elChallengeList.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const start = target.closest<HTMLButtonElement>('[data-challenge-start]');
    if (start) {
      if (confirm('Begin this challenge? Your current timeline ends (paying out the Insight a Jumpback would) and a new one starts with every permanent bonus intact.')) {
        dispatch({ type: 'START_CHALLENGE', challengeId: start.dataset.challengeStart as string });
        switchTab('hearth', 'gather');
      }
      return;
    }
    if (target.closest('[data-challenge-abandon]')) dispatch({ type: 'ABANDON_CHALLENGE' });
  });

  elMarketList.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-trade-from]');
    if (!button || button.disabled) return;
    dispatch({
      type: 'BARTER',
      from: button.dataset.tradeFrom as TradeableResource,
      to: button.dataset.tradeTo as TradeableResource,
      amount: Number(button.dataset.tradeAmount),
    });
  });

  elEdictList.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-edict-id]');
    if (!button) return;
    const slot = button.dataset.edictSlot as RungId;
    const id = button.dataset.edictId as string;
    const chosen = state.edicts[slot] === id;
    dispatch({ type: 'SET_EDICT', slot, edictId: chosen ? null : id });
  });

  elDiscoveryList.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-discovery]');
    if (!button || button.disabled) return;
    dispatch({ type: 'RESEARCH', discoveryId: button.dataset.discovery as string });
  });

  // Automation switches for functions sent back through time
  elLegacyList.addEventListener('click', (event) => {
    const boon = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-boon]');
    if (boon) {
      dispatch({ type: 'CHOOSE_BOON', featureId: boon.dataset.boon as FeatureId });
      return;
    }
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-automation]');
    if (!button) return;
    dispatch({ type: 'TOGGLE_AUTOMATION', key: button.dataset.automation as AutomationKey });
  });

  // Jumpback Prestige
  elBtnTimeJump.addEventListener('click', () => {
    const vm = buildTimelineViewModel(state);
    if (!vm.timeJump.eligible) return;
    const confirmed = confirm(vm.timeJump.confirmationText);
    if (confirmed) {
      dispatch({ type: 'TIME_JUMP' });
      switchTab('hearth', 'gather');
    }
  });

  elThemeList.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-theme]');
    if (!button || button.disabled) return;
    displayPrefs = { ...displayPrefs, theme: button.dataset.theme as string };
    setDisplayPrefs(displayPrefs);
    applyDisplayPrefs();
  });

  elBtnLargeText.addEventListener('click', () => {
    displayPrefs = { ...displayPrefs, largeText: !displayPrefs.largeText };
    setDisplayPrefs(displayPrefs);
    applyDisplayPrefs();
  });
  elBtnSound.addEventListener('click', () => {
    displayPrefs = { ...displayPrefs, sound: !displayPrefs.sound };
    setDisplayPrefs(displayPrefs);
    applyDisplayPrefs();
    playSound('chime', displayPrefs.sound);
  });
  elBtnReduceMotion.addEventListener('click', () => {
    displayPrefs = { ...displayPrefs, reduceMotion: !displayPrefs.reduceMotion };
    setDisplayPrefs(displayPrefs);
    applyDisplayPrefs();
  });

  // Keyboard shortcuts for the three gathering actions
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (activeTab !== 'hearth') return;
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]')) return;
    const keyMap: Record<string, HTMLButtonElement> = {
      '1': elBtnForage,
      '2': elBtnScavenge,
      '3': elBtnStudy,
    };
    const button = keyMap[event.key];
    if (button && !button.disabled) {
      event.preventDefault();
      button.click();
    }
  });

  elBtnCopySummary.addEventListener('click', async () => {
    const text = buildTimelineViewModel(state).shareText;
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Summary copied. Paste it anywhere.', { id: 'share', type: 'feedback' });
    } catch {
      showToast(text, { id: 'share', type: 'feedback' });
    }
  });

  // Save string export / import
  elBtnExportSave.addEventListener('click', async () => {
    const text = exportSaveString(state);
    elSaveString.value = text;
    elSaveString.select();
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Save string copied to your clipboard.', { id: 'export', type: 'feedback' });
    } catch {
      showToast('Save string ready below. Copy it to keep it safe.', { id: 'export', type: 'feedback' });
    }
  });

  elBtnImportSave.addEventListener('click', () => {
    const imported = parseSaveString(elSaveString.value);
    if (!imported) {
      showToast('That save string could not be read. Nothing was changed.', { id: 'import', type: 'feedback' });
      return;
    }
    if (!confirm('Replace your current timeline with this save? This cannot be undone.')) return;
    state = imported;
    persistState();
    lastThemeAchievementCount = -1;
    elSaveString.value = '';
    switchTab('hearth', 'gather');
    render();
    showToast('Save imported.', { id: 'import', type: 'feedback' });
  });

  // Settings Save & Reset
  elBtnManualSave.addEventListener('click', () => {
    if (persistState()) alert('Timeline saved successfully!');
  });

  elBtnResetGame.addEventListener('click', () => {
    const confirmed = confirm('Erase EVERYTHING? This deletes all progress: Insight, Echoes, Resonance, Eternity Marks, relics, trophies, achievements, functions, records and statistics. It cannot be undone. Tip: copy your save string from Export first.');
    if (confirmed) {
      clearGame();
        dismissToast();
      state = createInitialState();
      switchTab('hearth', 'gather');
      render();
    }
  });

  // Dev Mode toggle
  elBtnToggleDev.addEventListener('click', () => {
    devModeActive = !devModeActive;
    setDevMode(devModeActive);
    updateDevModeUI();
    render();
  });

  elBtnDisableDev.addEventListener('click', () => {
    devModeActive = false;
    setDevMode(false);
    updateDevModeUI();
    render();
  });

  // Dev Speed controls
  elDevSpeedPause.addEventListener('click', () => {
    isPaused = true;
    elDevSpeedPause.classList.add('btn-primary');
    elDevSpeed1x.classList.remove('btn-primary');
    elDevSpeed2x.classList.remove('btn-primary');
    elDevSpeed5x.classList.remove('btn-primary');
  });

  elDevSpeed1x.addEventListener('click', () => {
    isPaused = false;
    resetTickTimer(baseIntervalMs());
    elDevSpeed1x.classList.add('btn-primary');
    elDevSpeedPause.classList.remove('btn-primary');
    elDevSpeed2x.classList.remove('btn-primary');
    elDevSpeed5x.classList.remove('btn-primary');
  });

  elDevSpeed2x.addEventListener('click', () => {
    isPaused = false;
    resetTickTimer(500);
    elDevSpeed2x.classList.add('btn-primary');
    elDevSpeedPause.classList.remove('btn-primary');
    elDevSpeed1x.classList.remove('btn-primary');
    elDevSpeed5x.classList.remove('btn-primary');
  });

  elDevSpeed5x.addEventListener('click', () => {
    isPaused = false;
    resetTickTimer(200);
    elDevSpeed5x.classList.add('btn-primary');
    elDevSpeedPause.classList.remove('btn-primary');
    elDevSpeed1x.classList.remove('btn-primary');
    elDevSpeed2x.classList.remove('btn-primary');
  });

  elDevSpeedStep.addEventListener('click', () => {
    handleTick();
  });

  elDevAddResources.addEventListener('click', () => {
    dispatch({ type: 'DEV_ADD_RESOURCES', amount: 50 });
  });

  elDevNextRung.addEventListener('click', () => {
    const next = RUNG_ORDER[rungLevel(state.rung) + 1];
    if (next) dispatch({ type: 'DEV_SET_RUNG', rung: next });
  });

  elDevAddInsight.addEventListener('click', () => {
    dispatch({ type: 'DEV_ADD_INSIGHT', amount: 25 });
  });

  elDevSetYear10.addEventListener('click', () => {
    dispatch({ type: 'DEV_SET_YEAR', year: 10 });
  });

  elDevClearSave.addEventListener('click', () => {
    const confirmed = confirm('Clear game save and reset to Year 1?');
    if (confirmed) {
      clearGame();
        dismissToast();
      state = createInitialState();
      switchTab('hearth', 'gather');
      render();
    }
  });

  // Feature proposal modal
  const modalDialog = elProposalModalBackdrop.querySelector<HTMLElement>('[role="dialog"]');
  const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const closeModal = (): void => {
    elProposalModalBackdrop.hidden = true;
    proposalOpener?.focus();
  };

  elBtnOpenProposal.addEventListener('click', () => {
    if (!devModeActive || elBtnOpenProposal.disabled) return;
    proposalOpener = elBtnOpenProposal;
    elProposalModalBackdrop.hidden = false;
    renderDevProposals();
    (modalDialog?.querySelector<HTMLElement>(focusableSelector) ?? modalDialog)?.focus();
  });

  elBtnCloseProposal.addEventListener('click', closeModal);
  elBtnCancelProposal.addEventListener('click', closeModal);
  elProposalModalBackdrop.addEventListener('click', (ev) => {
    if (ev.target === elProposalModalBackdrop) closeModal();
  });
  elProposalModalBackdrop.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      closeModal();
      return;
    }
    if (ev.key !== 'Tab' || !modalDialog) return;
    const focusable = Array.from(modalDialog.querySelectorAll<HTMLElement>(focusableSelector));
    if (focusable.length === 0) {
      ev.preventDefault();
      modalDialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  });

  // Proposal submission
  elProposalForm.addEventListener('submit', (ev) => {
    ev.preventDefault();

    if (!devModeActive) {
      alert(
        'Feature submission intake is currently in closed incubation mode. Submissions from the public are not accepted yet. Follow along on GitHub.'
      );
      return;
    }

    const title = (document.getElementById('prop-title') as HTMLInputElement).value;
    const category = (document.getElementById('prop-category') as HTMLSelectElement).value as any;
    const whatToChange = (document.getElementById('prop-change') as HTMLTextAreaElement).value;
    const whyItImproves = (document.getElementById('prop-why') as HTMLTextAreaElement).value;

    const saveResult = saveDevProposal({
      title,
      category,
      whatToChange,
      whyItImproves,
    });

    if (!saveResult.ok) {
      showStorageMessage(saveResult.error ?? 'The proposal could not be saved locally.');
      return;
    }
    elProposalForm.reset();
    renderDevProposals();
    alert('Simulated local proposal queued in Dev Mode (stored in localStorage.omt.devProposals)!');
  });

  elBtnClearProposals.addEventListener('click', () => {
    clearDevProposals();
    renderDevProposals();
  });
}

/**
 * render() rebuilds list markup every tick. Skipping writes whose HTML is unchanged keeps
 * keyboard focus and text selection alive between ticks.
 */
function guardInnerHtml(el: HTMLElement): void {
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (!descriptor?.set || !descriptor.get) return;
  const { get, set } = descriptor;
  let last: string | null = null;
  Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() {
      return get.call(el);
    },
    set(value: string) {
      if (last === value && (value === '' || el.firstChild !== null)) return;
      last = value;
      set.call(el, value);
    },
  });
}

[
  elChallengeList, elDecisionOptions, elProductionNotes, elMarketList, elThemeList, elRoleList, elBuildingGrid, elWonderGrid, elSeasonList, elNextRungPrerequisites, elTimeJumpBreakdown, elGoalSteps,
  elPeopleList, elEdictList, elDiscoveryList, elRelicsList, elRecordsList, elHistoryList,
  elAchievementsList, elLegacyList, elDeepPrestigeList, elChronicleLog,
].forEach(guardInnerHtml);

// Start up
updateDevModeUI();
setupListeners();
switchTab(activeTab); // sets the roving tab stop and panel visibility
updatePauseButton();
render();
const startupStorageNotice = consumeStorageNotice();
if (startupStorageNotice) showStorageMessage(startupStorageNotice);
applyDisplayPrefs();
if (takeFirstRunWelcome()) {
  showToast('Welcome. Tap Forage, Scavenge and Study to begin. Numbers only go up in this game, so you can leave any time and come back to more.', {
    id: 'welcome',
    type: 'milestone',
    persistent: false,
  });
}
void applyAwayProgress();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void applyAwayProgress();
  else if (!catchingUp) persistState();
});
window.addEventListener('pagehide', () => {
  if (!catchingUp) persistState();
});
resetTickTimer(baseIntervalMs());

// Offline support: the game opens and plays with no connection after one visit.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed', err);
    });
  });
}

// A broken render must never look like lost progress: say so, and point at the saved timeline.
window.addEventListener('error', () => {
  showStorageMessage('Something went wrong on screen. Your timeline is saved; reloading should fix it.');
});
