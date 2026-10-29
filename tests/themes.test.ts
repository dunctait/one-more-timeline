import { describe, expect, it } from 'vitest';
import { resolveTheme, themeOptions, THEMES } from '../src/ui/themes.js';
import { ACHIEVEMENTS } from '../src/engine/achievements.js';

describe('themes', () => {
  it('are unlocked by real achievements', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    THEMES.forEach((t) => expect(t.unlockedBy === null || ids.includes(t.unlockedBy)).toBe(true));
  });

  it('start with only the default open and explain how to unlock the rest', () => {
    const options = themeOptions([]);
    expect(options.filter((o) => o.unlocked).map((o) => o.id)).toEqual(['ember']);
    expect(options.find((o) => o.id === 'dusk')?.hint).toContain('First Leap');
  });

  it('never apply a locked theme', () => {
    expect(resolveTheme('gilded', [])).toBe('ember');
    expect(resolveTheme('gilded', ['first_ascension'])).toBe('gilded');
    expect(resolveTheme('nonsense', ['first_jump'])).toBe('ember');
  });
});
