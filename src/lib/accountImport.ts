import {
  BOOST_HOUR_MS,
  BOOST_SPECS,
  getBoostedRemainingMs,
  getUpgradeGroup,
} from './boosts.ts';
import type { BoostKind } from './types.ts';

const ACCOUNT_TAG_PATTERN = /^#[0-9A-Z]{3,15}$/;
const TOWN_HALL_DATA_ID = 1_000_001;

const EXPORT_BOOST_FIELDS: ReadonlyArray<{ field: string; kind: BoostKind }> = [
  { field: 'builder_boost', kind: 'builder' },
  { field: 'lab_boost', kind: 'laboratory' },
  { field: 'pet_boost', kind: 'pet' },
];

export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportValidationError';
  }
}

export type ParsedUpgrade = {
  category: string;
  base: string;
  dataId: number;
  level: number;
  remainingSeconds: number;
  helperRecurrent: boolean;
  extra: boolean;
  endsAt: number;
};

export type ParsedBoost = {
  kind: BoostKind;
  multiplier: number;
  quantity: number;
  remainingSeconds: number;
  startedAt: number;
  endsAt: number;
};

export type ParsedAccountImport = {
  tag: string;
  townHall: number | null;
  sourceTimestamp: number | null;
  upgrades: ParsedUpgrade[];
  boosts: ParsedBoost[];
};

type CollectedUpgrade = Omit<ParsedUpgrade, 'endsAt'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const compact = value.trim().toUpperCase();
  if (!compact) return null;

  const tag = compact.startsWith('#') ? compact : `#${compact}`;
  return ACCOUNT_TAG_PATTERN.test(tag) ? tag : null;
}

export function getBaseForCategory(category: string): 'home' | 'builder' {
  return category.endsWith('2') ? 'builder' : 'home';
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getSnapshotTime(timestamp: number | null): number | null {
  if (timestamp === null || timestamp <= 0) return null;

  // The usual export uses epoch seconds; accept epoch milliseconds too.
  return timestamp >= 1_000_000_000_000 ? timestamp : timestamp * 1000;
}

function extractBoosts(value: unknown, referenceTime: number): ParsedBoost[] {
  if (!isRecord(value)) return [];

  const boosts: ParsedBoost[] = [];

  for (const { field, kind } of EXPORT_BOOST_FIELDS) {
    const raw = value[field];

    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) continue;

    const remainingSeconds = Math.round(raw);
    if (remainingSeconds <= 0) continue;

    const spec = BOOST_SPECS[kind];
    const quantity = Math.max(
      1,
      Math.ceil(remainingSeconds / (BOOST_HOUR_MS / 1000)),
    );
    const endsAt = referenceTime + remainingSeconds * 1000;

    boosts.push({
      kind,
      multiplier: spec.multiplier,
      quantity,
      remainingSeconds,
      startedAt: endsAt - quantity * BOOST_HOUR_MS,
      endsAt,
    });
  }

  return boosts;
}

function getImportEndsAt(
  upgrade: CollectedUpgrade,
  boosts: ParsedBoost[],
  referenceTime: number,
): number {
  const group = getUpgradeGroup(upgrade.base, upgrade.category);
  const boost = boosts.find(
    (candidate) => BOOST_SPECS[candidate.kind].targetGroup === group,
  );
  const remainingMs = upgrade.remainingSeconds * 1000;

  if (!boost) return referenceTime + remainingMs;

  return (
    referenceTime +
    getBoostedRemainingMs(
      remainingMs,
      boost.multiplier,
      boost.remainingSeconds * 1000,
    )
  );
}

function collectEntry(value: unknown, category: string, output: CollectedUpgrade[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectEntry(item, category, output);
    return;
  }

  if (!isRecord(value)) return;

  const timer = value.timer;
  const dataId = value.data;

  if (
    typeof timer === 'number' &&
    Number.isFinite(timer) &&
    timer > 0 &&
    typeof dataId === 'number' &&
    Number.isFinite(dataId)
  ) {
    output.push({
      category,
      base: getBaseForCategory(category),
      dataId,
      level: typeof value.lvl === 'number' && Number.isFinite(value.lvl) ? value.lvl : 0,
      remainingSeconds: Math.round(timer),
      helperRecurrent: value.helper_recurrent === true,
      extra: value.extra === true,
    });
  }

  for (const nestedKey of ['types', 'modules']) {
    const nested = value[nestedKey];
    if (Array.isArray(nested)) {
      collectEntry(nested, category, output);
    }
  }
}

export function extractTownHall(payload: Record<string, unknown>): number | null {
  const buildings = payload.buildings;
  if (!Array.isArray(buildings)) return null;

  let townHall: number | null = null;

  for (const entry of buildings) {
    if (!isRecord(entry)) continue;
    if (entry.data !== TOWN_HALL_DATA_ID) continue;
    if (typeof entry.lvl !== 'number' || !Number.isFinite(entry.lvl)) continue;

    townHall = townHall === null ? entry.lvl : Math.max(townHall, entry.lvl);
  }

  return townHall;
}

export function parseAccountImport(payload: unknown, now = Date.now()): ParsedAccountImport {
  if (!isRecord(payload)) {
    throw new ImportValidationError('JSON harus berupa objek akun.');
  }

  const tag = normalizeTag(payload.tag);
  if (!tag) {
    throw new ImportValidationError('Tag akun tidak ditemukan atau tidak valid.');
  }

  const upgrades: CollectedUpgrade[] = [];

  for (const [category, value] of Object.entries(payload)) {
    // Equipment upgrades have no build timer, so they are never tracked.
    if (category.startsWith('equipment')) continue;
    if (Array.isArray(value)) collectEntry(value, category, upgrades);
  }

  const sourceTimestamp = toFiniteNumber(payload.timestamp);
  const snapshotTime = getSnapshotTime(sourceTimestamp);
  const referenceTime = snapshotTime ?? now;
  const boosts = extractBoosts(payload.boosts, referenceTime);

  return {
    tag,
    townHall: extractTownHall(payload),
    sourceTimestamp,
    boosts,
    upgrades: upgrades
      .map((upgrade) => ({
        ...upgrade,
        endsAt: getImportEndsAt(upgrade, boosts, referenceTime),
      }))
      .filter((upgrade) => upgrade.endsAt > now),
  };
}
