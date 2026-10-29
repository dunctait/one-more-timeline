import { BuildingId, RoleId, RungId } from './types.js';

export interface ChallengeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Roles nobody may be assigned to while the challenge is active. */
  noRoles?: RoleId[];
  /** Buildings that may not be built while the challenge is active. */
  noBuildings?: BuildingId[];
  /** Reach this rung to complete the challenge. */
  goalRung: RungId;
  /** Optional time limit: running past this year ends the challenge (nothing is lost). */
  maxYear?: number;
  /** Relic awarded on completion. */
  reward: string;
}

/**
 * Challenges are optional. Starting one begins a new timeline with every permanent
 * bonus intact; completing one awards a trophy relic forever. Failing or abandoning
 * one costs nothing and simply returns the timeline to normal play.
 */
export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'lone_hearth',
    name: 'Lone Hearth',
    icon: '🔥',
    description: 'Nobody may be a Forager. Reach Dawn Village on manual foraging and stores alone.',
    noRoles: ['forager'],
    goalRung: 'village',
    reward: 'hermits_lantern',
  },
  {
    id: 'quiet_scholars',
    name: 'Quiet Scholars',
    icon: '🤫',
    description: 'Nobody may be a Scholar. Reach the Walled Town by building knowledge instead.',
    noRoles: ['scholar'],
    goalRung: 'town',
    reward: 'silent_quill',
  },
  {
    id: 'cold_resolve',
    name: 'Cold Resolve',
    icon: '❄️',
    description: 'No Eternal Fire Pits and no Healers. Reach the Walled Town in the cold.',
    noRoles: ['healer'],
    noBuildings: ['fire_pit'],
    goalRung: 'town',
    reward: 'ember_pendant',
  },
  {
    id: 'hands_only',
    name: 'Hands Only',
    icon: '🖐️',
    description: 'Nobody may be a Builder. Reach Dawn Village with scavenging and a clever eye.',
    noRoles: ['builder'],
    goalRung: 'village',
    reward: 'calloused_gloves',
  },
  {
    id: 'grand_plan',
    name: 'Grand Plan',
    icon: '📐',
    description: 'Reach the Trade City before Year 240.',
    goalRung: 'city',
    maxYear: 239,
    reward: 'architects_rule',
  },
  {
    id: 'royal_road',
    name: 'Royal Road',
    icon: '👑',
    description: 'Reach the Sovereign Realm before Year 440.',
    goalRung: 'realm',
    maxYear: 439,
    reward: 'crown_of_haste',
  },
  {
    id: 'swift_dawn',
    name: 'Swift Dawn',
    icon: '👟',
    description: 'Reach Dawn Village before Year 52.',
    goalRung: 'village',
    maxYear: 51,
    reward: 'swift_sandals',
  },
];

export function getChallenge(id: string): ChallengeDef | undefined {
  return CHALLENGES.find((c) => c.id === id);
}
