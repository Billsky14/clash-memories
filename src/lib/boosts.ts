import type { AccountBoost, BoostKind, UpgradeGroup } from './types.ts';

export const MAX_BOOST_QUANTITY = 5;
export const BOOST_HOUR_MS = 3_600_000;

export type BoostSpec = {
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

const LABORATORY_CATEGORIES = new Set(['units', 'spells', 'siege_machines']);

export class BoostError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'BoostError';
    this.status = status;
  }
}

export function getBoostKindForGroup(group: UpgradeGroup): BoostKind | null {
  return GROUP_BOOST_KIND[group] ?? null;
}

export function isBoostKind(value: string): value is BoostKind {
  return Object.hasOwn(BOOST_SPECS, value);
}

export function getBoostSpec(kind: string): BoostSpec | null {
  return isBoostKind(kind) ? BOOST_SPECS[kind] : null;
}

export function getUpgradeGroup(base: string, category: string): UpgradeGroup {
  if (base === 'builder') return 'builderBase';
  if (category === 'pets') return 'pet';
  if (LABORATORY_CATEGORIES.has(category)) return 'laboratory';
  return 'home';
}

export function validateBoostQuantity(quantity: unknown): number {
  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_BOOST_QUANTITY
  ) {
    throw new BoostError(
      `Kuantitas booster harus berupa angka 1 sampai ${MAX_BOOST_QUANTITY}.`,
    );
  }

  return quantity;
}

export function getBoostDurationMs(quantity: number): number {
  return quantity * BOOST_HOUR_MS;
}

type ActiveBoostWindow = Pick<AccountBoost, 'endsAt' | 'multiplier'> | null | undefined;

export function getRemainingWorkMs(
  endsAt: number,
  now: number,
  activeBoost: ActiveBoostWindow,
): number {
  if (endsAt <= now) return 0;

  if (!activeBoost || activeBoost.endsAt <= now) {
    return endsAt - now;
  }

  if (endsAt <= activeBoost.endsAt) {
    return (endsAt - now) * activeBoost.multiplier;
  }

  return (
    endsAt - activeBoost.endsAt + (activeBoost.endsAt - now) * activeBoost.multiplier
  );
}

export function getBoostedRemainingMs(
  remainingMs: number,
  multiplier: number,
  durationMs: number,
): number {
  if (remainingMs <= 0) return 0;

  const boostedCapacityMs = durationMs * multiplier;

  if (remainingMs <= boostedCapacityMs) {
    return Math.ceil(remainingMs / multiplier);
  }

  return durationMs + (remainingMs - boostedCapacityMs);
}
