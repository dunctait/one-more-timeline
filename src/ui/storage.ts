import { normalizeState } from '../engine/engine.js';
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
  LAST_SEEN: 'omt.lastSeen',
  DISPLAY: 'omt.display',
  SPEED: 'omt.speed',
  PAUSED: 'omt.paused',
  WELCOMED: 'omt.welcomed',
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
    return normalizeState(parsed);
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
    localStorage.setItem(STORAGE_KEYS.LAST_SEEN, String(Date.now()));
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

/** Whole seconds since the timeline was last saved, or 0 if unknown. */
export function secondsSinceLastSeen(now = Date.now()): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_SEEN);
    const seen = raw ? Number(raw) : NaN;
    if (!Number.isFinite(seen) || seen > now) return 0;
    return Math.floor((now - seen) / 1000);
  } catch {
    return 0;
  }
}

const EXPORT_PREFIX = 'OMT1:';

export function exportSaveString(state: TimelineState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return EXPORT_PREFIX + btoa(binary);
}

/** Parses and validates an export string; returns null if it is not a usable save. */
export function parseSaveString(text: string): TimelineState | null {
  try {
    const trimmed = text.trim();
    if (!trimmed.startsWith(EXPORT_PREFIX)) return null;
    const binary = atob(trimmed.slice(EXPORT_PREFIX.length));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!isValidSave(parsed) || !isTimelineState(parsed)) return null;
    return normalizeState(parsed);
  } catch {
    return null;
  }
}

export interface DisplayPrefs {
  largeText: boolean;
  reduceMotion: boolean;
  theme: string;
  sound: boolean;
}

export function getDisplayPrefs(): DisplayPrefs {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.DISPLAY) ?? '{}') as Partial<DisplayPrefs>;
    return {
      largeText: parsed.largeText === true,
      reduceMotion: parsed.reduceMotion === true,
      theme: typeof parsed.theme === 'string' ? parsed.theme : 'ember',
      sound: parsed.sound === true,
    };
  } catch {
    return { largeText: false, reduceMotion: false, theme: 'ember', sound: false };
  }
}

export function setDisplayPrefs(prefs: DisplayPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DISPLAY, JSON.stringify(prefs));
  } catch (err) {
    console.warn('Failed to save display preferences', err);
  }
}

export function getSpeed(): 1 | 2 | 4 {
  try {
    const raw = Number(localStorage.getItem(STORAGE_KEYS.SPEED));
    return raw === 2 || raw === 4 ? raw : 1;
  } catch {
    return 1;
  }
}

export function setSpeed(speed: 1 | 2 | 4): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SPEED, String(speed));
  } catch (err) {
    console.warn('Failed to save speed', err);
  }
}

export function getPaused(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.PAUSED) === 'true';
  } catch {
    return false;
  }
}

export function setPaused(paused: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PAUSED, String(paused));
  } catch (err) {
    console.warn('Failed to save pause state', err);
  }
}

/** True the first time only: used for a one-off welcome. */
export function takeFirstRunWelcome(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEYS.WELCOMED) === 'true') return false;
    localStorage.setItem(STORAGE_KEYS.WELCOMED, 'true');
    return localStorage.getItem(STORAGE_KEYS.SAVE) === null;
  } catch {
    return false;
  }
}
