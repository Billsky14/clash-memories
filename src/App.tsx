import { useEffect, useState } from 'react';
import AppLink from './components/common/AppLink.tsx';
import Icon from './components/common/Icon.tsx';
import {
  getLandingSectionFromPath,
  getPageFromPath,
  isLandingSectionId,
  navigate,
} from './lib/navigation.ts';
import Landing from './pages/Landing.tsx';
import Tracker from './pages/Tracker.tsx';

const currentYear = new Date().getFullYear();

const navLinkBaseClass =
  'group relative flex items-center rounded-lg text-[13.5px] font-medium no-underline transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';

const navLinkExpandedClass =
  'gap-2.5 px-[10px] py-[9px] [&>svg]:size-[17px] [&>svg]:shrink-0 max-[760px]:whitespace-nowrap max-[760px]:px-[9px] max-[760px]:py-[7px] max-[760px]:text-[12px] max-[760px]:[&>svg]:hidden';

const navLinkCollapsedClass =
  'size-11 justify-center p-0 [&>svg]:size-[19px] [&>svg]:shrink-0 max-[760px]:size-10';

const navLinkActiveClass = 'bg-gold/12 text-gold';
const navLinkIdleClass = 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white';

const navItems = [
  {
    label: 'Tracker',
    href: '/tracker',
    page: 'tracker',
    icon: (
      <Icon>
        <path d="M3 12h4l2-7 4 14 2-7h6" />
      </Icon>
    ),
  },
  {
    label: 'Perang',
    href: '/perang',
    icon: (
      <Icon>
        <path d="M4 22V4" />
        <path d="M4 4h12l-2 4 2 4H4" />
      </Icon>
    ),
  },
  {
    label: 'Pengaturan',
    href: '/pengaturan',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </Icon>
    ),
  },
];

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const page = getPageFromPath(pathname);
  const section = getLandingSectionFromPath(pathname);
  const isTracker = page === 'tracker';
  const isCollapsed = page === 'landing';

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);

    window.addEventListener('popstate', handlePopState);

    if (window.location.hash) {
      const legacy = window.location.hash.slice(1);
      const target =
        legacy === 'tracker'
          ? '/tracker'
          : legacy === 'dasbor'
            ? '/'
            : isLandingSectionId(legacy)
              ? `/${legacy}`
              : `${window.location.pathname}${window.location.search}`;

      navigate(target, { replace: true });
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';

    const frame = window.requestAnimationFrame(() => {
      if (section) {
        document.getElementById(section)?.scrollIntoView({ behavior, block: 'start' });
        return;
      }

      window.scrollTo({ top: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, section]);

  useEffect(() => {
    document.title = isTracker
      ? 'Tracker · Clash Monitor'
      : 'Clash Monitor · Pantau Timer Upgrade Desa';
  }, [isTracker]);

  return (
    <div className="flex min-h-svh bg-canvas text-body max-[760px]:flex-col">
      <aside
        className={`sticky top-0 z-30 flex h-svh flex-col bg-sidebar text-[#e8eaf0] transition-[width,padding] duration-300 ease-out max-[760px]:static max-[760px]:h-auto max-[760px]:w-full max-[760px]:gap-2.5 max-[760px]:px-4 max-[760px]:py-3 ${
          isCollapsed ? 'w-[76px] items-center gap-6 px-2 py-6' : 'w-59 gap-7 px-4 py-6'
        }`}
      >
        <AppLink
          href="/"
          title="Halaman awal"
          aria-label="Clash Monitor — halaman awal"
          className={`flex items-center rounded-lg no-underline transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-[760px]:shrink-0 max-[760px]:p-0 ${
            isCollapsed ? 'justify-center p-1' : 'gap-2.5 px-2 py-1'
          }`}
        >
          <img
            src="/ClashOfClansIconsLogoVector.svg.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`shrink-0 object-contain transition-[width,height] duration-300 ${
              isCollapsed ? 'size-10' : 'size-11'
            }`}
          />
          {!isCollapsed && (
            <div>
              <div className="text-[14px] font-bold tracking-[0.2px] text-white">愛Memories</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-sidebar-muted max-[760px]:hidden">
                {isTracker ? 'Tracker' : 'Clash Of Clans'}
              </div>
            </div>
          )}
        </AppLink>

        <nav
          className={`flex flex-col gap-1 max-[760px]:flex-row max-[760px]:gap-1 max-[760px]:overflow-x-auto max-[760px]:scrollbar-none max-[760px]:[&::-webkit-scrollbar]:hidden ${
            isCollapsed ? 'w-full items-center max-[760px]:justify-center' : ''
          }`}
          aria-label="Navigasi utama"
        >
          {!isCollapsed && (
            <div className="mb-1.5 px-2.5 text-[10px] uppercase tracking-[0.14em] text-[#6b7280] max-[760px]:hidden">
              Menu
            </div>
          )}

          {navItems.map((item) => {
            const isActive = item.page === page;
            const tooltip = item.page ? item.label : `${item.label} · Segera hadir`;

            return (
              <AppLink
                key={item.label}
                className={`${navLinkBaseClass} ${
                  isCollapsed ? navLinkCollapsedClass : navLinkExpandedClass
                } ${isActive ? navLinkActiveClass : navLinkIdleClass}`}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                aria-disabled={item.page ? undefined : true}
                aria-label={
                  isCollapsed
                    ? item.page
                      ? item.label
                      : `${item.label} (segera hadir)`
                    : undefined
                }
                title={!isCollapsed && !item.page ? 'Segera hadir' : undefined}
                onClick={(event) => {
                  if (!item.page) event.preventDefault();
                }}
              >
                {item.icon}
                <span className={isCollapsed ? 'sr-only' : undefined}>{item.label}</span>

                {isCollapsed && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-full z-20 ml-3 hidden -translate-y-1/2 rounded-md border border-white/10 bg-[#1b1f29] px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 min-[761px]:block"
                  >
                    {tooltip}
                  </span>
                )}
              </AppLink>
            );
          })}
        </nav>

        {!isCollapsed && (
          <div className="mt-auto flex items-center gap-2 border-t border-white/8 px-2.5 pt-3.5 pb-1 text-[11.5px] text-[#6b7280] max-[760px]:hidden">
            Copyright©{currentYear} 愛Memories.
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isTracker && (
          <header className="flex items-center border-b border-line px-8 py-6.5 max-[760px]:px-4 max-[760px]:py-5">
            <div>
              <p className="mb-1 text-[10.5px] uppercase tracking-[0.14em] text-body">
                Tracker Peningkatan yang sedang berlangsung
              </p>
              <h1 className="m-0 text-[26px] font-medium tracking-[-0.02em] text-heading max-[760px]:text-[22px]">
                Upgrade Tracker
              </h1>
            </div>
          </header>
        )}

        <main
          className={
            isTracker
              ? 'w-full max-w-7xl px-8 pt-7 pb-10 max-[760px]:px-4 max-[760px]:pt-5 max-[760px]:pb-8'
              : 'w-full min-w-0'
          }
        >
          {isTracker ? <Tracker /> : <Landing />}
        </main>
      </div>
    </div>
  );
}
