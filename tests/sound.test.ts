import { describe, expect, it } from 'vitest';
import { playSound, soundForAction } from '../src/ui/sound.js';

describe('sound', () => {
  it('maps actions to sounds and stays silent for background ones', () => {
    expect(soundForAction('FORAGE')).toBe('tap');
    expect(soundForAction('BUILD')).toBe('build');
    expect(soundForAction('PRESTIGE')).toBe('fanfare');
    expect(soundForAction('TICK')).toBeNull();
    expect(soundForAction('TOGGLE_AUTOMATION')).toBeNull();
  });

  it('never touches audio when disabled, and never throws when audio is unavailable', () => {
    expect(() => playSound('fanfare', false)).not.toThrow();
    expect(() => playSound('chime', true)).not.toThrow(); // no AudioContext in node: silently ignored
  });
});
