import { useEffect } from 'react';
import type { ToastMessage } from '../../lib/types.ts';
import Icon from './Icon.tsx';

type ToastStackProps = {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
};

type ToastItemProps = {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 8_000);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const toneClass =
    toast.tone === 'success'
      ? 'bg-green-soft text-green'
      : toast.tone === 'error'
        ? 'bg-[rgba(220,38,38,0.12)] text-[#dc2626] dark:text-[#f87171]'
        : 'bg-chip-bg text-chip-fg';

  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border border-line bg-canvas p-3.5 shadow-lg"
      role="status"
    >
      <span className={`grid size-7 shrink-0 place-items-center rounded-full ${toneClass}`}>
        <Icon>
          {toast.tone === 'success' ? (
            <path d="m5 13 4 4L19 7" />
          ) : toast.tone === 'error' ? (
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5" />
              <path d="M12 16h.01" />
            </>
          )}
        </Icon>
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[12.5px] font-semibold text-heading">{toast.title}</p>
        {toast.detail && <p className="mt-0.5 text-[11px] text-body">{toast.detail}</p>}
      </div>
      <button
        type="button"
        className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-[14px] text-body hover:bg-[rgba(127,127,127,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={() => onDismiss(toast.id)}
        aria-label="Tutup pemberitahuan"
      >
        ×
      </button>
    </div>
  );
}

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed right-4 bottom-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
