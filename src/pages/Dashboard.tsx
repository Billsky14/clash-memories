import { panelClass } from '../lib/ui.ts';

const ctaClass =
  'mt-5 inline-flex items-center justify-center gap-1.5 self-start rounded-lg bg-gold px-3.5 py-[9px] text-[12.5px] font-bold whitespace-nowrap text-[#2b1a02] no-underline transition-[filter] duration-150 hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';

const highlights = [
  {
    title: 'Impor JSON',
    detail: 'Tempel snapshot desa dari menu Pengaturan di game.',
  },
  {
    title: 'Timer langsung',
    detail: 'Sisa waktu peningkatan dihitung real-time.',
  },
  {
    title: 'Booster',
    detail: 'Percepat Desa asal, Laboratorium, dan Pet.',
  },
];

export default function Dashboard() {
  return (
    <section
      className={`${panelClass} grid grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] items-center gap-8 px-6 py-8 max-[760px]:grid-cols-1 max-[760px]:gap-6 max-[760px]:px-5 max-[760px]:py-6`}
      aria-labelledby="welcome-title"
    >
      <div>
        <p className="mb-1.5 text-[10.5px] tracking-[0.14em] uppercase text-body">Selamat datang</p>
        <h2
          id="welcome-title"
          className="m-0 text-[22px] font-medium tracking-[-0.02em] text-heading max-[760px]:text-[19px]"
        >
          Pantau peningkatan desa dalam satu tempat
        </h2>
        <p className="mt-2 max-w-[46ch] text-[12.5px] leading-relaxed text-body">
          lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nisl vel tincidunt
          lacinia, nunc nisl aliquam nisl, eget aliquam nunc nisl eu nunc. Sed euismod, nisl vel
          tincidunt lacinia, nunc nisl aliquam nisl, eget aliquam nunc nisl eu nunc.
        </p>
        <a className={ctaClass} href="#monitoring">
          Buka Monitoring
        </a>
      </div>

      <ul className="m-0 list-none rounded-lg border border-line p-0">
        {highlights.map((item, index) => (
          <li key={item.title} className="flex gap-3 px-4 py-3 [&+&]:border-t [&+&]:border-line">
            <span
              className="grid size-6 shrink-0 place-items-center rounded-md bg-chip-bg text-[10px] font-bold text-chip-fg"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div>
              <p className="m-0 text-[12.5px] font-semibold text-heading">{item.title}</p>
              <p className="mt-0.5 text-[11.5px] text-body">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
