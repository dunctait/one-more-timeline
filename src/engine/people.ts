import { seededUnit } from './events.js';

const GIVEN = [
  'Aela', 'Brannoc', 'Cori', 'Dunmar', 'Esk', 'Fenna', 'Garrow', 'Hesta', 'Ivor', 'Jessa',
  'Kellan', 'Lira', 'Maro', 'Nessa', 'Orin', 'Pell', 'Quill', 'Rowan', 'Sabel', 'Tamsin',
  'Ulric', 'Vesna', 'Wren', 'Xanthe', 'Yarrow', 'Zephyr', 'Alder', 'Bryn', 'Calla', 'Dov',
  'Elowen', 'Finn', 'Gwen', 'Hale', 'Isolde', 'Joss', 'Kerr', 'Lorne', 'Mira', 'Nolan',
];

const EPITHETS = [
  'the Quick', 'the Patient', 'the Curious', 'the Steady', 'the Cheerful', 'the Careful',
  'Fireward', 'Stonehand', 'Brightpath', 'Longstride', 'Softspoken', 'Keen-eyed',
];

/** A stable name for the Nth person in a timeline; never stored, always the same for a seed. */
export function personName(seed: number, index: number): string {
  const given = GIVEN[Math.floor(seededUnit(seed, index, 11) * GIVEN.length)];
  const epithet = EPITHETS[Math.floor(seededUnit(seed, index, 13) * EPITHETS.length)];
  return `${given} ${epithet}`;
}
