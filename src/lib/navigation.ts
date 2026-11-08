export type Page = 'landing' | 'tracker';

const LANDING_SECTION_IDS = ['fitur', 'cara-kerja', 'booster', 'faq'] as const;

export type LandingSectionId = (typeof LANDING_SECTION_IDS)[number];

const landingSectionIdSet = new Set<string>(LANDING_SECTION_IDS);

export function isLandingSectionId(value: string): value is LandingSectionId {
  return landingSectionIdSet.has(value);
}

export function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function getPageFromPath(pathname: string): Page {
  return normalizePathname(pathname) === '/tracker' ? 'tracker' : 'landing';
}

export function getLandingSectionFromPath(pathname: string): LandingSectionId | null {
  const id = normalizePathname(pathname).slice(1);
  return isLandingSectionId(id) ? id : null;
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const method = options.replace ? 'replaceState' : 'pushState';
  window.history[method](null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
