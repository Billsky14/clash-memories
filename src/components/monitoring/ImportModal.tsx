import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { normalizeTag } from '../../lib/accountImport.ts';
import { importAccount } from '../../lib/database.ts';
import type { ImportResult } from '../../lib/types.ts';
import Icon from '../common/Icon.tsx';

type ImportModalProps = {
  expectedTag?: string;
  onClose: () => void;
  onImported: (result: ImportResult) => void;
};

function getPayloadTag(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  return normalizeTag((payload as { tag?: unknown }).tag);
}

const cancelButtonClass =
  'cursor-pointer rounded-lg border border-line bg-transparent px-3.5 py-[9px] text-[12.5px] font-semibold text-heading hover:bg-[rgba(127,127,127,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60';

const importButtonClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gold px-3.5 py-[9px] text-[12.5px] font-bold whitespace-nowrap text-[#2b1a02] transition-[filter] duration-150 hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60';

export default function ImportModal({ expectedTag, onClose, onImported }: ImportModalProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 0);
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

    let payload: unknown;

    try {
      payload = JSON.parse(text);
    } catch {
      setError('JSON tidak valid. Periksa kembali teks yang dipaste.');
      return;
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      setError('JSON harus berupa objek desa.');
      return;
    }

    if (expectedTag && getPayloadTag(payload) !== expectedTag) {
      setError(`JSON ini bukan untuk desa ${expectedTag}.`);
      return;
    }

    setSubmitting(true);

    try {
      const result = await importAccount(payload);
      onImported(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Gagal mengimpor JSON.');
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
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-line bg-canvas shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-json-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-[18px]">
          <div>
            <h2 id="import-json-title" className="m-0 text-[15px] font-medium text-heading">
              {expectedTag ? `Perbarui desa ${expectedTag}` : 'Impor JSON desa'}
            </h2>
            <p className="mt-1 text-[11.5px] text-body">
              {expectedTag
                ? 'Paste snapshot terbaru untuk desa ini. Timer dihitung dari timestamp snapshot.'
                : 'Paste satu JSON desa. Timer dihitung dari timestamp snapshot.'}
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

        <form className="flex min-h-0 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <label
              htmlFor="account-json"
              className="mb-1.5 block text-[11px] font-semibold tracking-[0.08em] uppercase text-body"
            >
              Pengaturan &gt; Pengaturan lainnya &gt; Ekspor data Desa dalam format JSON.
            </label>
            <textarea
              id="account-json"
              ref={textareaRef}
              className="block max-h-[45vh] min-h-[240px] w-full resize-y rounded-lg border border-line bg-canvas px-3 py-2.5 font-mono text-[11px] leading-relaxed text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={`Contoh: {"tag":"#ABCD12345","buildings":[{"data":1000023,"lvl":10,"timer":167294}]}`}
              spellCheck={false}
              autoComplete="off"
              disabled={submitting}
            />
            {error && (
              <p
                role="alert"
                className="mt-2 text-[11.5px] font-medium text-[#dc2626] dark:text-[#f87171]"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
            <button
              type="button"
              className={cancelButtonClass}
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className={importButtonClass}
              disabled={submitting || text.trim().length === 0}
            >
              <Icon>
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </Icon>
              {submitting
                ? expectedTag
                  ? 'Memperbarui...'
                  : 'Mengimpor...'
                : expectedTag
                  ? 'Perbarui'
                  : 'Impor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
