import { RungId, TimelineState } from './types.js';
import { relicBonus } from './relics.js';
import { rungLevel } from './rules.js';

/**
 * Events are decisions, in two kinds.
 *
 * A TALE is timeless: it waits on the Events page until the player picks it up, and its wording never implies a
 * deadline, so answering it years later is just as valid. Tales weigh gains against each other, or spend one store
 * to gain another.
 *
 * An URGENT event is time-sensitive and (almost always) unwelcome: it stops the timeline until the player chooses
 * the lesser evil. Costs are shown beforehand, come out of what the player holds (never below zero), and only ever
 * happen because the player chose, so absence is still safe.
 */
export interface EventEffect {
  /** Positive gains and negative costs, written for a Gathering Band economy and scaled for later rungs. */
  food?: number;
  materials?: number;
  knowledge?: number;
  /** Stability and newcomers are never scaled, and never taken away. */
  stability?: number;
  people?: number;
}

export interface EventChoice extends EventEffect {
  label: string;
}

export type EventKind = 'tale' | 'urgent';

export interface EventDef {
  id: string;
  kind: EventKind;
  title: string;
  text: string;
  minRung: RungId;
  choices: EventChoice[];
}

const TALES: EventDef[] = [
  {
    id: 'night_hunters', kind: 'tale', title: 'Night Hunters', minRung: 'band',
    text: 'Some of the men like to hunt after dark, when the game comes down to the water.',
    choices: [
      { label: 'Let them hunt', materials: -6, food: 18 },
      { label: 'Keep them home', stability: 4 },
    ],
  },
  {
    id: 'berry_groves', kind: 'tale', title: 'Berry Groves', minRung: 'band',
    text: 'There are groves where the berries ripen thick every autumn.',
    choices: [
      { label: 'Gather them', food: 14 },
      { label: 'Dry them for later', food: 8, stability: 3 },
    ],
  },
  {
    id: 'strangers_at_the_fire', kind: 'tale', title: 'Strangers at the Fire', minRung: 'band',
    text: 'Travellers sometimes come to a warm fire and ask to share it.',
    choices: [
      { label: 'Welcome them', people: 1, stability: 2 },
      { label: 'Trade stories', knowledge: 7 },
    ],
  },
  {
    id: 'old_songs', kind: 'tale', title: 'The Old Songs', minRung: 'band',
    text: 'A people keeps its memory in song, and the old songs are never quite finished.',
    choices: [
      { label: 'Sing them together', stability: 7 },
      { label: 'Teach them to the young', knowledge: 6 },
    ],
  },
  {
    id: 'flint_seam', kind: 'tale', title: 'A Seam of Flint', minRung: 'settlement',
    text: 'The hills hold seams of fine flint, if someone cares to work them.',
    choices: [
      { label: 'Quarry it', materials: 16 },
      { label: 'Study the strata', knowledge: 10 },
      { label: 'Work it slowly', materials: 7, knowledge: 5 },
    ],
  },
  {
    id: 'river_fish', kind: 'tale', title: 'Silver in the River', minRung: 'settlement',
    text: 'In some years the river runs thick with fish, and a net is all it takes.',
    choices: [
      { label: 'Net them', food: 20 },
      { label: 'Smoke the catch', materials: -5, food: 26 },
    ],
  },
  {
    id: 'wise_elder', kind: 'tale', title: 'What the Elders Know', minRung: 'settlement',
    text: 'Elders remember things the young have never heard, and are glad to be asked.',
    choices: [
      { label: 'Sit and listen', knowledge: 11 },
      { label: 'Honour them', stability: 8 },
    ],
  },
  {
    id: 'harvest_rites', kind: 'tale', title: 'Harvest Rites', minRung: 'village',
    text: 'A feast after the harvest binds a people together, and the grain is there to be spent.',
    choices: [
      { label: 'Hold the feast', food: -14, stability: 12, knowledge: 6 },
      { label: 'Fill the stores', food: 18 },
    ],
  },
  {
    id: 'wandering_family', kind: 'tale', title: 'Families on the Road', minRung: 'village',
    text: 'Families on the road look for safe walls and a place to stay.',
    choices: [
      { label: 'Take them in', people: 2 },
      { label: 'Trade news and tools', materials: 14, knowledge: 4 },
    ],
  },
  {
    id: 'travelling_bards', kind: 'tale', title: 'Travelling Bards', minRung: 'village',
    text: 'Bards walk the roads between villages, trading songs for supper.',
    choices: [
      { label: 'Feed them well', food: -8, stability: 11 },
      { label: 'Learn their songs', knowledge: 9 },
    ],
  },
  {
    id: 'merchant_caravan', kind: 'tale', title: 'Merchant Caravans', minRung: 'town',
    text: 'Caravans come through walled towns, and will sell whatever there is a wish for.',
    choices: [
      { label: 'Buy tools', materials: 24 },
      { label: 'Buy grain', food: 24 },
      { label: 'Buy books', knowledge: 18 },
    ],
  },
  {
    id: 'old_ruins', kind: 'tale', title: 'Old Ruins', minRung: 'town',
    text: 'Walls from an earlier age lie under the fields, waiting for a spade.',
    choices: [
      { label: 'Salvage the stone', materials: 28 },
      { label: 'Dig carefully', knowledge: 22 },
    ],
  },
  {
    id: 'master_mason', kind: 'tale', title: 'A Master Mason', minRung: 'town',
    text: 'There are masons whose advice is worth a season of work, if fed and housed.',
    choices: [
      { label: 'Feed and house one', food: -10, materials: 30 },
      { label: 'Ask only for plans', knowledge: 14 },
    ],
  },
  {
    id: 'far_envoys', kind: 'tale', title: 'Envoys from Far Realms', minRung: 'city',
    text: 'Envoys travel far to meet great cities, and always bring something to offer.',
    choices: [
      { label: 'Accept their gold', materials: 22, food: 22 },
      { label: 'Accept their scholars', knowledge: 34 },
      { label: 'Accept a treaty', stability: 14, knowledge: 12 },
    ],
  },
  {
    id: 'great_migration', kind: 'tale', title: 'Great Migrations', minRung: 'city',
    text: 'Whole clans move toward cities that are famous, and ask at the gates.',
    choices: [
      { label: 'Welcome everyone', people: 3, stability: 5 },
      { label: 'Welcome the skilled', people: 1, knowledge: 18, materials: 12 },
    ],
  },
  {
    id: 'distant_library', kind: 'tale', title: 'A Distant Library', minRung: 'city',
    text: 'Far libraries will copy their best works for those who send the means.',
    choices: [
      { label: 'Send materials', materials: -20, knowledge: 40 },
      { label: 'Send nothing', stability: 4 },
    ],
  },
  {
    id: 'astral_alignment', kind: 'tale', title: 'The Alignment', minRung: 'realm',
    text: 'The heavens align as the astronomers foretold, and will again.',
    choices: [
      { label: 'Observe the sky', knowledge: 46 },
      { label: 'Hold a festival', stability: 14, food: 22 },
    ],
  },
  {
    id: 'imperial_tribute', kind: 'tale', title: 'Tribute of Lesser Realms', minRung: 'realm',
    text: 'Lesser realms owe a court like yours tribute, in whatever form is wanted.',
    choices: [
      { label: 'Ask for timber', materials: 44 },
      { label: 'Ask for grain', food: 44 },
      { label: 'Ask for learned men', knowledge: 36 },
    ],
  },
];

const URGENT: EventDef[] = [
  {
    id: 'wolves_at_the_stores', kind: 'urgent', title: 'Wolves at the Stores!', minRung: 'band',
    text: 'Wolves have found the food stores, and every moment they stay costs more.',
    choices: [
      { label: 'Drive them off', materials: -8 },
      { label: 'Let them eat', food: -14 },
    ],
  },
  {
    id: 'storm_front', kind: 'urgent', title: 'A Storm Is Coming', minRung: 'band',
    text: 'The sky is black to the west and the roofs are not ready.',
    choices: [
      { label: 'Reinforce the roofs', materials: -10 },
      { label: 'Ride it out', food: -6, knowledge: -5 },
    ],
  },
  {
    id: 'failing_fields', kind: 'urgent', title: 'The Fields Are Failing', minRung: 'settlement',
    text: 'Blight has reached the eastern fields, and the harvest will not wait.',
    choices: [
      { label: 'Cut and burn the blight', materials: -12 },
      { label: 'Ration the stores', food: -14 },
    ],
  },
  {
    id: 'fever_in_the_camp', kind: 'urgent', title: 'Fever in the Camp', minRung: 'settlement',
    text: 'A fever is moving from hearth to hearth.',
    choices: [
      { label: 'Buy herbs with knowledge', knowledge: -10 },
      { label: 'Nurse the sick with food', food: -14 },
    ],
  },
  {
    id: 'raiders_on_the_ridge', kind: 'urgent', title: 'Raiders on the Ridge', minRung: 'village',
    text: 'Armed riders sit on the ridge and send word that they want tribute.',
    choices: [
      { label: 'Pay in grain', food: -22 },
      { label: 'Pay in timber', materials: -18 },
      { label: 'Dig in and bar the gates', materials: -8, knowledge: -10 },
    ],
  },
  {
    id: 'fire_in_the_workshops', kind: 'urgent', title: 'Fire in the Workshops!', minRung: 'town',
    text: 'Flames have caught in the workshops, and the wind is rising.',
    choices: [
      { label: 'Fight it with everything', materials: -26 },
      { label: 'Save the tablets, let the rest burn', materials: -12, knowledge: -16 },
    ],
  },
  {
    id: 'cracking_hall', kind: 'urgent', title: 'The Great Hall Cracks', minRung: 'city',
    text: 'The great hall has started to crack along its central beam.',
    choices: [
      { label: 'Shore it up', materials: -40 },
      { label: 'Call the scholars to redraw it', knowledge: -34 },
    ],
  },
];

export const EVENTS: EventDef[] = [...TALES, ...URGENT];

export function getEvent(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}

/** Chances that a given year brings a tale or an urgent event. Tales wait for the player; urgent ones are rare. */
export const TALE_CHANCE = 0.03;
export const URGENT_CHANCE = 0.008;

/** At most this many tales wait at once; none arrive while the shelf is full, so nothing piles up. */
export const MAX_WAITING_TALES = 4;

/** Amounts are written for the rung that introduces an event, and grow by half again for each rung beyond it. */
export function eventScale(level: number, minRung: RungId): number {
  return 1 + 0.5 * Math.max(0, level - rungLevel(minRung));
}

/** Every timeline gets its own variation of the same seed, so no two timelines repeat their events. */
export function timelineSeed(seed: number, timelinesCreated = 0): number {
  return (seed + Math.imul(timelinesCreated, 7919)) >>> 0;
}

/** Deterministic hash in [0, 1) from the seed and tick; no hidden state. */
export function seededUnit(seed: number, tick: number, salt = 0): number {
  let h = (seed ^ Math.imul(tick + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

export interface RollOptions {
  /** Whether an urgent event may arrive now (never while one is pending or the player is away). */
  urgent?: boolean;
  /** Whether a tale may arrive now (never while the shelf is full). */
  tales?: boolean;
  /** Tales already waiting, so the same one never queues twice. */
  exclude?: readonly string[];
}

/** Events roll once per year, at the start of summer. Nothing happens to a hearth nobody has tended. */
export function rollEvent(
  state: Pick<TimelineState, 'seed' | 'rung'> & Partial<Pick<TimelineState, 'timelinesCreated' | 'relics'>>,
  tick: number,
  options: RollOptions = { urgent: true, tales: true }
): EventDef | null {
  if (tick % 4 !== 1) return null;
  const level = rungLevel(state.rung);
  if (level < 1) return null;
  const seed = timelineSeed(state.seed, state.timelinesCreated);
  const more = 1 + relicBonus(state.relics ?? [], 'eventChance');
  const roll = seededUnit(seed, tick);
  const urgentEdge = URGENT_CHANCE * more;
  const taleEdge = urgentEdge + TALE_CHANCE * more;
  let kind: EventKind | null = null;
  if (roll < urgentEdge) kind = 'urgent';
  else if (roll < taleEdge) kind = 'tale';
  if (!kind || (kind === 'urgent' && !options.urgent) || (kind === 'tale' && !options.tales)) return null;
  const pool = EVENTS.filter(
    (e) => e.kind === kind && rungLevel(e.minRung) <= level && !(options.exclude ?? []).includes(e.id)
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(seededUnit(seed, tick, 1) * pool.length)];
}
