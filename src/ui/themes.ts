import { ACHIEVEMENTS } from '../engine/achievements.js';

export interface ThemeDef {
  id: string;
  name: string;
  /** Achievement that unlocks it; null means always available. */
  unlockedBy: string | null;
}

/** Cosmetic only: themes never affect the rules. */
export const THEMES: ThemeDef[] = [
  { id: 'ember', name: 'Ember', unlockedBy: null },
  { id: 'dusk', name: 'Dusk', unlockedBy: 'first_jump' },
  { id: 'verdant', name: 'Verdant', unlockedBy: 'rung_village' },
  { id: 'aurora', name: 'Aurora', unlockedBy: 'first_epoch' },
  { id: 'gilded', name: 'Gilded', unlockedBy: 'first_ascension' },
  { id: 'tundra', name: 'Tundra', unlockedBy: 'trophy_first' },
  { id: 'royal', name: 'Royal', unlockedBy: 'relic_all' },
];

export interface ThemeOption {
  id: string;
  name: string;
  unlocked: boolean;
  hint: string;
}

export function themeOptions(earned: readonly string[]): ThemeOption[] {
  return THEMES.map((t) => {
    const unlocked = t.unlockedBy === null || earned.includes(t.unlockedBy);
    const achievement = ACHIEVEMENTS.find((a) => a.id === t.unlockedBy);
    return {
      id: t.id,
      name: t.name,
      unlocked,
      hint: unlocked ? '' : `Earn the achievement "${achievement?.name ?? 'a locked achievement'}"`,
    };
  });
}

/** A chosen theme only applies if it is unlocked; otherwise fall back to the default. */
export function resolveTheme(chosen: string, earned: readonly string[]): string {
  const option = themeOptions(earned).find((t) => t.id === chosen);
  return option?.unlocked ? option.id : 'ember';
}
