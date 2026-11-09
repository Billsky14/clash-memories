import { describe, expect, it } from 'vitest';
import {
  ImportValidationError,
  normalizeTag,
  parseAccountImport,
} from '../src/lib/accountImport.ts';

const SNAPSHOT_TIMESTAMP = 1_794_030_373;
const NOW = (SNAPSHOT_TIMESTAMP + 15 * 60) * 1000;

const payload = {
  tag: 'pr88uuyql',
  timestamp: SNAPSHOT_TIMESTAMP,
  helpers: [
    { data: 93000000, lvl: 2, helper_cooldown: 3199 },
    { data: 93000001, lvl: 9, helper_cooldown: 3199 },
  ],
  buildings: [
    { data: 1000023, lvl: 10, timer: 167294 },
    { data: 1000023, lvl: 10, timer: 177421 },
    { data: 1000023, lvl: 10, timer: 125479 },
    { data: 1000013, lvl: 16, gear_up: 1 },
    { data: 1000001, lvl: 18, cnt: 1 },
  ],
  traps: [
    { data: 12000000, lvl: 11, timer: 42576, extra: true },
    { data: 12000002, lvl: 11, timer: 158600, helper_recurrent: true },
    { data: 12000002, lvl: 9, timer: 52190 },
    { data: 12000002, lvl: 10, timer: 64820 },
  ],
  units: [{ data: 4000023, lvl: 11, timer: 276310, helper_recurrent: true }],
  pets: [{ data: 73000007, lvl: 13, timer: 329294 }],
  boosts: { clocktower_cooldown: 64984 },
};

describe('parseAccountImport', () => {
  it('adds a hash and uppercases the tag', () => {
    expect(normalizeTag('pr88uuyql')).toBe('#PR88UUYQL');
    expect(normalizeTag('#PR88UUYQL')).toBe('#PR88UUYQL');
    expect(normalizeTag('')).toBeNull();
    expect(normalizeTag('not a tag!')).toBeNull();
    expect(normalizeTag(undefined)).toBeNull();
  });

  it('extracts active upgrades and account metadata', () => {
    const result = parseAccountImport(payload, NOW);

    expect(result.tag).toBe('#PR88UUYQL');
    expect(result.townHall).toBe(18);
    expect(result.sourceTimestamp).toBe(SNAPSHOT_TIMESTAMP);
    expect(result.upgrades).toHaveLength(9);

    expect(result.upgrades.map((upgrade) => upgrade.remainingSeconds)).toEqual([
      167294, 177421, 125479, 42576, 158600, 52190, 64820, 276310, 329294,
    ]);

    expect(result.upgrades[0].endsAt).toBe(SNAPSHOT_TIMESTAMP * 1000 + 167294000);
    expect(result.upgrades[0].base).toBe('home');

    const bomb = result.upgrades.find((upgrade) => upgrade.dataId === 12000000);
    expect(bomb?.extra).toBe(true);

    const assistedGiantBomb = result.upgrades.find(
      (upgrade) => upgrade.dataId === 12000002 && upgrade.level === 11,
    );
    expect(assistedGiantBomb?.helperRecurrent).toBe(true);
  });

  it('preserves building data ids and levels from the pasted snapshot', () => {
    const result = parseAccountImport(
      {
        tag: '#ABC123',
        buildings: [
          { data: 1000068, lvl: 11, timer: 3600 },
          { data: 1000006, lvl: 18, timer: 3600 },
          { data: 1000007, lvl: 13, timer: 3600 },
        ],
      },
      NOW,
    );

    expect(
      result.upgrades.map(({ dataId, level, category, base }) => ({
        dataId,
        level,
        category,
        base,
      })),
    ).toEqual([
      { dataId: 1000068, level: 11, category: 'buildings', base: 'home' },
      { dataId: 1000006, level: 18, category: 'buildings', base: 'home' },
      { dataId: 1000007, level: 13, category: 'buildings', base: 'home' },
    ]);
  });

  it('anchors countdowns to the snapshot timestamp instead of import time', () => {
    const snapshotSeconds = NOW / 1000 - 3600;
    const result = parseAccountImport(
      {
        tag: '#ABC123',
        timestamp: snapshotSeconds,
        buildings: [{ data: 1000004, lvl: 16, timer: 7200 }],
      },
      NOW,
    );

    expect(result.upgrades).toHaveLength(1);
    expect(result.upgrades[0].endsAt).toBe(snapshotSeconds * 1000 + 7200_000);
    expect(result.upgrades[0].endsAt - NOW).toBe(3600_000);
  });

  it('drops upgrades that finished between the snapshot and the import', () => {
    const result = parseAccountImport(
      {
        tag: '#ABC123',
        timestamp: NOW / 1000 - 3600,
        buildings: [{ data: 1000004, lvl: 16, timer: 1800 }],
      },
      NOW,
    );

    expect(result.upgrades).toEqual([]);
  });

  it('compresses home timers with the exported builder potion', () => {
    const result = parseAccountImport(
      {
        tag: '#PPYJV8QCR',
        timestamp: SNAPSHOT_TIMESTAMP,
        buildings: [{ data: 1000071, lvl: 10, timer: 135042 }],
        units: [{ data: 4000008, lvl: 10, timer: 135042 }],
        pets: [{ data: 73000004, lvl: 8, timer: 135042 }],
        buildings2: [{ data: 1000036, lvl: 7, timer: 135042 }],
        boosts: { builder_boost: 4102 },
      },
      NOW,
    );

    expect(result.boosts).toEqual([
      {
        kind: 'builder',
        multiplier: 10,
        quantity: 2,
        remainingSeconds: 4102,
        startedAt: (SNAPSHOT_TIMESTAMP + 4102 - 7200) * 1000,
        endsAt: (SNAPSHOT_TIMESTAMP + 4102) * 1000,
      },
    ]);

    const home = result.upgrades.find(
      (upgrade) => upgrade.category === 'buildings',
    );
    const lab = result.upgrades.find((upgrade) => upgrade.category === 'units');
    const pet = result.upgrades.find((upgrade) => upgrade.category === 'pets');
    const builderBase = result.upgrades.find(
      (upgrade) => upgrade.category === 'buildings2',
    );

    expect(home?.remainingSeconds).toBe(135042);
    expect(home?.endsAt).toBe((SNAPSHOT_TIMESTAMP + 98124) * 1000);
    expect(lab?.endsAt).toBe((SNAPSHOT_TIMESTAMP + 135042) * 1000);
    expect(pet?.endsAt).toBe((SNAPSHOT_TIMESTAMP + 135042) * 1000);
    expect(builderBase?.endsAt).toBe(
      (SNAPSHOT_TIMESTAMP + 135042) * 1000,
    );
  });

  it('maps lab and pet potions to their own groups', () => {
    const result = parseAccountImport(
      {
        tag: '#ABC123',
        timestamp: SNAPSHOT_TIMESTAMP,
        buildings: [{ data: 1000004, lvl: 16, timer: 10000 }],
        units: [{ data: 4000008, lvl: 10, timer: 86400 }],
        pets: [{ data: 73000004, lvl: 8, timer: 43200 }],
        boosts: { lab_boost: 3600, pet_boost: 1800 },
      },
      NOW,
    );

    expect(result.boosts.map((boost) => boost.kind)).toEqual([
      'laboratory',
      'pet',
    ]);

    const home = result.upgrades.find(
      (upgrade) => upgrade.category === 'buildings',
    );
    const lab = result.upgrades.find((upgrade) => upgrade.category === 'units');
    const pet = result.upgrades.find((upgrade) => upgrade.category === 'pets');

    expect(home?.endsAt).toBe((SNAPSHOT_TIMESTAMP + 10000) * 1000);
    expect(lab?.endsAt).toBe((SNAPSHOT_TIMESTAMP + 3600) * 1000);
    expect(pet?.endsAt).toBe((SNAPSHOT_TIMESTAMP + 1800) * 1000);
  });

  it('ignores invalid and unrelated boost values', () => {
    const result = parseAccountImport(
      {
        tag: '#ABC123',
        timestamp: SNAPSHOT_TIMESTAMP,
        buildings: [{ data: 1000004, lvl: 16, timer: 7200 }],
        boosts: {
          builder_boost: 0,
          lab_boost: '3600',
          pet_boost: -1,
          clocktower_boost: 999,
          builder_consumable: 120,
          helper_cooldown: 50,
        },
      },
      NOW,
    );

    expect(result.boosts).toEqual([]);
    expect(result.upgrades[0].endsAt).toBe(
      (SNAPSHOT_TIMESTAMP + 7200) * 1000,
    );
  });

  it('falls back to import time when the snapshot timestamp is missing', () => {
    const result = parseAccountImport(
      {
        tag: '#ABC123',
        buildings: [{ data: 1000004, lvl: 16, timer: 60 }],
      },
      NOW,
    );

    expect(result.sourceTimestamp).toBeNull();
    expect(result.upgrades[0].endsAt).toBe(NOW + 60_000);
  });

  it('accepts a snapshot timestamp in milliseconds', () => {
    const result = parseAccountImport(
      {
        tag: '#ABC123',
        timestamp: SNAPSHOT_TIMESTAMP * 1000,
        buildings: [{ data: 1000004, lvl: 16, timer: 3600 }],
      },
      NOW,
    );

    expect(result.upgrades[0].endsAt).toBe(SNAPSHOT_TIMESTAMP * 1000 + 3600_000);
  });

  it('ignores helper cooldowns, gear ups without timers, and non-upgrade data', () => {
    const result = parseAccountImport(payload, NOW);

    expect(result.upgrades.some((upgrade) => upgrade.dataId === 93000000)).toBe(false);
    expect(result.upgrades.some((upgrade) => upgrade.dataId === 1000013)).toBe(false);
    expect(result.upgrades.some((upgrade) => upgrade.category === 'boosts')).toBe(false);
    expect(result.boosts).toEqual([]);
  });

  it('uses builder base for categories ending in 2', () => {
    const result = parseAccountImport(
      {
        tag: '#ABC123',
        buildings2: [{ data: 4000031, lvl: 20, timer: 3600 }],
      },
      NOW,
    );

    expect(result.upgrades).toHaveLength(1);
    expect(result.upgrades[0].base).toBe('builder');
    expect(result.upgrades[0].category).toBe('buildings2');
  });

  it('finds timers nested inside crafted defense modules', () => {
    const result = parseAccountImport(
      {
        tag: '#ABC123',
        buildings: [
          {
            data: 1000097,
            types: [
              {
                data: 103000011,
                modules: [{ data: 102000033, lvl: 1, timer: 120 }],
              },
            ],
          },
        ],
      },
      NOW,
    );

    expect(result.upgrades).toHaveLength(1);
    expect(result.upgrades[0].dataId).toBe(102000033);
    expect(result.upgrades[0].category).toBe('buildings');
  });

  it('rejects payloads without a usable tag', () => {
    expect(() => parseAccountImport({ buildings: [] }, NOW)).toThrow(
      ImportValidationError,
    );
    expect(() => parseAccountImport({ tag: 'not a tag!' }, NOW)).toThrow(
      ImportValidationError,
    );
    expect(() => parseAccountImport(null, NOW)).toThrow(ImportValidationError);
  });

  it('ignores equipment entries even when a timer is present', () => {
    const result = parseAccountImport(
      {
        tag: '#ABC123',
        equipment: [{ data: 90000001, lvl: 5, timer: 3000 }],
      },
      NOW,
    );

    expect(result.upgrades).toEqual([]);
  });

  it('accepts an account with no active upgrades', () => {
    const result = parseAccountImport({ tag: '#ABC123' }, NOW);

    expect(result.tag).toBe('#ABC123');
    expect(result.townHall).toBeNull();
    expect(result.upgrades).toEqual([]);
  });
});
