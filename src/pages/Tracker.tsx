import { useCallback, useEffect, useRef, useState } from 'react';
import ConfirmDialog from '../components/common/ConfirmDialog.tsx';
import Icon from '../components/common/Icon.tsx';
import ToastStack from '../components/common/ToastStack.tsx';
import AccountCard from '../components/tracker/AccountCard.tsx';
import BoostDialog from '../components/tracker/BoostDialog.tsx';
import ImportModal from '../components/tracker/ImportModal.tsx';
import { BOOST_SPECS } from '../lib/boosts.ts';
import {
  getApiStatus,
  getCocApiErrorMessage,
  getPlayer,
  isCocProxyUnavailable,
  toAccountMetadata,
} from '../lib/cocApi.ts';
import {
  deleteAccount,
  deleteUpgrade,
  listAccounts,
  requestPersistentStorage,
  syncAccountMetadata,
} from '../lib/database.ts';
import type {
  Account,
  AccountUpgrade,
  BoostKind,
  BoostResult,
  ImportResult,
  ToastMessage,
} from '../lib/types.ts';
import { panelClass } from '../lib/ui.ts';

const toolbarClass =
  'mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

const primaryButtonClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gold px-3.5 py-[9px] text-[12.5px] font-bold whitespace-nowrap text-[#2b1a02] transition-[filter] duration-150 hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-transparent px-2.5 py-[7px] text-[11.5px] font-semibold whitespace-nowrap text-heading hover:bg-[rgba(127,127,127,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-3.5';

const gridClass = 'grid gap-4 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-3';

const errorPanelClass =
  'rounded-xl border border-[#dc2626]/30 bg-[rgba(220,38,38,0.08)] px-4 py-3 text-[12px] text-[#b91c1c] dark:text-[#f87171]';

type ApiAvailability = {
  reachable: boolean;
  configured: boolean;
};

export default function Tracker() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importTarget, setImportTarget] = useState<{ tag?: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [boostTarget, setBoostTarget] = useState<{
    account: Account;
    kind: BoostKind;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [syncingMetadata, setSyncingMetadata] = useState(false);
  const [apiAvailability, setApiAvailability] = useState<ApiAvailability | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const toastIdRef = useRef(0);
  const syncingMetadataRef = useRef(false);
  const metadataSyncAttemptedRef = useRef(new Set<string>());
  const apiReachable = apiAvailability?.reachable === true;
  const apiConfigured = apiAvailability?.configured === true;

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = ++toastIdRef.current;
    setToasts((current) => [...current.slice(-3), { id, ...toast }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const closeImport = useCallback(() => setImportTarget(null), []);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await listAccounts();
      setError(null);
      setAccounts(data.accounts);
      setNow(Date.now());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Gagal memuat data dari penyimpanan lokal.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const checkApiStatus = useCallback(async () => {
    try {
      const status = await getApiStatus();
      setApiAvailability({ reachable: true, configured: status.configured });
    } catch {
      setApiAvailability({ reachable: false, configured: false });
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    void loadAccounts();
    void checkApiStatus();
  }, [checkApiStatus, loadAccounts]);

  const syncMetadata = useCallback(
    async (targets: Account[], silent = false) => {
      if (targets.length === 0 || syncingMetadataRef.current) return;

      syncingMetadataRef.current = true;
      setSyncingMetadata(true);

      let updatedCount = 0;
      const failures: string[] = [];

      try {
        const status = await getApiStatus();
        setApiAvailability({ reachable: true, configured: status.configured });

        if (!status.configured) {
          if (!silent) {
            addToast({
              title: 'Token API belum diset',
              detail:
                'Tambahkan COC_API_TOKEN di clash-monitoring/.env.local, lalu jalankan ulang server.',
              tone: 'error',
            });
          }
          return;
        }

        for (const account of targets) {
          try {
            const player = await getPlayer(account.tag, !silent);
            const updatedAccount = await syncAccountMetadata(
              account.tag,
              toAccountMetadata(player),
            );

            if (!updatedAccount) continue;

            updatedCount += 1;
            setAccounts((current) =>
              current.map((item) =>
                item.tag === updatedAccount.tag ? updatedAccount : item,
              ),
            );
          } catch (syncError) {
            if (!(silent && isCocProxyUnavailable(syncError))) {
              failures.push(getCocApiErrorMessage(syncError));
            }
          }
        }
      } catch (statusError) {
        setApiAvailability({ reachable: false, configured: false });
        if (!(silent && isCocProxyUnavailable(statusError))) {
          failures.push(getCocApiErrorMessage(statusError));
        }
      } finally {
        syncingMetadataRef.current = false;
        setSyncingMetadata(false);
      }

      if (updatedCount > 0) {
        addToast({
          title: `${updatedCount} desa diperbarui`,
          detail: 'Nama dan detail desa diambil dari API Supercell.',
          tone: 'success',
        });
      }

      if (failures.length > 0) {
        addToast({
          title:
            updatedCount > 0
              ? 'Sebagian desa gagal diperbarui'
              : 'Gagal mengambil detail desa',
          detail:
            failures.length > 1
              ? `${failures[0]} (${failures.length - 1} desa lainnya gagal)`
              : failures[0],
          tone: 'error',
        });
      }
    },
    [addToast],
  );

  useEffect(() => {
    void requestPersistentStorage();
    // oxlint-disable-next-line react/set-state-in-effect -- initial data load
    void loadAccounts();
    void checkApiStatus();
  }, [checkApiStatus, loadAccounts]);

  useEffect(() => {
    if (loading || syncingMetadata || !apiConfigured) return;

    const pending = accounts.filter(
      (account) =>
        !account.api && !metadataSyncAttemptedRef.current.has(account.tag),
    );

    if (pending.length === 0) return;

    for (const account of pending) {
      metadataSyncAttemptedRef.current.add(account.tag);
    }

    void syncMetadata(pending, true);
  }, [accounts, apiConfigured, loading, syncingMetadata, syncMetadata]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const handleImported = useCallback(
    (result: ImportResult) => {
      const isUpdate = Boolean(importTarget?.tag);
      const previousAccount = accounts.find((account) => account.tag === result.account.tag);
      const hadActiveBoost =
        previousAccount?.boosts.some((boost) => boost.endsAt > Date.now()) ?? false;
      const activeImportedBoosts = result.account.boosts.filter(
        (boost) => boost.endsAt > Date.now(),
      );
      const importedBoostLabels = activeImportedBoosts
        .map((boost) => BOOST_SPECS[boost.kind].label)
        .join(', ');
      const boostDetail =
        activeImportedBoosts.length > 0
          ? hadActiveBoost
            ? ` Booster aktif sebelumnya diganti data ekspor: ${importedBoostLabels}.`
            : ` Booster mengikuti data ekspor: ${importedBoostLabels}.`
          : hadActiveBoost
            ? ' Booster aktif sebelumnya dibatalkan.'
            : '';

      setImportTarget(null);
      addToast({
        title: `Akun ${result.account.tag} ${isUpdate ? 'diperbarui' : 'diimpor'}`,
        detail: `${result.importedUpgrades} upgrade aktif.${boostDetail}`,
        tone: 'success',
      });
      refresh();
    },
    [accounts, addToast, importTarget, refresh],
  );

  const handleUpdateAccount = useCallback((account: Account) => {
    setImportTarget({ tag: account.tag });
  }, []);

  const handleBoost = useCallback((account: Account, kind: BoostKind) => {
    setBoostTarget({ account, kind });
  }, []);

  const closeBoost = useCallback(() => setBoostTarget(null), []);

  const handleBoosted = useCallback(
    (result: BoostResult) => {
      const spec = BOOST_SPECS[result.boost.kind];

      setBoostTarget(null);
      addToast({
        title: result.extended ? `${spec.label} diperpanjang` : `${spec.label} aktif`,
        detail: result.extended
          ? `${result.addedQuantity} jam ditambahkan · total ${result.boost.quantity} jam. ${result.affectedUpgrades} upgrade di ${spec.groupLabel} diperbarui.`
          : `${result.affectedUpgrades} upgrade di ${spec.groupLabel} dipercepat ${result.boost.multiplier}x selama ${result.boost.quantity} jam.`,
        tone: 'success',
      });
      refresh();
    },
    [addToast, refresh],
  );

  const handleDeleteAccount = useCallback((account: Account) => {
    setDeleteTarget(account);
  }, []);

  const closeDelete = useCallback(() => {
    if (!deleting) setDeleteTarget(null);
  }, [deleting]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await deleteAccount(deleteTarget.tag);
      setDeleteTarget(null);
      addToast({
        title: `Akun ${deleteTarget.tag} dihapus`,
        detail: 'Semua timer akun ini berhenti dipantau.',
        tone: 'info',
      });
      refresh();
    } catch (deleteError) {
      addToast({
        title: 'Gagal menghapus akun',
        detail:
          deleteError instanceof Error ? deleteError.message : 'Coba lagi beberapa saat.',
        tone: 'error',
      });
    } finally {
      setDeleting(false);
    }
  }, [addToast, deleteTarget, refresh]);

  const handleDismissUpgrade = useCallback(
    async (upgrade: AccountUpgrade) => {
      try {
        await deleteUpgrade(upgrade.id);
        setAccounts((currentAccounts) =>
          currentAccounts.map((account) => ({
            ...account,
            upgrades: account.upgrades.filter((item) => item.id !== upgrade.id),
          })),
        );
      } catch (dismissError) {
        addToast({
          title: 'Gagal menutup peningkatan',
          detail:
            dismissError instanceof Error
              ? dismissError.message
              : 'Coba lagi beberapa saat.',
          tone: 'error',
        });
      }
    },
    [addToast],
  );

  const activeCount = accounts.reduce(
    (total, account) =>
      total + account.upgrades.filter((upgrade) => upgrade.endsAt > now).length,
    0,
  );
  const isInitialLoading = loading && accounts.length === 0 && !error;

  return (
    <>
      <div className={toolbarClass}>
        <div>
          <p className="mb-1 text-[10.5px] tracking-[0.14em] uppercase text-body">
            Timer peningkatan Clash Of Clans
          </p>
          <h2 className="m-0 text-[18px] font-medium tracking-[-0.01em] text-heading">
            Tracker Peningkatan Desa
          </h2>
          <p className="mt-1 text-[11.5px] text-body">
            {accounts.length} Desa · {activeCount} upgrade aktif
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={refresh}
            disabled={loading}
          >
            <Icon>
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </Icon>
            {loading ? 'Memuat...' : 'Perbarui'}
          </button>
          {apiReachable && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => void syncMetadata(accounts)}
              disabled={loading || syncingMetadata || accounts.length === 0}
              title="Ambil nama dan detail desa dari API Supercell"
            >
              <Icon>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </Icon>
              {syncingMetadata ? 'Sinkron...' : 'Sinkron desa'}
            </button>
          )}
          <button type="button" className={primaryButtonClass} onClick={() => setImportTarget({})}>
            <Icon>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </Icon>
            Impor JSON
          </button>
        </div>
      </div>

      {error && accounts.length > 0 && (
        <div className={`${errorPanelClass} mb-4`} role="alert">
          <p className="m-0 font-semibold">Tidak dapat memuat data</p>
          <p className="mt-0.5">{error}</p>
          <button
            type="button"
            className="mt-2 cursor-pointer font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            onClick={refresh}
          >
            Coba lagi
          </button>
        </div>
      )}

      {isInitialLoading ? (
        <div className={gridClass} aria-label="Memuat akun">
          {[0, 1, 2].map((item) => (
            <div key={item} className={`${panelClass} animate-pulse p-5`}>
              <div className="h-4 w-32 rounded bg-[rgba(127,127,127,0.14)]" />
              <div className="mt-3 h-3 w-24 rounded bg-[rgba(127,127,127,0.1)]" />
              <div className="mt-6 space-y-3">
                <div className="h-3 w-full rounded bg-[rgba(127,127,127,0.1)]" />
                <div className="h-3 w-5/6 rounded bg-[rgba(127,127,127,0.1)]" />
                <div className="h-3 w-2/3 rounded bg-[rgba(127,127,127,0.1)]" />
              </div>
            </div>
          ))}
        </div>
      ) : error && accounts.length === 0 ? (
        <section className={panelClass}>
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-[rgba(220,38,38,0.12)] text-[#dc2626] dark:text-[#f87171]">
              <Icon>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5" />
                <path d="M12 16h.01" />
              </Icon>
            </div>
            <div>
              <h3 className="m-0 text-[15px] font-semibold text-heading">
                Tidak dapat memuat data
              </h3>
              <p className="mt-1 text-[12px] text-body">{error}</p>
            </div>
            <button type="button" className={primaryButtonClass} onClick={refresh}>
              Coba lagi
            </button>
          </div>
        </section>
      ) : accounts.length === 0 ? (
        <section className={panelClass}>
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-chip-bg text-chip-fg">
              <Icon>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </Icon>
            </div>
            <div>
              <h3 className="m-0 text-[15px] font-semibold text-heading">Belum ada akun</h3>
              <p className="mt-1 text-[12px] text-body">
                Paste JSON akun untuk mulai memantau timer upgrade.
              </p>
            </div>
            <button
              type="button"
              className={primaryButtonClass}
              onClick={() => setImportTarget({})}
            >
              Impor JSON
            </button>
          </div>
        </section>
      ) : (
        <div className={gridClass}>
          {accounts.map((account) => (
            <AccountCard
              key={account.tag}
              account={account}
              now={now}
              onUpdate={handleUpdateAccount}
              onDelete={handleDeleteAccount}
              onBoost={handleBoost}
              onDismissUpgrade={handleDismissUpgrade}
            />
          ))}
        </div>
      )}

      {importTarget && (
        <ImportModal
          expectedTag={importTarget.tag}
          onClose={closeImport}
          onImported={handleImported}
        />
      )}
      {boostTarget && (
        <BoostDialog
          account={boostTarget.account}
          kind={boostTarget.kind}
          now={now}
          onClose={closeBoost}
          onActivated={handleBoosted}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Hapus akun?"
          description={`Semua timer untuk ${deleteTarget.tag} akan dihapus dari pemantauan.`}
          confirmLabel="Hapus akun"
          busyLabel="Menghapus..."
          busy={deleting}
          onCancel={closeDelete}
          onConfirm={() => void handleConfirmDelete()}
        />
      )}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
