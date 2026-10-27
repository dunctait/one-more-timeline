import {
  createInitialState,
  executeAction,
  stepTick,
} from './engine/engine.js';
import { BuildingId, EngineAction, RoleId, TimelineState } from './engine/types.js';
import {
  clearDevProposals,
  clearGame,
  consumeStorageNotice,
  getDevProposals,
  isDevMode,
  loadGame,
  saveDevProposal,
  saveGame,
  setDevMode,
} from './ui/storage.js';
import { buildTimelineViewModel, countNewLogIds, TimelineViewModel } from './ui/view-model.js';

// Application state
let state: TimelineState = loadGame() ?? createInitialState();
let devModeActive = isDevMode(); // Strictly false unless localStorage has explicitly 'true'
let tickIntervalMs = 1000;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let isPaused = false;

type TabId = 'hearth' | 'settlement' | 'evolution' | 'chronicle' | 'settings';
let activeTab: TabId = 'hearth';
let unreadLogsCount = 0;
let seenLogIds = new Set(state.logs.map((log) => log.id));
let proposalOpener: HTMLButtonElement | null = null;
const seenUnlocksKey = 'omt.seenUnlocks';
const seenUnlocks = new Set<string>(JSON.parse(localStorage.getItem(seenUnlocksKey) ?? '[]'));
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// Persistent Header Status Elements
const elStatYear = document.getElementById('stat-year') as HTMLElement;
const elStatSeason = document.getElementById('stat-season') as HTMLElement;
const elStatRung = document.getElementById('stat-rung') as HTMLElement;
const elStatFurthest = document.getElementById('stat-furthest') as HTMLElement;
const elStatInsight = document.getElementById('stat-insight') as HTMLElement;
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
const elResPopBar = document.getElementById('res-pop-bar') as HTMLElement;

// Tab 1: Hearth
const elBtnForage = document.getElementById('btn-forage') as HTMLButtonElement;
const elBtnScavenge = document.getElementById('btn-scavenge') as HTMLButtonElement;
const elBtnStudy = document.getElementById('btn-study') as HTMLButtonElement;
const elRoleList = document.getElementById('role-list') as HTMLElement;

// Tab 2: Settlement
const elBuildingGrid = document.getElementById('building-grid') as HTMLElement;

// Tab 3: Evolution
const elCurrentRungName = document.getElementById('current-rung-name') as HTMLElement;
const elCurrentRungSubtitle = document.getElementById('current-rung-subtitle') as HTMLElement;
const elCurrentRungDesc = document.getElementById('current-rung-desc') as HTMLElement;
const elNextRungContainer = document.getElementById('next-rung-container') as HTMLElement;
const elInsightBadge = document.getElementById('insight-badge') as HTMLElement;
const elTimeJumpDesc = document.getElementById('time-jump-desc') as HTMLElement;
const elBtnTimeJump = document.getElementById('btn-time-jump') as HTMLButtonElement;

// Tab 4: Chronicle
const elChronicleLog = document.getElementById('chronicle-log') as HTMLElement;
const elChronicleUnreadBadge = document.getElementById('chronicle-unread-badge') as HTMLElement;

// Tab 5: Settings & Dev Controls
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

function switchTab(target: TabId): void {
  activeTab = target;
  (Object.keys(tabButtons) as TabId[]).forEach((tab) => {
    const btn = tabButtons[tab];
    const panel = tabPanels[tab];
    if (tab === target) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      panel.hidden = false;
      panel.classList.add('active');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
      panel.hidden = true;
      panel.classList.remove('active');
    }
  });

  if (target === 'chronicle') {
    unreadLogsCount = 0;
    seenLogIds = new Set(state.logs.map((log) => log.id));
    elChronicleUnreadBadge.hidden = true;
  }
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

function showToast(message: string): void {
  elToastRegion.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elToastRegion.replaceChildren();
  }, 4200);
}

function checkForProgressionFeedback(previousState: TimelineState, nextState: TimelineState): void {
  const previousLogIds = new Set(previousState.logs.map((log) => log.id));
  const newMilestones = nextState.logs.filter(
    (log) => !previousLogIds.has(log.id) && log.type === 'milestone'
  );
  const newestMilestone = newMilestones[0];
  if (newestMilestone && !seenUnlocks.has(newestMilestone.id)) {
    showToast(newestMilestone.text);
    seenUnlocks.add(newestMilestone.id);
    localStorage.setItem(seenUnlocksKey, JSON.stringify([...seenUnlocks].slice(-50)));
  }
}

function dispatch(action: EngineAction): void {
  const previousState = state;
  const result = executeAction(state, action);
  if (result.success) {
    state = result.state;
    checkForProgressionFeedback(previousState, state);
    persistState();
    checkForNewLogs();
    render();
  } else if (result.error) {
    alert(result.error);
  }
}

function handleTick(): void {
  if (isPaused) return;
  state = stepTick(state);
  persistState();
  checkForNewLogs();
  render();
}

function checkForNewLogs(): void {
  const result = countNewLogIds(state.logs, seenLogIds);
  if (result.count > 0) {
    if (activeTab !== 'chronicle') {
      unreadLogsCount += result.count;
      elChronicleUnreadBadge.hidden = false;
    }
    seenLogIds = result.updatedSeenIds;
  }
}

function resetTickTimer(intervalMs: number): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
  tickIntervalMs = intervalMs;
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

function render(): void {
  const vm: TimelineViewModel = buildTimelineViewModel(state);

  // Persistent Status Header
  elStatYear.textContent = `Year ${vm.header.year}`;
  elStatSeason.textContent = vm.header.season;
  elStatSeason.className = `meta-pill season-badge ${vm.header.seasonClass}`;
  elStatRung.textContent = vm.header.rungName;
  elStatFurthest.textContent = `Yr ${vm.header.furthestYear}`;
  elStatInsight.textContent = `${vm.header.insight}`;
  elStatTimelines.textContent = `${vm.header.timelinesCreated}`;
  elForageYield.textContent = `+${vm.actions.forageYield.toFixed(1)} Food`;
  elActionPacing.textContent = vm.actions.learningGrace
    ? `${vm.actions.pacing} ${vm.actions.learningGrace}`
    : vm.actions.pacing;

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
  elBtnStudy.title = `${vm.actions.actionPacing} ${vm.actions.learningGrace}`;
  elResFoodCurrent.textContent = `${vm.resources.food.current}`;
  elResFoodMax.textContent = `${vm.resources.food.max}`;
  elResFoodRate.textContent = vm.resources.food.rateFormatted;
  elResFoodRate.classList.toggle('negative', vm.resources.food.isDeficit);
  elResFoodBar.style.width = `${vm.resources.food.percentage}%`;

  // Resources: Materials
  elResMaterialsCurrent.textContent = `${vm.resources.materials.current}`;
  elResMaterialsMax.textContent = `${vm.resources.materials.max}`;
  elResMaterialsRate.textContent = vm.resources.materials.rateFormatted;
  elResMaterialsBar.style.width = `${vm.resources.materials.percentage}%`;

  // Resources: Knowledge
  elResKnowledgeCurrent.textContent = `${vm.resources.knowledge.current}`;
  elResKnowledgeMax.textContent = `${vm.resources.knowledge.max}`;
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
  elPopUnassigned.textContent = `${vm.population.unassigned}`;
  const popPercent = Math.min(100, Math.floor((vm.population.total / vm.population.max) * 100));
  elResPopBar.style.width = `${popPercent}%`;

  // Tab 1: Community Roles
  const hasFreePop = vm.population.unassigned > 0;
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
          </div>
        </div>
      `;
    })
    .join('');

  // Tab 2: Buildings
  elBuildingGrid.innerHTML = vm.buildings
    .map((b) => {
      if (!b.unlocked) {
        return `
          <div class="building-card locked">
            <div class="building-card-top">
              <div class="building-title-group">
                <span class="building-name">🔒 ${b.name}</span>
              </div>
              <span class="unlock-badge">${b.unlockPrereq}</span>
            </div>
            <p class="building-desc-text">${b.description}</p>
          </div>
        `;
      }

      return `
        <div class="building-card ${b.canAfford ? 'affordable' : ''}">
          <div class="building-card-top">
            <div class="building-title-group">
              <span class="building-name">${b.name}</span>
              <span class="building-count-chip">Built: ${b.count}</span>
            </div>
          </div>
          <p class="building-desc-text">${b.description}</p>
          <div class="building-card-bottom">
            <span class="building-cost-tags">Cost: ${b.costString}</span>
            <button class="btn-build-action btn-build ${b.canAfford ? 'can-buy' : ''}" data-building="${b.id}" ${b.canAfford ? '' : 'disabled'}>
              Build (+1)
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  // Tab 3: Evolution (Rung Progression & Time Jump)
  elCurrentRungName.textContent = vm.rungProgression.currentName;
  elCurrentRungSubtitle.textContent = vm.rungProgression.currentSubtitle;
  elCurrentRungDesc.textContent = vm.rungProgression.currentDescription;

  const nextRung = vm.rungProgression.nextRung;
  if (!nextRung) {
    elNextRungContainer.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--accent-gold); font-weight: 700; padding: 0.4rem 0;">
        🌟 You have reached the pinnacle of Layer 0 settlement evolution!
      </div>
    `;
  } else {
    const prereqHtml = nextRung.items
      .map(
        (item) => `
        <div class="prereq-chip ${item.met ? 'met' : 'unmet'}">
          <span>${item.name}: ${item.current} / ${item.required}</span>
          <span>${item.met ? '✅' : '❌'}</span>
        </div>
      `
      )
      .join('');

    elNextRungContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.35rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-amber); font-weight: 700;">
            Next Rung: ${nextRung.name}
          </span>
          <span style="font-size: 0.72rem; font-style: italic; color: var(--text-muted);">
            ${nextRung.subtitle}
          </span>
        </div>
        <div class="prereq-grid">${prereqHtml}</div>
        <button id="btn-advance-rung" class="btn-ascend ${nextRung.eligible ? 'ready' : ''}" ${nextRung.eligible ? '' : 'disabled'}>
          ${nextRung.eligible ? `🌟 Ascend to ${nextRung.name}` : `Prerequisites Incomplete for ${nextRung.name}`}
        </button>
      </div>
    `;
  }

  // Time Jump Card
  elInsightBadge.textContent = `+${vm.timeJump.projectedInsight} Insight`;
  elTimeJumpDesc.textContent = vm.timeJump.description;
  elBtnTimeJump.disabled = !vm.timeJump.eligible;

  // Tab 4: Chronicle
  elChronicleLog.innerHTML = vm.logs
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
  // Tab switching
  (Object.keys(tabButtons) as TabId[]).forEach((tab) => {
    tabButtons[tab].addEventListener('click', () => switchTab(tab));
  });

  // Direct Manual Actions
  elBtnForage.addEventListener('click', () => dispatch({ type: 'FORAGE' }));
  elBtnScavenge.addEventListener('click', () => dispatch({ type: 'SCAVENGE' }));
  elBtnStudy.addEventListener('click', () => dispatch({ type: 'STUDY' }));

  // Population Role buttons delegation
  elRoleList.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    if (target.classList.contains('btn-role-plus')) {
      const role = target.getAttribute('data-role') as RoleId;
      if (role) dispatch({ type: 'ASSIGN_ROLE', role, delta: 1 });
    } else if (target.classList.contains('btn-role-minus')) {
      const role = target.getAttribute('data-role') as RoleId;
      if (role) dispatch({ type: 'ASSIGN_ROLE', role, delta: -1 });
    }
  });

  // Buildings buy buttons delegation
  elBuildingGrid.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    if (target.classList.contains('btn-build')) {
      const buildingId = target.getAttribute('data-building') as BuildingId;
      if (buildingId) dispatch({ type: 'BUILD', buildingId });
    }
  });

  // Advance Rung delegation
  elNextRungContainer.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    if (target.id === 'btn-advance-rung') {
      const vm = buildTimelineViewModel(state);
      if (vm.rungProgression.nextRung?.eligible) {
        dispatch({ type: 'ADVANCE_RUNG', rungId: vm.rungProgression.nextRung.id });
      }
    }
  });

  // Time Jump Prestige
  elBtnTimeJump.addEventListener('click', () => {
    const vm = buildTimelineViewModel(state);
    if (!vm.timeJump.eligible) return;
    const confirmed = confirm(
      `Initiate Time Jump?\n\nThis will collapse the current timeline. You will gain +${vm.timeJump.projectedInsight} permanent Insight and preserve your Furthest Year record (${Math.max(
        state.furthestYear,
        state.year
      )}).`
    );
    if (confirmed) {
      dispatch({ type: 'TIME_JUMP' });
      switchTab('hearth');
    }
  });

  // Settings Save & Reset
  elBtnManualSave.addEventListener('click', () => {
    if (persistState()) alert('Timeline saved successfully!');
  });

  elBtnResetGame.addEventListener('click', () => {
    const confirmed = confirm('Reset this timeline to Year 1? Furthest Year and Insight will be reset.');
    if (confirmed) {
      clearGame();
      state = createInitialState();
      switchTab('hearth');
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
    resetTickTimer(1000);
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

  elDevSetYear10.addEventListener('click', () => {
    dispatch({ type: 'DEV_SET_YEAR', year: 10 });
  });

  elDevClearSave.addEventListener('click', () => {
    const confirmed = confirm('Clear game save and reset to Year 1?');
    if (confirmed) {
      clearGame();
      state = createInitialState();
      switchTab('hearth');
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

// Start up
updateDevModeUI();
setupListeners();
render();
const startupStorageNotice = consumeStorageNotice();
if (startupStorageNotice) showStorageMessage(startupStorageNotice);
resetTickTimer(1000);
