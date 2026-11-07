import type { AccountBoost, BoostKind, UpgradeGroup } from '../api/types.ts';

export const MAX_BOOST_QUANTITY = 5;
export const BOOST_HOUR_MS = 3_600_000;

type BoostSpec = {
  label: string;
  multiplier: number;
  targetGroup: UpgradeGroup;
  groupLabel: string;
};

export const BOOST_SPECS: Record<BoostKind, BoostSpec> = {
  builder: {
    label: 'Booster tukang',
    multiplier: 10,
    targetGroup: 'home',
    groupLabel: 'Desa asal',
  },
  laboratory: {
    label: 'Booster laboratorium',
    multiplier: 24,
    targetGroup: 'laboratory',
    groupLabel: 'Laboratorium',
  },
  pet: {
    label: 'Booster pet',
    multiplier: 24,
    targetGroup: 'pet',
    groupLabel: 'Pet',
  },
};

export const UPGRADE_GROUPS: Array<{ id: UpgradeGroup; label: string }> = [
  { id: 'home', label: 'Desa asal' },
  { id: 'laboratory', label: 'Laboratorium' },
  { id: 'pet', label: 'Pet' },
  { id: 'builderBase', label: 'Desa tukang' },
];

const GROUP_BOOST_KIND: Partial<Record<UpgradeGroup, BoostKind>> = {
  home: 'builder',
  laboratory: 'laboratory',
  pet: 'pet',
};

export function getBoostKindForGroup(group: UpgradeGroup): BoostKind | null {
  return GROUP_BOOST_KIND[group] ?? null;
}

export function getNormalRemainingMs(
  endsAt: number,
  now: number,
  activeBoost: AccountBoost | undefined,
): number {
  if (endsAt <= now) return 0;

  if (!activeBoost || activeBoost.endsAt <= now) {
    return endsAt - now;
  }

  if (endsAt <= activeBoost.endsAt) {
    return (endsAt - now) * activeBoost.multiplier;
  }

  return (
    endsAt -
    activeBoost.endsAt +
    (activeBoost.endsAt - now) * activeBoost.multiplier
  );
}
