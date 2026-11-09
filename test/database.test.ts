import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DATABASE_NAME,
  activateBoost,
  deleteAccount,
  deleteDatabase,
  deleteUpgrade,
  importAccount,
  listAccounts,
  syncAccountMetadata,
} from '../src/lib/database.ts';

const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;

const API_METADATA = {
  name: 'Desa Uji',
  townHallLevel: 15,
  expLevel: 200,
  trophies: 5000,
  bestTrophies: 5200,
  warStars: 900,
  clanTag: '#CLAN99',
  clanName: 'Clan Uji',
  clanLevel: 10,
  leagueName: 'Titan League',
};

function savePayload(
  payload: Record<string, unknown>,
  now = NOW,
): Promise<Awaited<ReturnType<typeof importAccount>>> {
  return importAccount(payload, now);
}

function countStore(storeName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(storeName, 'readonly');
      const countRequest = transaction.objectStore(storeName).count();

      countRequest.onerror = () => {
        database.close();
        reject(countRequest.error);
      };
      countRequest.onsuccess = () => {
        database.close();
        resolve(countRequest.result);
      };
    };
  });
}

beforeEach(async () => {
  await deleteDatabase();
});

describe('database', () => {
  it('saves an account and returns its active upgrades', async () => {
    const result = await importAccount(
      { tag: '#ABC123', buildings: [{ data: 1000004, lvl: 16, timer: 60 }] },
      NOW,
    );

    expect(result.importedUpgrades).toBe(1);
    expect(result.account.tag).toBe('#ABC123');
    expect(result.account.upgrades).toHaveLength(1);
    expect(result.account.upgrades[0].endsAt).toBe(NOW + 60_000);
  });

  it('replaces previous upgrades when an account is imported again', async () => {
    await importAccount(
      { tag: '#ABC123', buildings: [{ data: 1000004, lvl: 16, timer: 60 }] },
      NOW,
    );
    const second = await importAccount(
      { tag: '#ABC123', buildings: [{ data: 1000023, lvl: 10, timer: 120 }] },
      NOW + 1000,
    );

    expect(second.account.upgrades).toHaveLength(1);
    expect(second.account.upgrades[0].dataId).toBe(1000023);

    const result = await listAccounts(NOW + 2000);
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0].upgrades).toHaveLength(1);
  });

  it('keeps completed upgrades until they are dismissed', async () => {
    const saved = await importAccount(
      { tag: '#ABC123', buildings: [{ data: 1000004, lvl: 16, timer: 60 }] },
      NOW,
    );
    const id = saved.account.upgrades[0].id;

    const beforeExpiry = await listAccounts(NOW + 1000);
    expect(beforeExpiry.accounts[0].upgrades).toHaveLength(1);

    const afterExpiry = await listAccounts(NOW + 61_000);
    expect(afterExpiry.accounts[0].upgrades).toHaveLength(1);
    expect(afterExpiry.accounts[0].upgrades[0].endsAt).toBe(NOW + 60_000);

    const afterReopen = await listAccounts(NOW + 62_000);
    expect(afterReopen.accounts[0].upgrades).toHaveLength(1);

    expect(await deleteUpgrade(id)).toBe(true);

    const afterDismiss = await listAccounts(NOW + 63_000);
    expect(afterDismiss.accounts[0].upgrades).toHaveLength(0);
  });

  it('deletes an account together with its upgrades', async () => {
    const saved = await importAccount(
      { tag: '#ABC123', buildings: [{ data: 1000004, lvl: 16, timer: 60 }] },
      NOW,
    );
    const id = saved.account.upgrades[0].id;

    expect(await deleteAccount('#ABC123')).toBe(true);
    expect(await deleteAccount('#ABC123')).toBe(false);
    expect((await listAccounts(NOW + 1000)).accounts).toHaveLength(0);
    expect(await deleteUpgrade(id)).toBe(false);
  });

  it('deletes an upgrade by id', async () => {
    const saved = await importAccount(
      { tag: '#ABC123', buildings: [{ data: 1000004, lvl: 16, timer: 60 }] },
      NOW,
    );
    const id = saved.account.upgrades[0].id;

    expect(await deleteUpgrade(id)).toBe(true);
    expect(await deleteUpgrade(id)).toBe(false);
    expect((await listAccounts(NOW + 1000)).accounts[0].upgrades).toHaveLength(0);
  });

  it('activates a builder boost for home upgrades only', async () => {
    await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 10 * 3600 }],
      heroes: [{ data: 28000000, lvl: 50, timer: 20 * 3600 }],
      units: [{ data: 4000023, lvl: 11, timer: 24 * 3600 }],
      pets: [{ data: 73000007, lvl: 13, timer: 48 * 3600 }],
      buildings2: [{ data: 4000031, lvl: 20, timer: 10 * 3600 }],
    });

    const result = await activateBoost('#ABC123', 'builder', 1, NOW);

    expect(result.affectedUpgrades).toBe(2);
    expect(result.boost.kind).toBe('builder');
    expect(result.boost.multiplier).toBe(10);
    expect(result.boost.quantity).toBe(1);
    expect(result.boost.startedAt).toBe(NOW);
    expect(result.boost.endsAt).toBe(NOW + HOUR);
    expect(result.account.boosts).toHaveLength(1);

    const upgrades = new Map(
      result.account.upgrades.map((upgrade) => [upgrade.category, upgrade]),
    );

    expect(upgrades.get('buildings')?.endsAt).toBe(NOW + HOUR);
    expect(upgrades.get('heroes')?.endsAt).toBe(NOW + 11 * HOUR);
    expect(upgrades.get('units')?.endsAt).toBe(NOW + 24 * HOUR);
    expect(upgrades.get('pets')?.endsAt).toBe(NOW + 48 * HOUR);
    expect(upgrades.get('buildings2')?.endsAt).toBe(NOW + 10 * HOUR);
    expect(upgrades.get('buildings')?.group).toBe('home');
    expect(upgrades.get('units')?.group).toBe('laboratory');
    expect(upgrades.get('pets')?.group).toBe('pet');
    expect(upgrades.get('buildings2')?.group).toBe('builderBase');
  });

  it('applies laboratory and pet boosts to separate groups', async () => {
    await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 10 * 3600 }],
      units: [{ data: 4000023, lvl: 11, timer: 24 * 3600 }],
      spells: [{ data: 26000000, lvl: 5, timer: 48 * 3600 }],
      pets: [{ data: 73000007, lvl: 13, timer: 48 * 3600 }],
    });

    const lab = await activateBoost('#ABC123', 'laboratory', 1, NOW);

    expect(lab.affectedUpgrades).toBe(2);

    const afterLab = new Map(
      lab.account.upgrades.map((upgrade) => [upgrade.category, upgrade]),
    );

    expect(afterLab.get('units')?.endsAt).toBe(NOW + HOUR);
    expect(afterLab.get('spells')?.endsAt).toBe(NOW + 25 * HOUR);
    expect(afterLab.get('pets')?.endsAt).toBe(NOW + 48 * HOUR);
    expect(afterLab.get('buildings')?.endsAt).toBe(NOW + 10 * HOUR);

    const pet = await activateBoost('#ABC123', 'pet', 1, NOW);

    expect(pet.affectedUpgrades).toBe(1);
    expect(pet.account.boosts).toHaveLength(2);

    const afterPet = new Map(
      pet.account.upgrades.map((upgrade) => [upgrade.category, upgrade]),
    );

    expect(afterPet.get('pets')?.endsAt).toBe(NOW + 25 * HOUR);
    expect(afterPet.get('units')?.endsAt).toBe(NOW + HOUR);
  });

  it('uses the selected quantity as the boost window', async () => {
    await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 30 * 3600 }],
    });

    const result = await activateBoost('#ABC123', 'builder', 2, NOW);

    expect(result.boost.quantity).toBe(2);
    expect(result.boost.endsAt).toBe(NOW + 2 * HOUR);
    expect(result.account.upgrades[0].endsAt).toBe(NOW + 12 * HOUR);
    expect(result.account.upgrades[0].remainingSeconds).toBe(12 * 3600);
  });

  it('extends the same booster and starts fresh after it expires', async () => {
    await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 20 * 3600 }],
      heroes: [{ data: 28000000, lvl: 50, timer: 100 * 3600 }],
    });

    const first = await activateBoost('#ABC123', 'builder', 1, NOW);

    expect(first.extended).toBe(false);
    expect(first.boost.quantity).toBe(1);
    expect(first.boost.endsAt).toBe(NOW + HOUR);

    const extendedOnce = await activateBoost('#ABC123', 'builder', 1, NOW + 30 * 60_000);

    expect(extendedOnce.extended).toBe(true);
    expect(extendedOnce.addedQuantity).toBe(1);
    expect(extendedOnce.affectedUpgrades).toBe(2);
    expect(extendedOnce.account.boosts).toHaveLength(1);
    expect(extendedOnce.boost.startedAt).toBe(NOW);
    expect(extendedOnce.boost.quantity).toBe(2);
    expect(extendedOnce.boost.endsAt).toBe(NOW + 2 * HOUR);

    const onceByCategory = new Map(
      extendedOnce.account.upgrades.map((upgrade) => [upgrade.category, upgrade]),
    );

    expect(onceByCategory.get('buildings')?.endsAt).toBe(NOW + 2 * HOUR);
    expect(onceByCategory.get('heroes')?.endsAt).toBe(NOW + 82 * HOUR);

    const extendedTwice = await activateBoost('#ABC123', 'builder', 3, NOW + HOUR);

    expect(extendedTwice.extended).toBe(true);
    expect(extendedTwice.addedQuantity).toBe(3);
    expect(extendedTwice.boost.startedAt).toBe(NOW);
    expect(extendedTwice.boost.quantity).toBe(5);
    expect(extendedTwice.boost.endsAt).toBe(NOW + 5 * HOUR);

    const twiceByCategory = new Map(
      extendedTwice.account.upgrades.map((upgrade) => [upgrade.category, upgrade]),
    );

    expect(twiceByCategory.get('buildings')?.endsAt).toBe(NOW + 2 * HOUR);
    expect(twiceByCategory.get('heroes')?.endsAt).toBe(NOW + 55 * HOUR);

    const restarted = await activateBoost('#ABC123', 'builder', 1, NOW + 6 * HOUR);

    expect(restarted.extended).toBe(false);
    expect(restarted.boost.startedAt).toBe(NOW + 6 * HOUR);
    expect(restarted.boost.quantity).toBe(1);
    expect(restarted.boost.endsAt).toBe(NOW + 7 * HOUR);
    expect(restarted.account.upgrades).toHaveLength(2);

    const restartedByCategory = new Map(
      restarted.account.upgrades.map((upgrade) => [upgrade.category, upgrade]),
    );

    expect(restartedByCategory.get('buildings')?.endsAt).toBe(NOW + 2 * HOUR);
    expect(restartedByCategory.get('heroes')?.endsAt).toBe(NOW + 46 * HOUR);
  });

  it('rejects a booster when the target group has no active upgrades', async () => {
    await savePayload({
      tag: '#ABC123',
      units: [{ data: 4000023, lvl: 11, timer: 24 * 3600 }],
    });

    await expect(activateBoost('#ABC123', 'builder', 1, NOW)).rejects.toMatchObject({
      name: 'BoostError',
      status: 409,
    });
  });

  it('validates boost kind, quantity, and account', async () => {
    await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 10 * 3600 }],
    });

    const cases: Array<[string, unknown, number]> = [
      ['unknown', 1, 400],
      ['constructor', 1, 400],
      ['builder', 6, 400],
    ];

    for (const [kind, quantity, status] of cases) {
      await expect(activateBoost('#ABC123', kind, quantity, NOW)).rejects.toMatchObject({
        name: 'BoostError',
        status,
      });
    }

    await expect(activateBoost('#MISSING', 'builder', 1, NOW)).rejects.toMatchObject({
      name: 'BoostError',
      status: 404,
    });
  });

  it('lists active boosts and removes expired ones', async () => {
    await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 20 * 3600 }],
    });

    await activateBoost('#ABC123', 'builder', 1, NOW);

    const active = await listAccounts(NOW + 30 * 60_000);
    expect(active.accounts[0].boosts).toHaveLength(1);
    expect(active.accounts[0].boosts[0].kind).toBe('builder');

    const expired = await listAccounts(NOW + 2 * HOUR);
    expect(expired.accounts[0].boosts).toHaveLength(0);
    expect(expired.accounts[0].upgrades).toHaveLength(1);
  });

  it('deletes boosts together with the account', async () => {
    await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 20 * 3600 }],
    });

    await activateBoost('#ABC123', 'builder', 1, NOW);
    expect(await deleteAccount('#ABC123')).toBe(true);
    expect(await countStore('boosts')).toBe(0);
  });

  it('imports active potions and compresses affected timers', async () => {
    const result = await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 135042 }],
      units: [{ data: 4000008, lvl: 10, timer: 86400 }],
      pets: [{ data: 73000004, lvl: 8, timer: 43200 }],
      boosts: { builder_boost: 4102, lab_boost: 3600, pet_boost: 1800 },
    });

    expect(result.account.boosts.map((boost) => boost.kind).sort()).toEqual([
      'builder',
      'laboratory',
      'pet',
    ]);

    const home = result.account.upgrades.find(
      (upgrade) => upgrade.category === 'buildings',
    );
    const lab = result.account.upgrades.find(
      (upgrade) => upgrade.category === 'units',
    );
    const pet = result.account.upgrades.find(
      (upgrade) => upgrade.category === 'pets',
    );
    const builder = result.account.boosts.find(
      (boost) => boost.kind === 'builder',
    );

    expect(home?.endsAt).toBe(NOW + 98_124_000);
    expect(lab?.endsAt).toBe(NOW + 3_600_000);
    expect(pet?.endsAt).toBe(NOW + 1_800_000);
    expect(builder?.quantity).toBe(2);
    expect(builder?.endsAt).toBe(NOW + 4_102_000);
  });

  it('does not store potions that expired before import', async () => {
    const result = await savePayload(
      {
        tag: '#ABC123',
        timestamp: (NOW - 2 * HOUR) / 1000,
        buildings: [{ data: 1000004, lvl: 16, timer: 20 * 3600 }],
        boosts: { builder_boost: 3600 },
      },
      NOW,
    );

    expect(result.account.boosts).toEqual([]);
    expect(result.account.upgrades[0].endsAt).toBe(NOW + 9 * HOUR);
  });

  it('replaces imported boosts when an account is imported again', async () => {
    await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 20 * 3600 }],
      boosts: { builder_boost: 3600 },
    });

    const reimported = await savePayload(
      {
        tag: '#ABC123',
        pets: [{ data: 73000004, lvl: 8, timer: 10 * 3600 }],
        boosts: { pet_boost: 1800 },
      },
      NOW + 1000,
    );

    expect(reimported.account.boosts.map((boost) => boost.kind)).toEqual([
      'pet',
    ]);
  });

  it('clears active boosts when an account is imported again', async () => {
    await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 20 * 3600 }],
    });

    await activateBoost('#ABC123', 'builder', 1, NOW);

    const reimported = await savePayload(
      {
        tag: '#ABC123',
        buildings: [{ data: 1000004, lvl: 16, timer: 30 * 3600 }],
      },
      NOW + 1000,
    );

    expect(reimported.account.boosts).toHaveLength(0);
    expect(reimported.account.upgrades[0].endsAt).toBe(NOW + 1000 + 30 * HOUR);
  });

  it('stores API metadata without touching upgrades or boosts', async () => {
    await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 20 * 3600 }],
    });
    await activateBoost('#ABC123', 'builder', 1, NOW);

    const updated = await syncAccountMetadata('#ABC123', API_METADATA, NOW + 1000);

    expect(updated).not.toBeNull();
    expect(updated?.api).toEqual({
      ...API_METADATA,
      updatedAt: NOW + 1000,
    });
    expect(updated?.townHall).toBeNull();
    expect(updated?.upgrades).toHaveLength(1);
    expect(updated?.boosts).toHaveLength(1);

    const listed = await listAccounts(NOW + 2000);
    expect(listed.accounts[0].api?.name).toBe('Desa Uji');
    expect(listed.accounts[0].upgrades).toHaveLength(1);
  });

  it('preserves API metadata when an account is imported again', async () => {
    await savePayload({
      tag: '#ABC123',
      buildings: [{ data: 1000004, lvl: 16, timer: 60 }],
    });
    await syncAccountMetadata('#ABC123', API_METADATA, NOW + 1000);

    const reimported = await savePayload(
      {
        tag: '#ABC123',
        buildings: [{ data: 1000004, lvl: 16, timer: 120 }],
      },
      NOW + 2000,
    );

    expect(reimported.account.api?.name).toBe('Desa Uji');
    expect(reimported.account.api?.updatedAt).toBe(NOW + 1000);
  });

  it('does not create an account from metadata alone', async () => {
    expect(await syncAccountMetadata('#MISSING', API_METADATA, NOW)).toBeNull();
    expect((await listAccounts(NOW)).accounts).toHaveLength(0);
  });
});
