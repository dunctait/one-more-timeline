import { TIME_JUMP_MIN_RUNG, TIME_JUMP_MIN_YEAR, rungLevel } from '../src/engine/rules.js';
import type { TimelineState } from '../src/engine/types.js';

/** A timeline grown enough for the first Jumpback (or a challenge start) to be allowed. */
export function ripe<T extends TimelineState>(state: T): T {
  const rung = rungLevel(state.rung) >= rungLevel(TIME_JUMP_MIN_RUNG) ? state.rung : TIME_JUMP_MIN_RUNG;
  const year = Math.max(state.year, TIME_JUMP_MIN_YEAR);
  return { ...state, rung, year, tick: Math.max(state.tick, (year - 1) * 4) };
}
