import Icon from '../common/Icon.tsx';

const lightningPath = <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />;

const upgrades = [
  {
    name: 'Eagle Artillery',
    level: 'Level 5 → 6',
    work: '02:14:08',
    clock: '00:13:24',
    progress: 'w-[68%]',
  },
  {
    name: 'Archer Queen',
    level: 'Level 89 → 90',
    work: '05:42:11',
    clock: '00:34:13',
    progress: 'w-[42%]',
  },
  {
    name: 'Wall',
    level: 'Level 16 → 17',
    work: '01:08:52',
    clock: '00:06:53',
    progress: 'w-[84%]',
  },
];

export default function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[430px]" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[32px] bg-[radial-gradient(circle_at_30%_20%,rgba(240,180,76,0.18),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(170,59,255,0.18),transparent_50%)] blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#10131b]/95 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[9.5px] uppercase tracking-[0.16em] text-white/40">
              Desa utama
            </p>
            <p className="mt-1 truncate font-mono text-[17px] font-bold text-white">
              #PR88UUYQL
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-white/65">
              TH 18
            </span>
            <span className="rounded-md bg-green-soft px-2 py-1 text-[10px] font-semibold text-green">
              Aktif
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/20 bg-gold/[0.06] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-md bg-gold text-[#2b1a02] [&>svg]:size-3">
                <Icon>{lightningPath}</Icon>
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gold">
                  Desa asal
                </p>
                <p className="text-[9px] text-white/45">Booster tukang aktif</p>
              </div>
            </div>
            <span className="font-mono text-[11px] font-bold tabular-nums text-gold">
              00:42:18
            </span>
          </div>

          <ul className="mt-2 list-none p-0">
            {upgrades.map((upgrade) => (
              <li
                key={upgrade.name}
                className="border-b border-white/6 py-3 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-white/90">
                      {upgrade.name}
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-white/35">{upgrade.level}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[11.5px] font-bold tabular-nums text-gold">
                      {upgrade.work}
                    </p>
                    <p className="font-mono text-[9px] tabular-nums text-white/40">
                      {upgrade.clock}
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full bg-linear-to-r from-gold to-[#ffd98a] ${upgrade.progress}`}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-1 flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-accent" />
              <span className="text-[10.5px] text-white/55">Laboratorium</span>
            </div>
            <span className="text-[10px] font-semibold text-white/75">24x siap</span>
          </div>
        </div>
      </div>

      <div className="absolute top-[34%] -left-20 hidden rounded-lg border border-white/10 bg-[#151923]/95 px-3 py-2 shadow-lg min-[1280px]:block">
        <p className="text-[9px] uppercase tracking-[0.14em] text-white/40">Timer</p>
        <p className="text-[11px] font-semibold text-white">Real-time</p>
      </div>

      <div className="absolute -right-20 bottom-10 hidden rounded-lg border border-white/10 bg-[#151923]/95 px-3 py-2 shadow-lg min-[1280px]:block">
        <p className="text-[9px] uppercase tracking-[0.14em] text-white/40">
          Penyimpanan
        </p>
        <p className="text-[11px] font-semibold text-white">Lokal</p>
      </div>
    </div>
  );
}
