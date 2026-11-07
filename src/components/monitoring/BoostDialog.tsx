import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BOOST_HOUR_MS,
  BOOST_SPECS,
  MAX_BOOST_QUANTITY,
} from '../../lib/boosts.ts';
import { activateBoost } from '../../lib/database.ts';
import { formatCountdown } from '../../lib/format.ts';
import type { Account, BoostKind, BoostResult } from '../../lib/types.ts';
import Icon from '../common/Icon.tsx';

type BoostDialogProps = {
  account: Account;
  kind: BoostKind;
  now: number;
  onClose: () => void;
  onActivated: (result: BoostResult) => void;
};

const cancelButtonClass =
  'cursor-pointer rounded-lg border border-line bg-transparent px-3.5 py-[9px] text-[12.5px] font-semibold text-heading hover:bg-[rgba(127,127,127,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60';

const activateButtonClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gold px-3.5 py-[9px] text-[12.5px] font-bold whitespace-nowrap text-[#2b1a02] transition-[filter] duration-150 hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4';

const quantityClass =
  'cursor-pointer rounded-lg border border-line px-1 py-2 text-center text-[12px] font-semibold text-body transition-colors hover:bg-[rgba(127,127,127,0.06)] has-[:checked]:border-gold has-[:checked]:bg-gold has-[:checked]:text-[#2b1a02] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60';

export default function BoostDialog({
  account,
  kind,
  now,
  onClose,
  onActivated,
}: BoostDialogProps) {
  const spec = BOOST_SPECS[kind];
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const activeBoost = account.boosts.find(
    (boost) => boost.kind === kind && boost.endsAt > now,
  );
  const isExtension = Boolean(activeBoost);
  const addedDurationMs = quantity * BOOST_HOUR_MS;
  const affectedUpgrades = account.upgrades.filter(
    (upgrade) => upgrade.group === spec.targetGroup,
  ).length;

  useEffect(() => {
    const focusTimer = window.setTimeout(() => cancelRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (affectedUpgrades === 0) {
      setError('Tidak ada upgrade aktif di grup ini.');
      return;
    }

    setSubmitting(true);

    try {
      const result = await activateBoost(account.tag, kind, quantity);
      onActivated(result);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isExtension
            ? 'Gagal menambah durasi booster.'
            : 'Gagal mengaktifkan booster.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-line bg-canvas shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="boost-dialog-title"
        aria-describedby="boost-dialog-description"
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-[18px]">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-chip-bg text-chip-fg">
            <Icon>
              <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />
            </Icon>
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="boost-dialog-title"
              className="m-0 text-[15px] font-semibold text-heading"
            >
              {isExtension ? 'Tambah durasi' : 'Gunakan'} {spec.label}?
            </h2>
            <p id="boost-dialog-description" className="mt-1 text-[12px] text-body">
              {isExtension
                ? `${affectedUpgrades} upgrade di grup ${spec.groupLabel} masih berjalan. Tambahan waktu akan mempercepat sisa pembangunannya ${spec.multiplier}x. Maksimal ${MAX_BOOST_QUANTITY} jam per penambahan.`
                : `${affectedUpgrades} upgrade di grup ${spec.groupLabel} akan dipercepat ${spec.multiplier}x. 1 kuantitas berlaku 1 jam, maksimal ${MAX_BOOST_QUANTITY} kuantitas.`}
            </p>
          </div>
          <button
            type="button"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-line bg-transparent text-[16px] text-body hover:bg-[rgba(127,127,127,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4">
            <fieldset disabled={submitting}>
              <legend className="mb-2 text-[11px] font-semibold tracking-[0.08em] uppercase text-body">
                {isExtension ? 'Tambahan durasi' : 'Jumlah kuantitas'}
              </legend>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: MAX_BOOST_QUANTITY }, (_, index) => index + 1).map(
                  (value) => (
                    <label key={value} className={quantityClass}>
                      <input
                        type="radio"
                        name="boost-quantity"
                        value={value}
                        checked={quantity === value}
                        onChange={() => setQuantity(value)}
                        className="sr-only"
                      />
                      <span className="block text-[14px] leading-none font-bold">
                        {value}
                      </span>
                      <span className="mt-1 block text-[9.5px] font-medium opacity-80">
                        {value} jam
                      </span>
                    </label>
                  ),
                )}
              </div>
            </fieldset>

            <div className="mt-4 rounded-lg border border-line bg-[rgba(127,127,127,0.04)] px-3 py-2.5 text-[11.5px] text-body">
              {activeBoost && (
                <div className="flex items-center justify-between gap-2">
                  <span>Sisa durasi saat ini</span>
                  <span className="font-semibold tabular-nums text-heading">
                    {formatCountdown(activeBoost.endsAt, now)}
                  </span>
                </div>
              )}
              <div
                className={`flex items-center justify-between gap-2 ${activeBoost ? 'mt-1' : ''}`}
              >
                <span>{isExtension ? 'Tambahan' : 'Durasi aktif'}</span>
                <span className="font-semibold text-heading">
                  {quantity} jam
                </span>
              </div>
              {activeBoost && (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span>Total setelah ditambah</span>
                  <span className="font-semibold tabular-nums text-heading">
                    {formatCountdown(activeBoost.endsAt + addedDurationMs, now)}
                  </span>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between gap-2">
                <span>Kecepatan</span>
                <span className="font-semibold text-heading">
                  {spec.multiplier}x lebih cepat
                </span>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 text-[11.5px] font-medium text-[#dc2626] dark:text-[#f87171]"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
            <button
              type="button"
              ref={cancelRef}
              className={cancelButtonClass}
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className={activateButtonClass}
              disabled={submitting || affectedUpgrades === 0}
            >
              <Icon>
                <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />
              </Icon>
              {submitting
                ? isExtension
                  ? 'Menambahkan...'
                  : 'Mengaktifkan...'
                : isExtension
                  ? 'Tambah durasi'
                  : 'Aktifkan booster'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
