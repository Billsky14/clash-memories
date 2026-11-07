import { useEffect, useRef } from 'react';
import Icon from './Icon.tsx';

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const cancelButtonClass =
  'cursor-pointer rounded-lg border border-line bg-transparent px-3.5 py-[9px] text-[12.5px] font-semibold text-heading hover:bg-[rgba(127,127,127,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60';

const confirmButtonClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#dc2626] px-3.5 py-[9px] text-[12.5px] font-bold whitespace-nowrap text-white transition-[filter] duration-150 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626] disabled:cursor-not-allowed disabled:opacity-60';

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  busyLabel,
  busy,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => cancelRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-line bg-canvas shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div className="flex items-start gap-3 px-5 py-[18px]">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[rgba(220,38,38,0.12)] text-[#dc2626] dark:text-[#f87171]">
            <Icon>
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="m19 6-1 14H6L5 6" />
              <path d="M10 11v5" />
              <path d="M14 11v5" />
            </Icon>
          </span>
          <div className="min-w-0">
            <h2
              id="confirm-dialog-title"
              className="m-0 text-[15px] font-semibold text-heading"
            >
              {title}
            </h2>
            <p id="confirm-dialog-description" className="mt-1 text-[12px] text-body">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          <button
            type="button"
            ref={cancelRef}
            className={cancelButtonClass}
            onClick={onCancel}
            disabled={busy}
          >
            Batal
          </button>
          <button
            type="button"
            className={confirmButtonClass}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
