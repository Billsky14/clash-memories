import { useEffect, useRef, useState } from 'react';

type AboutModalProps = {
  onClose: () => void;
};

const guideSteps = [
  {
    label: 'Langkah 1',
    title: 'Lorem ipsum dolor sit amet',
    description:
      'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    image: '/assets/img/step-1.png',
    imageAlt:
      'Layar Settings Clash of Clans dengan panah menuju menu More Settings.',
  },
  {
    label: 'Langkah 2',
    title: 'Ut enim ad minim veniam',
    description:
      'Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    image: '/assets/img/step-2.png',
    imageAlt:
      'Layar Settings dengan panah menuju tombol Copy pada Export Village data in JSON format.',
  },
  {
    label: 'Langkah 3',
    title: 'Duis aute irure dolor',
    description:
      'In reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    image: '/assets/img/step-3.png',
    imageAlt:
      'Dialog Impor JSON desa dengan menu klik kanan dan opsi Paste yang disorot.',
  },
];

const infoRows = [
  {
    index: '01',
    label: 'Penyimpanan data',
    body: 'Desa, timer, dan booster disimpan di IndexedDB browser ini. Tidak ada akun atau database server. Data bisa hilang jika penyimpanan situs dibersihkan atau memakai mode incognito.',
  },
  {
    index: '02',
    label: 'Otomasi booster',
    body: 'Booster memampatkan sisa waktu peningkatan secara otomatis: Desa asal 10x, Laboratorium/Pet 24x. Durasi 1–5 jam, bisa diperpanjang, dan hanya satu booster per jenis. Pekerjaan di luar durasi booster tetap berjalan normal.',
  },
  {
    index: '03',
    label: 'Pengambilan data API',
    body: 'Nama, TH, trofi, klan, dan liga diambil sekali per desa lewat proxy RoyaleAPI, lalu dibaca dari penyimpanan lokal. Token API tetap di server. Titik hijau di footer menandakan API aktif.',
  },
];

const TOTAL_STEPS = 1 + guideSteps.length;

const secondaryButtonClass =
  'cursor-pointer rounded-lg border border-line bg-transparent px-3.5 py-[9px] text-[12.5px] font-semibold text-heading hover:bg-[rgba(127,127,127,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const primaryButtonClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gold px-3.5 py-[9px] text-[12.5px] font-bold whitespace-nowrap text-[#2b1a02] transition-[filter] duration-150 hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';

const closeButtonClass =
  'grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-line bg-transparent text-[16px] text-body hover:bg-[rgba(127,127,127,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function GuideSlide({ step }: { step: number }) {
  const guide = guideSteps[step];

  return (
    <div>
      <div className="max-w-[58ch]">
        <p className="m-0 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-body">
          {guide.label} dari {guideSteps.length}
        </p>
        <h3 className="mt-1.5 text-[16px] font-semibold tracking-[-0.01em] text-heading">
          {guide.title}
        </h3>
        <p className="mt-2 text-[11.5px] leading-[1.65] text-body">{guide.description}</p>
      </div>

      <figure className="m-0 mt-4">
        <img
          src={guide.image}
          alt={guide.imageAlt}
          width={880}
          height={580}
          draggable={false}
          decoding="async"
          className="mx-auto block h-auto max-h-[300px] w-auto max-w-full rounded-lg border border-line bg-[rgba(127,127,127,0.04)]"
        />
        <figcaption className="mx-auto mt-2 max-w-[455px] text-[10.5px] leading-snug text-body opacity-80">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </figcaption>
      </figure>
    </div>
  );
}

function InfoSlide() {
  return (
    <div>
      <p className="m-0 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-body">
        Informasi
      </p>
      <p className="mt-1.5 text-[11.5px] leading-[1.65] text-body">
        Catatan singkat soal data dan cara kerja tracker.
      </p>

      <div className="mt-4 border-t border-line">
        {infoRows.map((row) => (
          <div
            key={row.index}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 border-b border-line py-3.5"
          >
            <span className="font-mono text-[10.5px] leading-5 text-body opacity-70">
              {row.index}
            </span>
            <div className="min-w-0">
              <h3 className="m-0 text-[12.5px] font-semibold text-heading">{row.label}</h3>
              <p className="mt-1 text-[11.5px] leading-[1.6] text-body">{row.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-y border-gold/35 bg-gold/[0.07] px-4 py-3.5">
        <p className="m-0 flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] uppercase text-chip-fg">
          <span aria-hidden="true" className="size-1.5 rounded-[1px] bg-gold" />
          Catatan
        </p>
        <p className="mt-1.5 text-[11.5px] leading-[1.6] text-body">
          API resmi tidak menyediakan timer upgrade; timer hanya berasal dari JSON ekspor. Tracker
          bukan aplikasi resmi Supercell. Proxy RoyaleAPI adalah layanan komunitas tanpa SLA, dan
          data lokal dapat terhapus oleh browser.
        </p>
      </div>
    </div>
  );
}

export default function AboutModal({ onClose }: AboutModalProps) {
  const [step, setStep] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isLastStep = step === TOTAL_STEPS - 1;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);

      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    guideSteps.forEach((guide) => {
      const image = new Image();
      image.src = guide.image;
    });
  }, []);

  const title = step < guideSteps.length ? 'Cara pakai' : 'Tentang halaman ini';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-line bg-canvas shadow-2xl min-[760px]:h-[620px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-tracker-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-[18px]">
          <div className="min-w-0">
            <p className="m-0 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-body">
              Tentang tracker · {step + 1}/{TOTAL_STEPS}
            </p>
            <h2
              id="about-tracker-title"
              className="mt-1 text-[16px] font-semibold tracking-[-0.01em] text-heading"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            className={closeButtonClass}
            onClick={onClose}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <p className="sr-only" aria-live="polite">
            Halaman {step + 1} dari {TOTAL_STEPS}
          </p>
          {step < guideSteps.length ? <GuideSlide step={step} /> : <InfoSlide />}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: TOTAL_STEPS }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all duration-200 motion-reduce:transition-none ${
                  index === step ? 'w-5 bg-gold' : 'w-1.5 bg-line'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setStep((current) => current - 1)}
              >
                Sebelumnya
              </button>
            )}
            <button
              type="button"
              className={primaryButtonClass}
              onClick={isLastStep ? onClose : () => setStep((current) => current + 1)}
            >
              {isLastStep ? 'Tutup' : 'Berikutnya'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
