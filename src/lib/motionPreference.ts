const MOTION_OVERRIDE_KEY = 'clash-monitor:motion-override';

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function hasMotionOverride(): boolean {
  try {
    return window.localStorage.getItem(MOTION_OVERRIDE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function isMotionAllowed(): boolean {
  return !prefersReducedMotion() || hasMotionOverride();
}

/**
 * Mirrors the effective motion preference onto the document so CSS can follow
 * the same decision as the JavaScript-driven parallax and reveal effects.
 */
export function applyMotionPreference(): void {
  document.documentElement.dataset.motion = isMotionAllowed() ? 'full' : 'reduced';
}

export function enableMotionOverride(): void {
  try {
    window.localStorage.setItem(MOTION_OVERRIDE_KEY, 'on');
  } catch {
    // Storage can be unavailable (private mode); the reload below still applies.
  }

  window.location.reload();
}

export function disableMotionOverride(): void {
  try {
    window.localStorage.removeItem(MOTION_OVERRIDE_KEY);
  } catch {
    // Nothing else to clean up when storage is unavailable.
  }

  window.location.reload();
}
