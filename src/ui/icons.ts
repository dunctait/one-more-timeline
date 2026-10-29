/**
 * One small visual language for the whole interface, in the way board games say a lot with a few symbols.
 * Text is for names and for sentences a player must read once; everything repeated is an icon plus a number.
 */
export const ICON = {
  food: '🌾',
  materials: '🪵',
  knowledge: '✨',
  population: '👥',
  stability: '🛡️',
  everything: '⭐',
  storage: '📦',
  builder: '🔨',
  time: '⏱',
  locked: '🔒',
} as const;

export interface Chip {
  icon: string;
  text: string;
  /** Full plain-language reading, for hover and screen readers. */
  title: string;
}

export type ResourceKey = 'food' | 'materials' | 'knowledge';
