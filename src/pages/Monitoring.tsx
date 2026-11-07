import { useCallback, useEffect, useRef, useState } from 'react';
import ConfirmDialog from '../components/common/ConfirmDialog.tsx';
import Icon from '../components/common/Icon.tsx';
import ToastStack from '../components/common/ToastStack.tsx';
import AccountCard from '../components/monitoring/AccountCard.tsx';
import BoostDialog from '../components/monitoring/BoostDialog.tsx';
import ImportModal from '../components/monitoring/ImportModal.tsx';
import { BOOST_SPECS } from '../lib/boosts.ts';
import {
  deleteAccount,
  deleteUpgrade,
  listAccounts,
  requestPersistentStorage,
} from '../lib/database.ts';
import { getGameName } from '../lib/gameData.ts';
import type {
  Account,
  BoostKind,
  BoostResult,
  ImportResult,
  ToastMessage,
} from '../lib/types.ts';
import { panelClass } from '../lib/ui.ts';

type FinishedUpgrade = {
  id: number;
  accountTag: string;
  base: string;
  dataId: number;
};

const toolbarClass =
  'mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

const primaryButtonClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gold px-3.5 py-[9px] text-[12.5px] font-bold whitespace-nowrap text-[#2b1a02] transition-[filter] duration-150 hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-transparent px-2.5 py-[7px] text-[11.5px] font-semibold whitespace-nowrap text-heading hover:bg-[rgba(127,127,127,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-3.5';

const gridClass = 'grid gap-4 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-3';

const errorPanelClass =
  'rounded-xl border border-[#dc2626]/30 bg-[rgba(220,38,38,0.08)] px-4 py-3 text-[12px] text-[#b91c1c] dark:text-[#f87171]';

export default function Monitoring() {
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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const notifiedRef = useRef(new Set<number>());
  const toastIdRef = useRef(0);

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

      for (const upgrade of data.completed) {
        if (notifiedRef.current.has(upgrade.id)) continue;

        notifiedRef.current.add(upgrade.id);
        addToast({
          title: 'Upgrade selesai',
          detail: `${getGameName(upgrade.base, upgrade.dataId)} · ${upgrade.accountTag}`,
          tone: 'success',
        });
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Gagal memuat data dari penyimpanan lokal.',
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const refresh = useCallback(() => {
    setLoading(true);
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    void requestPersistentStorage();
    // oxlint-disable-next-line react/set-state-in-effect -- initial data load
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = Date.now();
      setNow(current);

      const finished: FinishedUpgrade[] = [];

      for (const account of accounts) {
        for (const upgrade of account.upgrades) {
          if (upgrade.endsAt <= current) {
            finished.push({
              id: upgrade.id,
              accountTag: account.tag,
              base: upgrade.base,
              dataId: upgrade.dataId,
            });
          }
        }
      }

      if (finished.length === 0) return;

      for (const upgrade of finished) {
        if (notifiedRef.current.has(upgrade.id)) continue;

        notifiedRef.current.add(upgrade.id);
        addToast({
          title: 'Upgrade selesai',
          detail: `${getGameName(upgrade.base, upgrade.dataId)} · ${upgrade.accountTag}`,
          tone: 'success',
        });
        void deleteUpgrade(upgrade.id).catch(() => {
          // The next listAccounts() call cleans up the expired row if this fails.
        });
      }

      const finishedIds = new Set(finished.map((upgrade) => upgrade.id));
      setAccounts((currentAccounts) =>
        currentAccounts.map((account) => ({
          ...account,
          upgrades: account.upgrades.filter((upgrade) => !finishedIds.has(upgrade.id)),
        })),
      );
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [accounts, addToast]);

  const handleImported = useCallback(
    (result: ImportResult) => {
      const isUpdate = Boolean(importTarget?.tag);
      const previousAccount = accounts.find((account) => account.tag === result.account.tag);
      const hadActiveBoost =
        previousAccount?.boosts.some((boost) => boost.endsAt > Date.now()) ?? false;

      setImportTarget(null);
      addToast({
        title: `Akun ${result.account.tag} ${isUpdate ? 'diperbarui' : 'diimpor'}`,
        detail: `${result.importedUpgrades} upgrade aktif.${
          hadActiveBoost ? ' Booster aktif dibatalkan.' : ''
        }`,
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

  const activeCount = accounts.reduce((total, account) => total + account.upgrades.length, 0);
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
