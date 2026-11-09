import { builder, home } from 'clash-of-clans-data';

type GameEntry = {
  dataId?: number;
  name?: string;
  base?: string;
  category?: string;
  levels?: Array<{ level?: number }>;
};

type QueryLike = {
  get: () => unknown[];
};

type CraftedDefenseEntry = GameEntry & {
  modules?: Array<{
    dataId?: number;
    name?: string;
  }>;
};

function toEntries(query: QueryLike): GameEntry[] {
  return query.get() as unknown as GameEntry[];
}

const homeData = home();
const builderData = builder();

const homeArmyBuildings = homeData.armyBuildings();
const homeOtherBuildings = homeData.otherBuildings();

const entries: GameEntry[] = [
  // `armyBuildings().get()` only returns Army Camp; the other buildings are
  // exposed through their own accessors. The same applies to otherBuildings().
  ...toEntries(homeArmyBuildings.armyCamp()),
  ...toEntries(homeArmyBuildings.barracks()),
  ...toEntries(homeArmyBuildings.darkBarracks()),
  ...toEntries(homeArmyBuildings.laboratory()),
  ...toEntries(homeArmyBuildings.spellFactory()),
  ...toEntries(homeArmyBuildings.darkSpellFactory()),
  ...toEntries(homeArmyBuildings.heroBanner()),
  ...toEntries(homeArmyBuildings.heroHall()),
  ...toEntries(homeArmyBuildings.blacksmith()),
  ...toEntries(homeArmyBuildings.workshop()),
  ...toEntries(homeArmyBuildings.petHouse()),
  ...toEntries(homeData.defenses()),
  ...toEntries(homeData.craftedDefenses()),
  ...toEntries(homeData.guardians()),
  ...toEntries(homeData.heroEquipment()),
  ...toEntries(homeData.heroes()),
  ...toEntries(homeData.traps()),
  ...toEntries(homeData.walls()),
  ...toEntries(homeData.townHall()),
  ...toEntries(homeData.resourceBuildings()),
  ...toEntries(homeData.spells()),
  ...toEntries(homeData.troops()),
  ...toEntries(homeData.pets()),
  ...toEntries(homeData.siegeMachines()),
  ...toEntries(homeOtherBuildings.bobsHut()),
  ...toEntries(homeOtherBuildings.helperHut()),
  ...toEntries(homeOtherBuildings.helpers()),
  ...toEntries(builderData.builderHall()),
  ...toEntries(builderData.defenses()),
  ...toEntries(builderData.traps()),
  ...toEntries(builderData.walls()),
  ...toEntries(builderData.resourceBuildings()),
  ...toEntries(builderData.armyBuildings()),
  ...toEntries(builderData.otherBuildings()),
  ...toEntries(builderData.troops()),
  ...toEntries(builderData.heroes()),
];

const moduleEntries: GameEntry[] = [];

for (const defense of homeData.craftedDefenses().get() as unknown as CraftedDefenseEntry[]) {
  for (const module of defense.modules ?? []) {
    if (typeof module.dataId !== 'number') continue;

    moduleEntries.push({
      dataId: module.dataId,
      name: `${defense.name ?? 'Crafted defense'} · ${module.name ?? 'Module'}`,
      base: 'home',
      category: 'crafted-defense',
    });
  }
}

const entriesByKey = new Map<string, GameEntry>();

for (const entry of [...entries, ...moduleEntries]) {
  if (typeof entry.dataId !== 'number' || !entry.name) continue;

  const base = entry.base === 'builder' ? 'builder' : 'home';
  entriesByKey.set(`${base}:${entry.dataId}`, entry);
}

const categoryLabels: Record<string, string> = {
  buildings: 'Bangunan',
  traps: 'Trap',
  units: 'Pasukan',
  pets: 'Peliharaan',
  heroes: 'Hero',
  spells: 'Sihir',
  siege_machines: 'Mesin pengepung',
  equipment: 'Equipment',
  guardians: 'Guardian',
  helpers: 'Helper',
  walls: 'Wall',
  'crafted-defenses': 'Pertahanan crafted',
};

export function getGameName(base: string, dataId: number): string {
  const key = `${base === 'builder' ? 'builder' : 'home'}:${dataId}`;
  return entriesByKey.get(key)?.name ?? `Upgrade #${dataId}`;
}

export function getNextLevel(base: string, dataId: number, currentLevel: number): number {
  const key = `${base === 'builder' ? 'builder' : 'home'}:${dataId}`;
  const levels = entriesByKey.get(key)?.levels;

  if (!levels || levels.length === 0) return currentLevel + 1;

  let nextLevel = Number.POSITIVE_INFINITY;

  for (const entry of levels) {
    if (
      typeof entry.level === 'number' &&
      entry.level > currentLevel &&
      entry.level < nextLevel
    ) {
      nextLevel = entry.level;
    }
  }

  return Number.isFinite(nextLevel) ? nextLevel : currentLevel + 1;
}

export function getCategoryLabel(category: string): string {
  if (categoryLabels[category]) return categoryLabels[category];

  if (category.endsWith('2')) {
    const baseCategory = category.slice(0, -1);
    return `${categoryLabels[baseCategory] ?? baseCategory} (BB)`;
  }

  return category;
}
