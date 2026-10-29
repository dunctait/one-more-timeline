import { BUILDING_IDS, RUNG_ORDER, RUNGS } from './rules.js';
import { DISCOVERIES } from './discoveries.js';
import { RELICS } from './relics.js';
import { RungId, TimelineState } from './types.js';

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  /** Plain-language goal, shown before and after it is earned. */
  description: string;
  check: (s: TimelineState) => boolean;
  /** Optional live progress as [current, target]. */
  progress?: (s: TimelineState) => [number, number];
}

const BASE_DISCOVERIES = DISCOVERIES.filter((d) => !d.requires);

const totalBuildings = (s: TimelineState): number =>
  BUILDING_IDS.reduce((sum, id) => sum + s.buildings[id], 0);

const rungAchievement = (rung: RungId, icon: string): AchievementDef => ({
  id: `rung_${rung}`,
  name: RUNGS[rung].name,
  icon,
  description: `Reach the ${RUNGS[rung].name} rung.`,
  check: (s) => RUNG_ORDER.indexOf(s.rung) >= RUNG_ORDER.indexOf(rung),
});

const yearAchievement = (year: number, name: string, icon: string): AchievementDef => ({
  id: `year_${year}`,
  name,
  icon,
  description: `Reach Year ${year} in any timeline.`,
  check: (s) => s.furthestYear >= year,
  progress: (s) => [Math.min(s.furthestYear, year), year],
});

export const ACHIEVEMENTS: AchievementDef[] = [
  rungAchievement('band', '🔥'),
  rungAchievement('settlement', '⛺'),
  rungAchievement('village', '🏘️'),
  rungAchievement('town', '🧱'),
  rungAchievement('city', '🏙️'),
  rungAchievement('realm', '👑'),
  yearAchievement(10, 'First Decade', '📅'),
  yearAchievement(25, 'Quarter Century', '🕰️'),
  yearAchievement(50, 'Half a Century', '⌛'),
  yearAchievement(100, 'A Hundred Winters', '❄️'),
  {
    id: 'pop_10',
    name: 'A Crowd Around the Fire',
    icon: '👥',
    description: 'Have 10 people at once.',
    check: (s) => s.population.total >= 10,
    progress: (s) => [Math.min(s.population.total, 10), 10],
  },
  {
    id: 'pop_30',
    name: 'Bustling Streets',
    icon: '🚶',
    description: 'Have 30 people at once.',
    check: (s) => s.population.total >= 30,
    progress: (s) => [Math.min(s.population.total, 30), 30],
  },
  {
    id: 'pop_60',
    name: 'A Living City',
    icon: '🌆',
    description: 'Have 60 people at once.',
    check: (s) => s.population.total >= 60,
    progress: (s) => [Math.min(s.population.total, 60), 60],
  },
  {
    id: 'build_10',
    name: 'Foundations',
    icon: '🔨',
    description: 'Have 10 buildings standing in one timeline.',
    check: (s) => totalBuildings(s) >= 10,
    progress: (s) => [Math.min(totalBuildings(s), 10), 10],
  },
  {
    id: 'build_50',
    name: 'Master Builders',
    icon: '🏗️',
    description: 'Have 50 buildings standing in one timeline.',
    check: (s) => totalBuildings(s) >= 50,
    progress: (s) => [Math.min(totalBuildings(s), 50), 50],
  },
  {
    id: 'build_all',
    name: 'One of Everything',
    icon: '🗺️',
    description: 'Have at least one of every kind of building at the same time.',
    check: (s) => BUILDING_IDS.every((id) => s.buildings[id] > 0),
    progress: (s) => [BUILDING_IDS.filter((id) => s.buildings[id] > 0).length, BUILDING_IDS.length],
  },
  {
    id: 'insight_25',
    name: 'Memory of Ages',
    icon: '✨',
    description: 'Hold 25 Insight at once.',
    check: (s) => s.insight >= 25,
    progress: (s) => [Math.min(s.insight, 25), 25],
  },
  {
    id: 'first_jump',
    name: 'First Leap',
    icon: '🌀',
    description: 'Perform your first Time Jump.',
    check: (s) => s.prestigeCounts[1] >= 1,
  },
  {
    id: 'timelines_5',
    name: 'Many Timelines',
    icon: '🧵',
    description: 'Begin 5 timelines.',
    check: (s) => s.timelinesCreated >= 5,
    progress: (s) => [Math.min(s.timelinesCreated, 5), 5],
  },
  {
    id: 'relic_first',
    name: 'Treasure Hunter',
    icon: '🏺',
    description: 'Find your first relic.',
    check: (s) => s.relics.length >= 1,
  },
  {
    id: 'relic_all',
    name: 'Keeper of Relics',
    icon: '👑',
    description: 'Collect every relic and trophy.',
    check: (s) => s.relics.length >= RELICS.length,
    progress: (s) => [Math.min(s.relics.length, RELICS.length), RELICS.length],
  },
  {
    id: 'trophy_first',
    name: 'Challenger',
    icon: '🏁',
    description: 'Complete your first challenge.',
    check: (s) => s.relics.some((id) => RELICS.find((r) => r.id === id)?.trophyOf),
  },
  {
    id: 'trophy_all',
    name: 'Undaunted',
    icon: '🏆',
    description: 'Complete every challenge.',
    check: (s) => RELICS.filter((r) => r.trophyOf).every((r) => s.relics.includes(r.id)),
    progress: (s) => [
      RELICS.filter((r) => r.trophyOf && s.relics.includes(r.id)).length,
      RELICS.filter((r) => r.trophyOf).length,
    ],
  },
  {
    id: 'wonder_first',
    name: 'Wonder Builder',
    icon: '🗿',
    description: 'Build your first Wonder.',
    check: (s) =>
      (['great_hearth_hall', 'standing_stones', 'triumphal_arch', 'colossus', 'wonder_of_ages'] as const).some(
        (id) => s.buildings[id] > 0
      ),
  },
  {
    id: 'wonder_all',
    name: 'Seven Wonders, Almost',
    icon: '🌟',
    description: 'Have all five Wonders standing in one timeline.',
    check: (s) =>
      (['great_hearth_hall', 'standing_stones', 'triumphal_arch', 'colossus', 'wonder_of_ages'] as const).every(
        (id) => s.buildings[id] > 0
      ),
  },
  {
    id: 'discover_all',
    name: 'Scholar of Ages',
    icon: '🔭',
    description: 'Know every everyday Discovery (not the legacy ones) in a single timeline.',
    check: (s) => BASE_DISCOVERIES.every((d) => s.discoveries.includes(d.id)),
    progress: (s) => [BASE_DISCOVERIES.filter((d) => s.discoveries.includes(d.id)).length, BASE_DISCOVERIES.length],
  },
  {
    id: 'gathers_500',
    name: 'Busy Hands',
    icon: '✋',
    description: 'Gather by hand 500 times, across all timelines.',
    check: (s) => s.stats.gathers >= 500,
    progress: (s) => [Math.min(s.stats.gathers, 500), 500],
  },
  {
    id: 'ticks_7200',
    name: 'Two Hours Together',
    icon: '🕰️',
    description: 'Live through two hours of timeline in total (7,200 ticks).',
    check: (s) => s.stats.ticks >= 7200,
    progress: (s) => [Math.min(s.stats.ticks, 7200), 7200],
  },
  {
    id: 'built_250',
    name: 'A Thousand Bricks',
    icon: '🧱',
    description: 'Build 250 buildings, across all timelines.',
    check: (s) => s.stats.built >= 250,
    progress: (s) => [Math.min(s.stats.built, 250), 250],
  },
  {
    id: 'traded_25',
    name: 'Fair Dealer',
    icon: '⚖️',
    description: 'Complete 25 trades at the marketplace.',
    check: (s) => s.stats.traded >= 25,
    progress: (s) => [Math.min(s.stats.traded, 25), 25],
  },
  {
    id: 'first_epoch',
    name: 'A New Epoch',
    icon: '🌅',
    description: 'Perform your first Epoch Shift.',
    check: (s) => s.prestigeCounts[2] >= 1,
  },
  {
    id: 'echoes_25',
    name: 'A Chorus of Echoes',
    icon: '🎶',
    description: 'Hold 25 Echoes at once.',
    check: (s) => s.echoes >= 25,
    progress: (s) => [Math.min(s.echoes, 25), 25],
  },
  {
    id: 'echoes_100',
    name: 'Echoes Without End',
    icon: '🌌',
    description: 'Hold 100 Echoes at once.',
    check: (s) => s.echoes >= 100,
    progress: (s) => [Math.min(s.echoes, 100), 100],
  },
  {
    id: 'resonance_5',
    name: 'Perfect Pitch',
    icon: '🎼',
    description: 'Hold 5 Resonance at once.',
    check: (s) => s.resonance >= 5,
    progress: (s) => [Math.min(s.resonance, 5), 5],
  },
  {
    id: 'eternity_3',
    name: 'Three Marks',
    icon: '✳️',
    description: 'Hold 3 Eternity Marks at once.',
    check: (s) => s.eternity >= 3,
    progress: (s) => [Math.min(s.eternity, 3), 3],
  },
  {
    id: 'eternity_10',
    name: 'The Last Timeline',
    icon: '🪐',
    description: 'Hold 10 Eternity Marks at once.',
    check: (s) => s.eternity >= 10,
    progress: (s) => [Math.min(s.eternity, 10), 10],
  },
  {
    id: 'first_paradigm',
    name: 'Paradigm Pioneer',
    icon: '🔮',
    description: 'Perform your first Paradigm Shift.',
    check: (s) => s.prestigeCounts[3] >= 1,
  },
  {
    id: 'first_ascension',
    name: 'Beyond Time',
    icon: '♾️',
    description: 'Ascend for the first time.',
    check: (s) => s.prestigeCounts[4] >= 1,
  },
];

export function findNewAchievements(state: TimelineState): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !state.achievements.includes(a.id) && a.check(state));
}
