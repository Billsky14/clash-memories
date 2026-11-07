import { parseAccountImport } from './accountImport.ts';
import {
  BoostError,
  getBoostDurationMs,
  getBoostedRemainingMs,
  getRemainingWorkMs,
  getUpgradeGroup,
  isBoostKind,
  BOOST_SPECS,
  validateBoostQuantity,
} from './boosts.ts';
import type {
  Account,
  AccountBoost,
  AccountUpgrade,
  AccountsSnapshot,
  BoostKind,
  BoostResult,
  ImportResult,
} from './types.ts';

export const DATABASE_NAME = 'clash-monitor';

const DATABASE_VERSION = 1;
const ACCOUNTS_STORE = 'accounts';
const UPGRADES_STORE = 'upgrades';
const BOOSTS_STORE = 'boosts';
const ACCOUNT_TAG_INDEX = 'accountTag';
const ENDS_AT_INDEX = 'endsAt';
const ACCOUNT_KIND_INDEX = 'accountKind';

type StoredAccount = {
  tag: string;
  townHall: number | null;
  sourceTimestamp: number | null;
  lastImportAt: number;
  createdAt: number;
};

type StoredUpgrade = {
  id: number;
  accountTag: string;
  category: string;
  base: string;
  dataId: number;
  level: number;
  remainingSeconds: number;
  endsAt: number;
  helperRecurrent: boolean;
  extra: boolean;
  createdAt: number;
};

type StoredBoost = {
  id: number;
  accountTag: string;
  kind: BoostKind;
  multiplier: number;
  quantity: number;
  startedAt: number;
  endsAt: number;
  createdAt: number;
};

type NewStoredUpgrade = Omit<StoredUpgrade, 'id'>;
type NewStoredBoost = Omit<StoredBoost, 'id'>;

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

function mapUpgrade(record: StoredUpgrade): AccountUpgrade {
  return {
    id: record.id,
    accountTag: record.accountTag,
    category: record.category,
    group: getUpgradeGroup(record.base, record.category),
    base: record.base,
    dataId: record.dataId,
    level: record.level,
    remainingSeconds: record.remainingSeconds,
    endsAt: record.endsAt,
    helperRecurrent: record.helperRecurrent,
    extra: record.extra,
  };
}

function mapBoost(record: StoredBoost): AccountBoost {
  return {
    id: record.id,
    kind: record.kind,
    multiplier: record.multiplier,
    quantity: record.quantity,
    startedAt: record.startedAt,
    endsAt: record.endsAt,
  };
}

function compareByEndsAt(
  first: { id: number; endsAt: number },
  second: { id: number; endsAt: number },
): number {
  return first.endsAt - second.endsAt || first.id - second.id;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new DatabaseError('Gagal mengakses penyimpanan lokal.'));
  });
}

function createSchema(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(ACCOUNTS_STORE)) {
    database.createObjectStore(ACCOUNTS_STORE, { keyPath: 'tag' });
  }

  if (!database.objectStoreNames.contains(UPGRADES_STORE)) {
    const upgrades = database.createObjectStore(UPGRADES_STORE, {
      keyPath: 'id',
      autoIncrement: true,
    });

    upgrades.createIndex(ACCOUNT_TAG_INDEX, 'accountTag');
    upgrades.createIndex(ENDS_AT_INDEX, 'endsAt');
  }

  if (!database.objectStoreNames.contains(BOOSTS_STORE)) {
    const boosts = database.createObjectStore(BOOSTS_STORE, {
      keyPath: 'id',
      autoIncrement: true,
    });

    boosts.createIndex(ACCOUNT_TAG_INDEX, 'accountTag');
    boosts.createIndex(ENDS_AT_INDEX, 'endsAt');
    boosts.createIndex(ACCOUNT_KIND_INDEX, ['accountTag', 'kind'], { unique: true });
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(
      new DatabaseError('Penyimpanan lokal browser tidak tersedia.'),
    );
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    function settle(error: DatabaseError | null, database?: IDBDatabase) {
      if (settled) {
        database?.close();
        return;
      }

      settled = true;

      if (error) {
        reject(error);
        return;
      }

      resolve(database as IDBDatabase);
    }

    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch {
      settle(new DatabaseError('Gagal membuka penyimpanan lokal.'));
      return;
    }

    request.onupgradeneeded = () => createSchema(request.result);
    request.onsuccess = () => settle(null, request.result);
    request.onerror = () =>
      settle(new DatabaseError('Gagal membuka penyimpanan lokal.'));
    request.onblocked = () =>
      settle(
        new DatabaseError(
          'Penyimpanan lokal sedang digunakan tab lain. Tutup tab lain lalu coba lagi.',
        ),
      );
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(new DatabaseError('Gagal menyimpan perubahan ke penyimpanan lokal.'));
    transaction.onabort = () =>
      reject(new DatabaseError('Perubahan pada penyimpanan lokal dibatalkan.'));
  });
}

async function withTransaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  operation: (transaction: IDBTransaction) => Promise<T>,
): Promise<T> {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(stores, mode);
    const done = transactionDone(transaction);

    try {
      const result = await operation(transaction);
      await done;
      return result;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The transaction may already have completed or aborted.
      }

      await done.catch(() => undefined);
      throw error;
    }
  } finally {
    database.close();
  }
}

function deleteByIndex(
  store: IDBObjectStore,
  indexName: string,
  key: IDBValidKey,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.index(indexName).openKeyCursor(IDBKeyRange.only(key));

    request.onerror = () =>
      reject(new DatabaseError('Gagal menghapus data dari penyimpanan lokal.'));
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve();
        return;
      }

      store.delete(cursor.primaryKey);
      cursor.continue();
    };
  });
}

function deleteExpiredUpgrades(
  store: IDBObjectStore,
  now: number,
): Promise<StoredUpgrade[]> {
  return new Promise((resolve, reject) => {
    const expired: StoredUpgrade[] = [];
    const request = store.index(ENDS_AT_INDEX).openCursor(IDBKeyRange.upperBound(now));

    request.onerror = () =>
      reject(new DatabaseError('Gagal membersihkan upgrade kedaluwarsa.'));
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve(expired);
        return;
      }

      expired.push(cursor.value as StoredUpgrade);
      cursor.delete();
      cursor.continue();
    };
  });
}

function deleteExpiredBoosts(store: IDBObjectStore, now: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.index(ENDS_AT_INDEX).openKeyCursor(IDBKeyRange.upperBound(now));

    request.onerror = () =>
      reject(new DatabaseError('Gagal membersihkan booster kedaluwarsa.'));
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve();
        return;
      }

      store.delete(cursor.primaryKey);
      cursor.continue();
    };
  });
}

async function readUpgradesForAccount(
  store: IDBObjectStore,
  tag: string,
  now: number,
): Promise<AccountUpgrade[]> {
  const records = (await requestResult(
    store.index(ACCOUNT_TAG_INDEX).getAll(tag),
  )) as StoredUpgrade[];

  return records
    .filter((record) => record.endsAt > now)
    .sort(compareByEndsAt)
    .map(mapUpgrade);
}

async function readBoostsForAccount(
  store: IDBObjectStore,
  tag: string,
  now: number,
): Promise<AccountBoost[]> {
  const records = (await requestResult(
    store.index(ACCOUNT_TAG_INDEX).getAll(tag),
  )) as StoredBoost[];

  return records
    .filter((record) => record.endsAt > now)
    .sort(compareByEndsAt)
    .map(mapBoost);
}

async function readAccount(
  transaction: IDBTransaction,
  tag: string,
  now: number,
): Promise<Account | null> {
  const record = (await requestResult(
    transaction.objectStore(ACCOUNTS_STORE).get(tag),
  )) as StoredAccount | undefined;

  if (!record) return null;

  const upgrades = await readUpgradesForAccount(
    transaction.objectStore(UPGRADES_STORE),
    tag,
    now,
  );
  const boosts = await readBoostsForAccount(
    transaction.objectStore(BOOSTS_STORE),
    tag,
    now,
  );

  return {
    tag: record.tag,
    townHall: record.townHall,
    lastImportAt: record.lastImportAt,
    createdAt: record.createdAt,
    upgrades,
    boosts,
  };
}

export async function importAccount(
  payload: unknown,
  now = Date.now(),
): Promise<ImportResult> {
  const parsed = parseAccountImport(payload, now);

  return withTransaction(
    [ACCOUNTS_STORE, UPGRADES_STORE, BOOSTS_STORE],
    'readwrite',
    async (transaction) => {
      const accountsStore = transaction.objectStore(ACCOUNTS_STORE);
      const upgradesStore = transaction.objectStore(UPGRADES_STORE);
      const boostsStore = transaction.objectStore(BOOSTS_STORE);
      const existing = (await requestResult(
        accountsStore.get(parsed.tag),
      )) as StoredAccount | undefined;

      accountsStore.put({
        tag: parsed.tag,
        townHall: parsed.townHall,
        sourceTimestamp: parsed.sourceTimestamp,
        lastImportAt: now,
        createdAt: existing?.createdAt ?? now,
      } satisfies StoredAccount);

      await deleteByIndex(upgradesStore, ACCOUNT_TAG_INDEX, parsed.tag);
      await deleteByIndex(boostsStore, ACCOUNT_TAG_INDEX, parsed.tag);

      for (const upgrade of parsed.upgrades) {
        upgradesStore.add({
          accountTag: parsed.tag,
          category: upgrade.category,
          base: upgrade.base,
          dataId: upgrade.dataId,
          level: upgrade.level,
          remainingSeconds: upgrade.remainingSeconds,
          endsAt: upgrade.endsAt,
          helperRecurrent: upgrade.helperRecurrent,
          extra: upgrade.extra,
          createdAt: now,
        } satisfies NewStoredUpgrade);
      }

      const account = await readAccount(transaction, parsed.tag, now);

      if (!account) {
        throw new DatabaseError('Akun gagal disimpan.');
      }

      return {
        account,
        importedUpgrades: parsed.upgrades.length,
      };
    },
  );
}

export async function listAccounts(now = Date.now()): Promise<AccountsSnapshot> {
  return withTransaction(
    [ACCOUNTS_STORE, UPGRADES_STORE, BOOSTS_STORE],
    'readwrite',
    async (transaction) => {
      const accountsStore = transaction.objectStore(ACCOUNTS_STORE);
      const upgradesStore = transaction.objectStore(UPGRADES_STORE);
      const boostsStore = transaction.objectStore(BOOSTS_STORE);

      const completed = await deleteExpiredUpgrades(upgradesStore, now);
      await deleteExpiredBoosts(boostsStore, now);

      const accountRecords = (await requestResult(
        accountsStore.getAll(),
      )) as StoredAccount[];
      const upgradeRecords = (await requestResult(
        upgradesStore.getAll(),
      )) as StoredUpgrade[];
      const boostRecords = (await requestResult(
        boostsStore.getAll(),
      )) as StoredBoost[];

      const upgradesByAccount = new Map<string, AccountUpgrade[]>();

      for (const record of upgradeRecords) {
        const upgrades = upgradesByAccount.get(record.accountTag) ?? [];
        upgrades.push(mapUpgrade(record));
        upgradesByAccount.set(record.accountTag, upgrades);
      }

      const boostsByAccount = new Map<string, AccountBoost[]>();

      for (const record of boostRecords) {
        const boosts = boostsByAccount.get(record.accountTag) ?? [];
        boosts.push(mapBoost(record));
        boostsByAccount.set(record.accountTag, boosts);
      }

      const accounts = accountRecords
        .sort(
          (first, second) =>
            second.lastImportAt - first.lastImportAt ||
            first.tag.localeCompare(second.tag),
        )
        .map((record) => ({
          tag: record.tag,
          townHall: record.townHall,
          lastImportAt: record.lastImportAt,
          createdAt: record.createdAt,
          upgrades: (upgradesByAccount.get(record.tag) ?? []).sort(compareByEndsAt),
          boosts: (boostsByAccount.get(record.tag) ?? []).sort(compareByEndsAt),
        }));

      return {
        accounts,
        completed: completed.sort(compareByEndsAt).map(mapUpgrade),
      };
    },
  );
}

export async function activateBoost(
  tag: string,
  kind: string,
  quantity: unknown,
  now = Date.now(),
): Promise<BoostResult> {
  if (!isBoostKind(kind)) {
    throw new BoostError('Jenis booster tidak valid.');
  }

  const spec = BOOST_SPECS[kind];
  const validQuantity = validateBoostQuantity(quantity);

  return withTransaction(
    [ACCOUNTS_STORE, UPGRADES_STORE, BOOSTS_STORE],
    'readwrite',
    async (transaction) => {
      const accountsStore = transaction.objectStore(ACCOUNTS_STORE);
      const upgradesStore = transaction.objectStore(UPGRADES_STORE);
      const boostsStore = transaction.objectStore(BOOSTS_STORE);
      const accountRecord = (await requestResult(
        accountsStore.get(tag),
      )) as StoredAccount | undefined;

      if (!accountRecord) {
        throw new BoostError('Akun tidak ditemukan.', 404);
      }

      await deleteExpiredBoosts(boostsStore, now);

      const activeBoost = (await requestResult(
        boostsStore.index(ACCOUNT_KIND_INDEX).get([tag, kind]),
      )) as StoredBoost | undefined;
      const upgradeRecords = (await requestResult(
        upgradesStore.index(ACCOUNT_TAG_INDEX).getAll(tag),
      )) as StoredUpgrade[];
      const targets = upgradeRecords.filter(
        (record) =>
          record.endsAt > now &&
          getUpgradeGroup(record.base, record.category) === spec.targetGroup,
      );

      if (targets.length === 0) {
        throw new BoostError('Tidak ada upgrade aktif di grup booster ini.', 409);
      }

      const addedDurationMs = getBoostDurationMs(validQuantity);
      const boostDurationMs = activeBoost
        ? activeBoost.endsAt + addedDurationMs - now
        : addedDurationMs;
      const currentBoost = activeBoost
        ? { endsAt: activeBoost.endsAt, multiplier: activeBoost.multiplier }
        : null;

      for (const record of targets) {
        const remainingMs = getRemainingWorkMs(record.endsAt, now, currentBoost);
        const nextRemainingMs = getBoostedRemainingMs(
          remainingMs,
          spec.multiplier,
          boostDurationMs,
        );

        upgradesStore.put({
          ...record,
          endsAt: now + nextRemainingMs,
          remainingSeconds: Math.ceil(nextRemainingMs / 1000),
        } satisfies StoredUpgrade);
      }

      let boost: AccountBoost;
      let extended = false;

      if (activeBoost) {
        const updated: StoredBoost = {
          ...activeBoost,
          quantity: activeBoost.quantity + validQuantity,
          endsAt: activeBoost.endsAt + addedDurationMs,
        };

        boostsStore.put(updated);
        boost = mapBoost(updated);
        extended = true;
      } else {
        const record: NewStoredBoost = {
          accountTag: tag,
          kind,
          multiplier: spec.multiplier,
          quantity: validQuantity,
          startedAt: now,
          endsAt: now + addedDurationMs,
          createdAt: now,
        };
        const id = (await requestResult(boostsStore.add(record))) as number;

        boost = mapBoost({ ...record, id });
      }

      const account = await readAccount(transaction, tag, now);

      if (!account) {
        throw new DatabaseError('Akun tidak ditemukan.');
      }

      return {
        account,
        boost,
        affectedUpgrades: targets.length,
        extended,
        addedQuantity: validQuantity,
      };
    },
  );
}

export async function deleteUpgrade(id: number): Promise<boolean> {
  return withTransaction([UPGRADES_STORE], 'readwrite', async (transaction) => {
    const store = transaction.objectStore(UPGRADES_STORE);
    const existing = await requestResult(store.get(id));

    if (!existing) return false;

    store.delete(id);
    return true;
  });
}

export async function deleteAccount(tag: string): Promise<boolean> {
  return withTransaction(
    [ACCOUNTS_STORE, UPGRADES_STORE, BOOSTS_STORE],
    'readwrite',
    async (transaction) => {
      const accountsStore = transaction.objectStore(ACCOUNTS_STORE);
      const existing = await requestResult(accountsStore.get(tag));

      if (!existing) return false;

      accountsStore.delete(tag);
      await deleteByIndex(
        transaction.objectStore(UPGRADES_STORE),
        ACCOUNT_TAG_INDEX,
        tag,
      );
      await deleteByIndex(
        transaction.objectStore(BOOSTS_STORE),
        ACCOUNT_TAG_INDEX,
        tag,
      );

      return true;
    },
  );
}

export async function requestPersistentStorage(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return;

  try {
    await navigator.storage.persist();
  } catch {
    // Persistent storage is best-effort; the database works without it.
  }
}

export function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve();
      return;
    }

    const request = indexedDB.deleteDatabase(DATABASE_NAME);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(new DatabaseError('Gagal menghapus penyimpanan lokal.'));
    request.onblocked = () =>
      reject(new DatabaseError('Penyimpanan lokal sedang digunakan tab lain.'));
  });
}
