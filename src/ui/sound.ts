/** Tiny synthesized sounds: no assets, off by default, never required to play. */
export type SoundKind = 'tap' | 'build' | 'chime' | 'fanfare';

interface Note {
  freq: number;
  start: number;
  length: number;
  gain: number;
}

const SOUNDS: Record<SoundKind, Note[]> = {
  tap: [{ freq: 520, start: 0, length: 0.05, gain: 0.05 }],
  build: [
    { freq: 330, start: 0, length: 0.08, gain: 0.07 },
    { freq: 440, start: 0.07, length: 0.1, gain: 0.07 },
  ],
  chime: [
    { freq: 660, start: 0, length: 0.12, gain: 0.07 },
    { freq: 880, start: 0.1, length: 0.18, gain: 0.07 },
  ],
  fanfare: [
    { freq: 392, start: 0, length: 0.14, gain: 0.08 },
    { freq: 523, start: 0.12, length: 0.14, gain: 0.08 },
    { freq: 659, start: 0.24, length: 0.14, gain: 0.08 },
    { freq: 784, start: 0.36, length: 0.3, gain: 0.08 },
  ],
};

let context: AudioContext | null = null;
let lastTap = 0;

export function playSound(kind: SoundKind, enabled: boolean): void {
  if (!enabled) return;
  const now = Date.now();
  if (kind === 'tap') {
    if (now - lastTap < 60) return;
    lastTap = now;
  }
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const t0 = context.currentTime;
    for (const note of SOUNDS[kind]) {
      const osc = context.createOscillator();
      const amp = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      amp.gain.setValueAtTime(note.gain, t0 + note.start);
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + note.start + note.length);
      osc.connect(amp).connect(context.destination);
      osc.start(t0 + note.start);
      osc.stop(t0 + note.start + note.length + 0.02);
    }
  } catch {
    // Audio is a nicety; any failure is silent.
  }
}

/** Which sound, if any, an engine action deserves. */
export function soundForAction(type: string): SoundKind | null {
  switch (type) {
    case 'FORAGE':
    case 'SCAVENGE':
    case 'STUDY':
      return 'tap';
    case 'BUILD':
    case 'RESEARCH':
    case 'BARTER':
    case 'SET_EDICT':
    case 'RESOLVE_CHOICE':
      return 'build';
    case 'ADVANCE_RUNG':
    case 'TIME_JUMP':
    case 'PRESTIGE':
    case 'START_CHALLENGE':
      return 'fanfare';
    default:
      return null;
  }
}
