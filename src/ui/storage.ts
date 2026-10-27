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
  INVALID_SAVE: 'omt.save.v1.invalid',
  DEV_MODE: 'omt.devMode',
  DEV_PROPOSALS: 'omt.devProposals',
} as const;

let storageNotice: string | null = null;

export function consumeStorageNotice(): string | null {
  const notice = storageNotice;
  storageNotice = null;
  return notice;
}

function isValidSave(value: unknown): value is TimelineState {
  if (!value || typeof value !== 'object') return false;
  const parsed = value as Partial<TimelineState>;
  return (
    parsed.schemaVersion === 1 &&
    typeof parsed.timelineId === 'string' &&
    typeof parsed.resources === 'object' &&
    parsed.resources !== null &&
    typeof parsed.population === 'object' &&
    parsed.population !== null &&
    Array.isArray(parsed.logs)
  );
}

function quarantineInvalidSave(raw: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INVALID_SAVE, raw);
    localStorage.removeItem(STORAGE_KEYS.SAVE);
  } catch (err) {
    console.warn('Failed to quarantine invalid save from localStorage', err);
  }
}

export function loadGame(): TimelineState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVE);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSave(parsed) || !isTimelineState(parsed)) {
      quarantineInvalidSave(raw);
      storageNotice = 'The previous local save was invalid, so it was cleared safely. A fresh timeline has been started.';
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to load save from localStorage', err);
    storageNotice = 'The previous local save could not be read, so it was cleared safely. A fresh timeline has been started.';
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVE);
      if (raw) quarantineInvalidSave(raw);
    } catch (quarantineErr) {
      console.warn('Failed to recover invalid save from localStorage', quarantineErr);
    }
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

export interface SaveResult {
  ok: boolean;
  error?: string;
}

export function saveGame(state: TimelineState): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVE, JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    console.warn('Failed to save game state', err);
    storageNotice = 'Your timeline could not be saved locally. Check browser storage and try again.';
    return { ok: false, error: storageNotice };
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

export interface ProposalSaveResult {
  proposal: DevProposal;
  ok: boolean;
  error?: string;
}

export function saveDevProposal(
  proposal: Omit<DevProposal, 'id' | 'timestamp' | 'status'>
): ProposalSaveResult {
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
    return { proposal: created, ok: true };
  } catch (err) {
    console.warn('Failed to save proposal', err);
    return { proposal: created, ok: false, error: 'The proposal could not be saved locally.' };
  }
}

export function clearDevProposals(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DEV_PROPOSALS);
  } catch (err) {
    console.warn('Failed to clear proposals', err);
  }
}
