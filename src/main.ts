import {
  createInitialState,
  executeAction,
  stepTick,
} from './engine/engine.js';
import { BuildingId, EngineAction, RoleId, TimelineState } from './engine/types.js';
import {
  clearDevProposals,
  clearGame,
  getDevProposals,
  isDevMode,
  loadGame,
  saveDevProposal,
  saveGame,
  setDevMode,
} from './ui/storage.js';
import { buildTimelineViewModel, TimelineViewModel } from './ui/view-model.js';

// Application state
let state: TimelineState = loadGame() ?? createInitialState();
let devModeActive = isDevMode();
let tickIntervalMs = 1000;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let isPaused = false;

// DOM Elements cache
const elDevBanner = document.getElementById('dev-banner') as HTMLElement;
const elBtnToggleDev = document.getElementById('btn-toggle-dev') as HTMLButtonElement;
const elBtnDisableDev = document.getElementById('btn-disable-dev') as HTMLButtonElement;
const elDevPanel = document.getElementById('dev-panel') as HTMLElement;
const elDevTick = document.getElementById('dev-tick') as HTMLElement;
const elDevSeed = document.getElementById('dev-seed') as HTMLElement;
const elDevRawState = document.getElementById('dev-raw-state') as HTMLElement;

// Speed controls
const elDevSpeedPause = document.getElementById('dev-speed-pause') as HTMLButtonElement;
const elDevSpeed1x = document.getElementById('dev-speed-1x') as HTMLButtonElement;
const elDevSpeed2x = document.getElementById('dev-speed-2x') as HTMLButtonElement;
const elDevSpeed5x = document.getElementById('dev-speed-5x') as HTMLButtonElement;
const elDevSpeedStep = document.getElementById('dev-speed-step') as HTMLButtonElement;
const elDevAddResources = document.getElementById('dev-add-resources') as HTMLButtonElement;
const elDevSetYear10 = document.getElementById('dev-set-year-10') as HTMLButtonElement;
const elDevClearSave = document.getElementById('dev-clear-save') as HTMLButtonElement;

// Status bar elements
const elStatYear = document.getElementById('stat-year') as HTMLElement;
const elStatSeason = document.getElementById('stat-season') as HTMLElement;
const elStatRung = document.getElementById('stat-rung') as HTMLElement;
const elStatFurthest = document.getElementById('stat-furthest') as HTMLElement;
const elStatInsight = document.getElementById('stat-insight') as HTMLElement;
const elStatTimelines = document.getElementById('stat-timelines') as HTMLElement;

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

// Actions
const elBtnForage = document.getElementById('btn-forage') as HTMLButtonElement;
const elBtnStudy = document.getElementById('btn-study') as HTMLButtonElement;

// Community
const elPopTotal = document.getElementById('pop-total') as HTMLElement;
const elPopMax = document.getElementById('pop-max') as HTMLElement;
const elPopUnassigned = document.getElementById('pop-unassigned') as HTMLElement;
const elRoleList = document.getElementById('role-list') as HTMLElement;

// Rung
const elCurrentRungName = document.getElementById('current-rung-name') as HTMLElement;
const elCurrentRungSubtitle = document.getElementById('current-rung-subtitle') as HTMLElement;
const elCurrentRungDesc = document.getElementById('current-rung-desc') as HTMLElement;
const elNextRungContainer = document.getElementById('next-rung-container') as HTMLElement;

// Buildings
const elBuildingGrid = document.getElementById('building-grid') as HTMLElement;

// Time Jump
const elInsightBadge = document.getElementById('insight-badge') as HTMLElement;
const elTimeJumpDesc = document.getElementById('time-jump-desc') as HTMLElement;
const elBtnTimeJump = document.getElementById('btn-time-jump') as HTMLButtonElement;

// Chronicle
const elChronicleLog = document.getElementById('chronicle-log') as HTMLElement;

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

function dispatch(action: EngineAction): void {
  const result = executeAction(state, action);
  if (result.success) {
    state = result.state;
    saveGame(state);
    render();
  } else if (result.error) {
    alert(result.error);
  }
}

function handleTick(): void {
  if (isPaused) return;
  state = stepTick(state);
  saveGame(state);
  render();
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
  elDevBanner.hidden = !devModeActive;
  elDevPanel.hidden = !devModeActive;
  elDevProposalsContainer.hidden = !devModeActive;

  elBtnToggleDev.setAttribute('aria-pressed', devModeActive ? 'true' : 'false');
  elBtnToggleDev.textContent = devModeActive ? '🛠️ Dev Mode: On' : '🛠️ Dev Mode: Off';

  // In Dev Mode, feature submission simulation is unlocked
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
    elDevProposalsList.innerHTML = '<p style="color: var(--text-muted);">No simulated proposals in local queue.</p>';
    return;
  }

  elDevProposalsList.innerHTML = proposals
    .map(
      (p) => `
      <div class="dev-proposal-item">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <strong style="color: var(--text-bright);">${escapeHtml(p.title)}</strong>
          <span style="font-size: 0.7rem; background: #341a00; color: #ffc480; padding: 0.1rem 0.4rem; border-radius: 4px;">
            ${escapeHtml(p.status)}
          </span>
        </div>
        <div style="font-size: 0.75rem; color: var(--accent-amber);">Category: ${escapeHtml(p.category)}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(p.whatToChange)}</div>
      </div>
    `
    )
    .join('');
}

function render(): void {
  const vm: TimelineViewModel = buildTimelineViewModel(state);

  // Status Bar
  elStatYear.textContent = `Year ${vm.header.year}`;
  elStatSeason.textContent = vm.header.season;
  elStatSeason.className = `season-badge ${vm.header.seasonClass}`;
  elStatRung.textContent = vm.header.rungName;
  elStatFurthest.textContent = `Year ${vm.header.furthestYear}`;
  elStatInsight.textContent = `${vm.header.insight}`;
  elStatTimelines.textContent = `${vm.header.timelinesCreated}`;

  // Dev panel stats
  if (devModeActive) {
    elDevTick.textContent = `${state.tick}`;
    elDevSeed.textContent = `${state.seed}`;
    elDevRawState.textContent = JSON.stringify(state, null, 2);
  }

  // Resources: Food
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
  elResStabilityBadge.className = `status-badge ${vm.resources.stability.statusClass}`;
  elResStabilityBar.style.width = `${Math.min(100, Math.max(0, vm.resources.stability.current))}%`;

  // Population
  elPopTotal.textContent = `${vm.population.total}`;
  elPopMax.textContent = `${vm.population.max}`;
  elPopUnassigned.textContent = `${vm.population.unassigned}`;

  // Population Roles
  elRoleList.innerHTML = vm.population.roles
    .map((role) => {
      if (!role.unlocked) {
        return `
          <div class="role-item" style="opacity: 0.45;">
            <div class="role-info">
              <span class="role-name">🔒 ${role.name}</span>
              <span class="role-desc">${role.description}</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">
              Locked
            </div>
          </div>
        `;
      }

      return `
        <div class="role-item">
          <div class="role-info">
            <span class="role-name">${role.name}</span>
            <span class="role-desc">${role.description}</span>
          </div>
          <div class="role-controls">
            <button class="btn btn-sm btn-role-minus" data-role="${role.id}" ${role.canRemove ? '' : 'disabled'}>-</button>
            <span class="role-count">${role.count}</span>
            <button class="btn btn-sm btn-role-plus" data-role="${role.id}" ${role.canAdd ? '' : 'disabled'}>+</button>
          </div>
        </div>
      `;
    })
    .join('');

  // Rung Card
  elCurrentRungName.textContent = vm.rungProgression.currentName;
  elCurrentRungSubtitle.textContent = vm.rungProgression.currentSubtitle;
  elCurrentRungDesc.textContent = vm.rungProgression.currentDescription;

  const nextRung = vm.rungProgression.nextRung;
  if (!nextRung) {
    elNextRungContainer.innerHTML = `
      <div style="font-size: 0.85rem; color: var(--accent-gold); font-weight: 600;">
        🌟 You have reached the pinnacle of Layer 0 settlement evolution!
      </div>
    `;
  } else {
    const reasonsHtml = nextRung.reasons
      .map((r) => `<li class="prereq-item">❌ ${r}</li>`)
      .join('');

    elNextRungContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.4rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">
            Next Rung: ${nextRung.name}
          </span>
          <span style="font-size: 0.75rem; font-style: italic; color: var(--text-muted);">
            ${nextRung.subtitle}
          </span>
        </div>
        ${reasonsHtml ? `<ul class="prereq-list">${reasonsHtml}</ul>` : ''}
        <button id="btn-advance-rung" class="btn btn-accent" style="width: 100%; margin-top: 0.3rem;" ${nextRung.eligible ? '' : 'disabled'}>
          ${nextRung.eligible ? `Ascend to ${nextRung.name}` : `Prerequisites Incomplete for ${nextRung.name}`}
        </button>
      </div>
    `;
  }

  // Buildings Grid
  elBuildingGrid.innerHTML = vm.buildings
    .map((b) => {
      if (!b.unlocked) {
        return `
          <div class="building-item" style="opacity: 0.45;">
            <div class="building-top">
              <span class="building-name">🔒 ${b.name}</span>
            </div>
            <p class="building-desc">${b.description}</p>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; margin-top: 0.2rem;">
              Requires higher civilization rung
            </div>
          </div>
        `;
      }

      return `
        <div class="building-item">
          <div class="building-top">
            <span class="building-name">${b.name}</span>
            <span class="building-count-badge">Built: ${b.count}</span>
          </div>
          <p class="building-desc">${b.description}</p>
          <div class="building-footer">
            <span class="building-cost">Cost: ${b.costString}</span>
            <button class="btn btn-sm btn-primary btn-build" data-building="${b.id}" ${b.canAfford ? '' : 'disabled'}>
              Build +1
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  // Time Jump Card
  elInsightBadge.textContent = `+${vm.timeJump.projectedInsight} Insight`;
  elTimeJumpDesc.textContent = vm.timeJump.description;
  elBtnTimeJump.disabled = !vm.timeJump.eligible;

  // Chronicle Logs
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
  // Direct Actions
  elBtnForage.addEventListener('click', () => dispatch({ type: 'FORAGE' }));
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
      render();
    }
  });

  // Feature proposal modal
  elBtnOpenProposal.addEventListener('click', () => {
    elProposalModalBackdrop.hidden = false;
    renderDevProposals();
  });

  const closeModal = (): void => {
    elProposalModalBackdrop.hidden = true;
  };

  elBtnCloseProposal.addEventListener('click', closeModal);
  elBtnCancelProposal.addEventListener('click', closeModal);
  elProposalModalBackdrop.addEventListener('click', (ev) => {
    if (ev.target === elProposalModalBackdrop) closeModal();
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

    saveDevProposal({
      title,
      category,
      whatToChange,
      whyItImproves,
    });

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
resetTickTimer(1000);
