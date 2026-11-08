import { useRef } from 'react';
import type { ReactNode } from 'react';
import AppLink from '../components/common/AppLink.tsx';
import Icon from '../components/common/Icon.tsx';
import HeroPreview from '../components/landing/HeroPreview.tsx';
import MotionNotice from '../components/landing/MotionNotice.tsx';
import ParallaxLayer from '../components/landing/ParallaxLayer.tsx';
import { BOOST_SPECS } from '../lib/boosts.ts';
import useScrollReveal from '../lib/useScrollReveal.ts';

const primaryCtaClass =
  'inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3 text-[12.5px] font-bold whitespace-nowrap text-[#2b1a02] no-underline transition-[filter] duration-150 hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [&>svg]:size-4';

const secondaryCtaClass =
  'inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-5 py-3 text-[12.5px] font-semibold whitespace-nowrap text-white no-underline transition-colors duration-150 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 [&>svg]:size-4';

const arrowPath = (
  <>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </>
);

const lightningPath = <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />;

const currentYear = new Date().getFullYear();

const featureItems: Array<{
  title: string;
  detail: string;
  icon: ReactNode;
  iconClass: string;
}> = [
  {
    title: 'Impor sekali, pantau terus',
    detail:
      'Tempel snapshot JSON desa. Semua upgrade aktif langsung diubah menjadi timer yang bisa dipantau.',
    iconClass: 'bg-gold/12 text-gold',
    icon: (
      <Icon>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </Icon>
    ),
  },
  {
    title: 'Timer yang tidak berhenti',
    detail:
      'Sisa waktu dihitung dari timestamp absolut, bukan hitungan mundur yang berhenti saat tab ditutup.',
    iconClass: 'bg-accent-soft text-accent',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </Icon>
    ),
  },
  {
    title: 'Booster 10x dan 24x',
    detail:
      'Aktifkan booster untuk Desa asal, Laboratorium, atau Pet. Sisa pekerjaan diproyeksikan ulang otomatis.',
    iconClass: 'bg-green-soft text-green',
    icon: (
      <Icon>
        <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />
      </Icon>
    ),
  },
  {
    title: 'Data tetap di perangkat',
    detail:
      'Akun, upgrade, dan booster disimpan di IndexedDB browser. Tidak ada server dan tidak ada data yang dikirim keluar.',
    iconClass: 'bg-[rgba(127,127,127,0.12)] text-heading',
    icon: (
      <Icon>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
        <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </Icon>
    ),
  },
];

const steps = [
  {
    title: 'Ekspor data desa',
    detail:
      'Buka Pengaturan > Pengaturan lainnya > Ekspor data Desa dalam format JSON di game.',
  },
  {
    title: 'Tempel snapshot',
    detail:
      'Impor JSON di halaman Tracker. Timer langsung dihitung dari timestamp snapshot, bukan dari waktu impor.',
  },
  {
    title: 'Pantau dan booster',
    detail:
      'Lihat sisa waktu real-time, aktifkan booster, dan perpanjang durasinya tanpa menghitung manual.',
  },
];

const boosterItems = [
  {
    kind: 'builder' as const,
    detail:
      'Mempercepat bangunan, hero, trap, dan wall di desa asal selama booster aktif.',
    accentClass: 'text-gold',
    iconClass: 'bg-gold/12',
    borderClass: 'border-gold/20',
  },
  {
    kind: 'laboratory' as const,
    detail:
      'Mempercepat riset pasukan, spell, dan siege machine di laboratorium.',
    accentClass: 'text-accent',
    iconClass: 'bg-accent-soft',
    borderClass: 'border-accent/20',
  },
  {
    kind: 'pet' as const,
    detail:
      'Mempercepat upgrade peliharaan tanpa menunggu timer normal yang panjang.',
    accentClass: 'text-green',
    iconClass: 'bg-green-soft',
    borderClass: 'border-green/20',
  },
];

const faqItems = [
  {
    question: 'Apakah data desa dikirim ke server?',
    answer:
      'Tidak. Semua data akun, upgrade, dan booster disimpan di IndexedDB browser ini. Aplikasi tidak memakai backend atau API.',
  },
  {
    question: 'Apakah timer berhenti saat browser ditutup?',
    answer:
      'Tidak. Timer memakai timestamp akhir yang absolut, jadi sisa waktu tetap dihitung dari jam perangkat saat halaman dibuka kembali.',
  },
  {
    question: 'Bagaimana cara memperbarui desa?',
    answer:
      'Gunakan tombol Impor ulang pada kartu desa, lalu tempel snapshot JSON terbaru. Upgrade lama akan diganti dan booster aktif akan dibatalkan.',
  },
  {
    question: 'Apakah booster dihitung otomatis?',
    answer:
      'Ya. Saat booster diaktifkan atau diperpanjang, sisa pekerjaan setiap upgrade di grup target dihitung ulang sesuai multiplier dan durasi booster.',
  },
];

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  detail: string;
  dark?: boolean;
};

function SectionHeading({ eyebrow, title, detail, dark = false }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl" data-reveal="">
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
          dark ? 'text-gold' : 'text-accent'
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 text-[clamp(1.8rem,3vw,2.6rem)] font-semibold tracking-[-0.03em] ${
          dark ? 'text-white' : 'text-heading'
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-3 text-[13.5px] leading-relaxed ${
          dark ? 'text-white/55' : 'text-body'
        }`}
      >
        {detail}
      </p>
    </div>
  );
}

export default function Landing() {
  const pageRef = useRef<HTMLDivElement>(null);
  useScrollReveal(pageRef);

  return (
    <div ref={pageRef} className="min-w-0 overflow-x-clip">
      <section className="relative overflow-hidden bg-[#080a10] px-6 pt-14 pb-20 text-white sm:px-8 lg:px-12 lg:pt-20 lg:pb-28">
        <ParallaxLayer
          speed={0.24}
          pointerDepth={7}
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
          <div className="landing-grid absolute inset-0 opacity-50" />
        </ParallaxLayer>

        <ParallaxLayer
          speed={0.42}
          pointerDepth={18}
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
          <div className="absolute -top-40 left-[8%] size-[34rem] rounded-full bg-gold/[0.14] blur-[110px]" />
          <div className="absolute top-10 -right-32 size-[30rem] rounded-full bg-accent/[0.18] blur-[110px]" />
          <div className="absolute top-[30%] left-[6%] h-px w-[36%] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <div
            className="ambient-float absolute top-[22%] right-[10%] size-[24rem] rounded-full border border-gold/25"
            style={{ animationDelay: '-4s' }}
          />
        </ParallaxLayer>

        <ParallaxLayer
          speed={-0.3}
          pointerDepth={26}
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
          <div className="absolute top-1/3 left-[42%] size-72 rounded-full bg-gold/[0.14] blur-[90px]" />
          <div className="absolute right-[18%] bottom-0 size-64 rounded-full bg-accent/[0.14] blur-[90px]" />
          <div
            className="ambient-drift absolute top-[12%] right-[4%] hidden size-[32rem] rounded-full border border-white/10 sm:block"
            style={{ animationDelay: '-7s' }}
          />
          <div
            className="ambient-float absolute top-[26%] right-[11%] size-[22rem] rounded-full border border-gold/25"
            style={{ animationDelay: '-1.5s' }}
          />
          <div className="absolute bottom-[12%] left-[10%] h-px w-[30%] -rotate-12 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        </ParallaxLayer>

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
          <div className="max-w-2xl">
            <p
              data-reveal=""
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-white/60 uppercase"
            >
              <span className="size-1.5 rounded-full bg-gold" aria-hidden="true" />
              Timer desa · Booster · Data lokal
            </p>

            <h1
              data-reveal=""
              style={{ animationDelay: '80ms' }}
              className="mt-6 text-[clamp(2.6rem,5vw,4.6rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-white"
            >
              Semua timer upgrade desamu,{' '}
              <span className="text-gold">dalam satu layar.</span>
            </h1>

            <p
              data-reveal=""
              style={{ animationDelay: '160ms' }}
              className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/60"
            >
              Impor snapshot desa, pantau sisa waktu secara real-time, dan hitung
              booster 10x/24x tanpa membuka game terus-menerus.
            </p>

            <div
              data-reveal=""
              style={{ animationDelay: '240ms' }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <AppLink href="/tracker" className={primaryCtaClass}>
                Buka Tracker
                <Icon>{arrowPath}</Icon>
              </AppLink>
              <AppLink href="/cara-kerja" className={secondaryCtaClass}>
                Lihat cara kerja
                <Icon>
                  <path d="M12 5v14" />
                  <path d="m6 13 6 6 6-6" />
                </Icon>
              </AppLink>
            </div>

            <dl
              data-reveal=""
              style={{ animationDelay: '320ms' }}
              className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-5"
            >
              <div>
                <dt className="text-[9.5px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                  Booster
                </dt>
                <dd className="mt-1 text-[15px] font-bold text-white">10x / 24x</dd>
              </div>
              <div>
                <dt className="text-[9.5px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                  Update timer
                </dt>
                <dd className="mt-1 text-[15px] font-bold text-white">1 detik</dd>
              </div>
              <div>
                <dt className="text-[9.5px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                  Penyimpanan
                </dt>
                <dd className="mt-1 text-[15px] font-bold text-white">Lokal</dd>
              </div>
            </dl>

            <MotionNotice />
          </div>

          <ParallaxLayer
            speed={0.2}
            pointerDepth={10}
            className="relative will-change-transform"
          >
            <div data-reveal="" style={{ animationDelay: '180ms' }}>
              <HeroPreview />
            </div>
          </ParallaxLayer>
        </div>
      </section>

      <section
        id="fitur"
        className="relative scroll-mt-8 overflow-hidden border-b border-line bg-canvas px-6 py-20 sm:px-8 lg:px-12"
      >
        <ParallaxLayer
          speed={0.22}
          drift={-0.05}
          pointerDepth={8}
          startOnEnter
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
          <div
            className="ambient-drift absolute -top-24 right-[4%] hidden size-[26rem] rounded-full border-2 border-accent/25 sm:block"
            style={{ animationDelay: '-5s' }}
          />
          <div
            className="ambient-float absolute top-24 right-[18%] size-48 rounded-full border border-gold/40"
            style={{ animationDelay: '-2s' }}
          />
          <div className="absolute bottom-0 left-[2%] size-72 rounded-full bg-gold/[0.14] blur-[80px]" />
          <div className="absolute top-10 right-[10%] size-[18rem] rounded-full bg-accent/[0.12] blur-[90px]" />
        </ParallaxLayer>

        <div className="relative mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Fitur utama"
            title="Semua yang dibutuhkan untuk memantau desa."
            detail="Dibuat untuk mengurangi bolak-balik membuka game. Fokus ke keputusan upgrade, bukan menghitung sisa waktu."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureItems.map((feature, index) => (
              <article
                key={feature.title}
                data-reveal=""
                style={{ animationDelay: `${index * 80}ms` }}
                className="rounded-xl border border-line bg-[rgba(127,127,127,0.025)] p-5 transition-colors duration-150 hover:border-gold/30"
              >
                <span
                  className={`grid size-10 place-items-center rounded-lg ${feature.iconClass} [&>svg]:size-5`}
                >
                  {feature.icon}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-heading">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-body">
                  {feature.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="cara-kerja"
        className="relative scroll-mt-8 overflow-hidden border-b border-line bg-[rgba(127,127,127,0.035)] px-6 py-20 sm:px-8 lg:px-12"
      >
        <ParallaxLayer
          speed={-0.2}
          drift={0.05}
          pointerDepth={8}
          startOnEnter
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
          <div className="absolute top-8 -left-24 size-80 rounded-full bg-gold/[0.16] blur-[80px]" />
          <div className="absolute -right-16 bottom-0 size-96 rounded-full bg-accent/[0.12] blur-[90px]" />
          <div
            className="ambient-float absolute bottom-12 left-[18%] hidden size-60 rounded-full border-2 border-gold/30 sm:block"
            style={{ animationDelay: '-3s' }}
          />
          <div
            className="ambient-drift absolute top-16 right-[12%] size-36 rounded-full border border-accent/35"
            style={{ animationDelay: '-6s' }}
          />
        </ParallaxLayer>

        <div className="relative mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Cara kerja"
            title="Dari snapshot ke timer dalam tiga langkah."
            detail="Tidak perlu instalasi tambahan atau menghubungkan akun. Cukup tempel data desa yang sudah kamu ekspor."
          />

          <ol className="mt-10 grid list-none gap-4 p-0 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                data-reveal=""
                style={{ animationDelay: `${index * 80}ms` }}
                className="relative rounded-xl border border-line bg-canvas p-5"
              >
                <span className="font-mono text-[32px] leading-none font-bold text-gold/35">
                  0{index + 1}
                </span>
                <h3 className="mt-5 text-[15px] font-semibold text-heading">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-body">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="booster"
        className="relative scroll-mt-8 overflow-hidden bg-[#0b0e15] px-6 py-20 text-white sm:px-8 lg:px-12"
      >
        <ParallaxLayer
          speed={0.24}
          drift={-0.04}
          pointerDepth={10}
          startOnEnter
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
          <div className="absolute top-10 -left-24 size-80 rounded-full bg-gold/[0.16] blur-[90px]" />
          <div className="absolute -right-20 bottom-0 size-96 rounded-full bg-accent/[0.14] blur-[100px]" />
          <div
            className="ambient-drift absolute top-14 right-[8%] hidden size-72 rounded-full border-2 border-gold/25 sm:block"
            style={{ animationDelay: '-4s' }}
          />
          <div
            className="ambient-float absolute bottom-10 left-[22%] size-40 rounded-full border border-white/15"
            style={{ animationDelay: '-2.5s' }}
          />
        </ParallaxLayer>

        <div className="relative mx-auto max-w-7xl">
          <SectionHeading
            dark
            eyebrow="Booster"
            title="Percepat upgrade tanpa hitung manual."
            detail="Pilih durasi booster, lalu biarkan sisa pekerjaan diproyeksikan ulang. Booster yang masih aktif bisa langsung diperpanjang."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {boosterItems.map((item, index) => {
              const spec = BOOST_SPECS[item.kind];

              return (
                <article
                  key={item.kind}
                  data-reveal=""
                  style={{ animationDelay: `${index * 80}ms` }}
                  className={`rounded-xl border ${item.borderClass} bg-white/[0.035] p-5`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`grid size-10 place-items-center rounded-lg ${item.iconClass} ${item.accentClass} [&>svg]:size-5`}
                    >
                      <Icon>{lightningPath}</Icon>
                    </span>
                    <span
                      className={`font-mono text-[28px] font-bold tracking-[-0.04em] ${item.accentClass}`}
                    >
                      {spec.multiplier}x
                    </span>
                  </div>
                  <h3 className="mt-5 text-[15px] font-semibold text-white">
                    {spec.label}
                  </h3>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/50">
                    {item.detail}
                  </p>
                  <p className="mt-4 text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase">
                    {spec.groupLabel}
                  </p>
                </article>
              );
            })}
          </div>

          <div
            data-reveal=""
            style={{ animationDelay: '240ms' }}
            className="mt-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="max-w-2xl text-[12px] leading-relaxed text-white/55">
              Satu kuantitas berlaku satu jam. Booster bisa diperpanjang saat masih
              aktif tanpa mempercepat timer yang sudah terkompresi dua kali.
            </p>
            <AppLink href="/tracker" className={primaryCtaClass}>
              Buka Tracker
              <Icon>{arrowPath}</Icon>
            </AppLink>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="relative scroll-mt-8 overflow-hidden bg-canvas px-6 py-20 sm:px-8 lg:px-12"
      >
        <ParallaxLayer
          speed={0.18}
          drift={0.04}
          pointerDepth={6}
          startOnEnter
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
          <div className="absolute -top-20 right-[2%] size-80 rounded-full bg-accent/[0.1] blur-[90px]" />
          <div className="absolute bottom-0 left-[28%] size-64 rounded-full bg-gold/[0.12] blur-[80px]" />
          <div
            className="ambient-float absolute right-[10%] -bottom-8 size-40 rounded-full border-2 border-accent/20 sm:right-[14%] sm:-bottom-10 sm:size-64"
            style={{ animationDelay: '-4s' }}
          />
        </ParallaxLayer>

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div data-reveal="">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-accent uppercase">
              FAQ
            </p>
            <h2 className="mt-3 text-[clamp(1.8rem,3vw,2.6rem)] font-semibold tracking-[-0.03em] text-heading">
              Pertanyaan yang sering muncul.
            </h2>
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-body">
              Beberapa hal yang perlu diketahui sebelum mulai memantau desa.
            </p>
          </div>

          <div
            data-reveal=""
            style={{ animationDelay: '120ms' }}
            className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-[rgba(127,127,127,0.02)]"
          >
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="group px-5 py-4 [&[open]_.faq-icon]:rotate-45"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-semibold text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span className="faq-icon grid size-7 shrink-0 place-items-center rounded-full border border-line text-body transition-transform duration-150">
                    <Icon>
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </Icon>
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-body">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0b0e15] px-6 py-20 text-white sm:px-8 lg:px-12">
        <ParallaxLayer
          speed={0.16}
          pointerDepth={6}
          startOnEnter
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
          <div className="absolute top-1/2 left-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.14] blur-[110px]" />
          <div
            className="ambient-drift absolute top-1/2 left-1/2 hidden size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold/20 sm:block"
            style={{ animationDelay: '-6s' }}
          />
          <div
            className="ambient-float absolute top-1/2 left-1/2 size-[16rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
            style={{ animationDelay: '-2s' }}
          />
        </ParallaxLayer>

        <div data-reveal="" className="relative mx-auto max-w-4xl text-center">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-gold uppercase">
            Siap mulai?
          </p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3.4rem)] font-semibold tracking-[-0.04em] text-white">
            Desa tetap jalan. Timer-nya jangan hilang.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[13.5px] leading-relaxed text-white/55">
            Impor snapshot pertamamu dan lihat semua upgrade aktif dalam satu layar.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <AppLink href="/tracker" className={primaryCtaClass}>
              Buka Tracker
              <Icon>{arrowPath}</Icon>
            </AppLink>
            <AppLink href="/fitur" className={secondaryCtaClass}>
              Pelajari fitur
            </AppLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 bg-[#080a10] px-6 py-10 text-white/50 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <AppLink
              href="/"
              className="flex items-center gap-3 rounded-lg no-underline transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <img
                src="/ClashOfClansIconsLogoVector.svg.png"
                alt=""
                aria-hidden="true"
                draggable={false}
                className="size-9 shrink-0 object-contain"
              />
              <span>
                <span className="block text-[13px] font-bold text-white">
                  Clash Monitor
                </span>
                <span className="mt-0.5 block text-[10px] tracking-[0.14em] text-white/35 uppercase">
                  愛Memories
                </span>
              </span>
            </AppLink>
            <p className="mt-4 text-[11.5px] leading-relaxed">
              Pantau timer upgrade desa, hitung booster, dan simpan data di
              perangkatmu sendiri.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-10 gap-y-6 text-[11.5px]">
            <div>
              <p className="text-[9.5px] font-semibold tracking-[0.16em] text-white/30 uppercase">
                Navigasi
              </p>
              <ul className="mt-3 list-none space-y-2 p-0">
                <li>
                  <AppLink
                    href="/tracker"
                    className="text-white/55 no-underline transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Tracker
                  </AppLink>
                </li>
                <li>
                  <AppLink
                    href="/fitur"
                    className="text-white/55 no-underline transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Fitur
                  </AppLink>
                </li>
                <li>
                  <AppLink
                    href="/cara-kerja"
                    className="text-white/55 no-underline transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Cara kerja
                  </AppLink>
                </li>
                <li>
                  <AppLink
                    href="/faq"
                    className="text-white/55 no-underline transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    FAQ
                  </AppLink>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[9.5px] font-semibold tracking-[0.16em] text-white/30 uppercase">
                Catatan
              </p>
              <p className="mt-3 max-w-[26ch] text-[11px] leading-relaxed text-white/40">
                Proyek penggemar tidak resmi. Tidak berafiliasi dengan Supercell.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-white/8 pt-5 text-[10.5px] text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Clash Monitor</p>
          <p>Dibuat untuk komunitas Clash of Clans.</p>
        </div>
      </footer>
    </div>
  );
}
