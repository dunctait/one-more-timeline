import { TimelineState } from '../engine/types.js';

export interface DevProposal {
  id: string;
  timestamp: number;
  title: string;
  category: 'new mechanic' | 'balance' | 'story' | 'other';
  whatToChange: string;
  whyItImproves: string;
  status: 'Simulated / Local Pending Intake';
}

const STORAGE_KEYS = {
  SAVE: 'omt.save.v1',
  DEV_MODE: 'omt.devMode',
  DEV_PROPOSALS: 'omt.devProposals',
} as const;

export function loadGame(): TimelineState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVE);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isTimelineState(parsed)) return null;
    return parsed;
  } catch (err) {
    console.warn('Failed to load save from localStorage', err);
    return null;
  }
}

function isTimelineState(value: unknown): value is TimelineState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<TimelineState>;
  return (
    state.schemaVersion === 1 &&
    typeof state.timelineId === 'string' &&
    typeof state.seed === 'number' &&
    typeof state.tick === 'number' &&
    typeof state.learningGraceTicks === 'number' &&
    typeof state.actionCooldown === 'number' &&
    Boolean(state.resources) &&
    Boolean(state.population) &&
    Boolean(state.population?.roles)
  );
}

export function saveGame(state: TimelineState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVE, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save game state', err);
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SAVE);
  } catch (err) {
    console.warn('Failed to clear save state', err);
  }
}

export function isDevMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.DEV_MODE) === 'true';
  } catch {
    return false;
  }
}

export function setDevMode(active: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DEV_MODE, active ? 'true' : 'false');
  } catch (err) {
    console.warn('Failed to persist dev mode', err);
  }
}

export function getDevProposals(): DevProposal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEV_PROPOSALS);
    if (!raw) return [];
    return JSON.parse(raw) as DevProposal[];
  } catch {
    return [];
  }
}

export function saveDevProposal(
  proposal: Omit<DevProposal, 'id' | 'timestamp' | 'status'>
): DevProposal {
  const proposals = getDevProposals();
  const created: DevProposal = {
    ...proposal,
    id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    status: 'Simulated / Local Pending Intake',
  };
  proposals.unshift(created);
  try {
    localStorage.setItem(STORAGE_KEYS.DEV_PROPOSALS, JSON.stringify(proposals));
  } catch (err) {
    console.warn('Failed to save proposal', err);
  }
  return created;
}

export function clearDevProposals(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DEV_PROPOSALS);
  } catch (err) {
    console.warn('Failed to clear proposals', err);
  }
}
