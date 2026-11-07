import { useEffect, useState } from 'react';
import Icon from './components/common/Icon.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Monitoring from './pages/Monitoring.tsx';

type Page = 'dasbor' | 'monitoring';

function getPageFromHash(): Page | null {
  if (window.location.hash === '#monitoring') return 'monitoring';
  if (window.location.hash === '#dasbor') return 'dasbor';
  return null;
}

const navLinkClass =
  'flex items-center gap-2.5 rounded-lg px-[10px] py-[9px] text-[13.5px] font-medium no-underline transition-colors duration-150 max-[760px]:whitespace-nowrap max-[760px]:px-[9px] max-[760px]:py-[7px] max-[760px]:text-[12px] [&>svg]:size-[17px] [&>svg]:shrink-0 max-[760px]:[&>svg]:hidden';

const navLinkActiveClass = 'bg-gold/12 text-gold';

const navLinkIdleClass = 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white';

const navItems = [
  {
    label: 'Monitoring',
    href: '#monitoring',
    page: 'monitoring',
    icon: (
      <Icon>
        <path d="M3 12h4l2-7 4 14 2-7h6" />
      </Icon>
    ),
  },
  {
    label: 'Perang',
    href: '#perang',
    icon: (
      <Icon>
        <path d="M4 22V4" />
        <path d="M4 4h12l-2 4 2 4H4" />
      </Icon>
    ),
  },
  {
    label: 'Pengaturan',
    href: '#pengaturan',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </Icon>
    ),
  },
];

export default function Home() {
  const [page, setPage] = useState<Page>(() => getPageFromHash() ?? 'dasbor');

  useEffect(() => {
    const handleHashChange = () => {
      const nextPage = getPageFromHash();
      if (nextPage) setPage(nextPage);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isMonitoring = page === 'monitoring';

  useEffect(() => {
    document.title = isMonitoring ? 'Monitoring · Clash Monitor' : 'Dasbor · Clash Monitor';
  }, [isMonitoring]);

  return (
    <div className="flex min-h-svh bg-canvas text-body max-[760px]:flex-col">
      <aside className="sticky top-0 flex h-svh w-[236px] flex-col gap-7 bg-sidebar px-4 py-6 text-[#e8eaf0] max-[760px]:static max-[760px]:h-auto max-[760px]:w-full max-[760px]:gap-2.5 max-[760px]:px-4 max-[760px]:py-3">
        <a
          href="#dasbor"
          title="Halaman awal"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1 no-underline transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-[760px]:shrink-0 max-[760px]:p-0"
        >
          <img
            src="/ClashOfClansIconsLogoVector.svg.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="size-11 shrink-0 object-contain"
          />
          <div>
            <div className="text-[14px] font-bold tracking-[0.2px] text-white">愛Memories</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-sidebar-muted max-[760px]:hidden">
              {isMonitoring ? 'Monitoring' : 'Clash Of Clans'}
            </div>
          </div>
        </a>

        <nav
          className="flex flex-col gap-1 max-[760px]:flex-row max-[760px]:gap-1 max-[760px]:overflow-x-auto max-[760px]:[scrollbar-width:none] max-[760px]:[&::-webkit-scrollbar]:hidden"
          aria-label="Navigasi utama"
        >
          <div className="mb-1.5 px-2.5 text-[10px] uppercase tracking-[0.14em] text-[#6b7280] max-[760px]:hidden">
            Menu
          </div>
          {navItems.map((item) => {
            const isActive = item.page === page;

            return (
              <a
                key={item.label}
                className={`${navLinkClass} ${isActive ? navLinkActiveClass : navLinkIdleClass}`}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                aria-disabled={item.page ? undefined : true}
                title={item.page ? undefined : 'Segera hadir'}
                onClick={(event) => {
                  if (!item.page) event.preventDefault();
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-2 border-t border-white/8 px-2.5 pt-3.5 pb-1 text-[11.5px] text-[#6b7280] max-[760px]:hidden">
          <span className="size-1.5 shrink-0 rounded-full bg-green" aria-hidden="true" />
          Data tersimpan di perangkat ini
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isMonitoring && (
          <header className="flex items-center border-b border-line px-8 py-[26px] max-[760px]:px-4 max-[760px]:py-5">
            <div>
              <p className="mb-1 text-[10.5px] uppercase tracking-[0.14em] text-body">
                Pemantauan Peningkatan
              </p>
              <h1 className="m-0 text-[26px] font-medium tracking-[-0.02em] text-heading max-[760px]:text-[22px]">
                Monitoring
              </h1>
            </div>
          </header>
        )}

        <main className="w-full max-w-[1280px] px-8 pt-7 pb-10 max-[760px]:px-4 max-[760px]:pt-5 max-[760px]:pb-8">
          {isMonitoring ? <Monitoring /> : <Dashboard />}
        </main>
      </div>
    </div>
  );
}
