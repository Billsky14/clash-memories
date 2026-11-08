import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { isMotionAllowed } from './motionPreference.ts';

const revealSelector = '[data-reveal]';
const resetBuffer = 72;

/**
 * Reveals every `[data-reveal]` element inside the root whenever it enters the
 * viewport, in both scroll directions. The root gets `data-reveal-enabled`
 * before paint so hidden content never flashes, and reduced-motion users keep
 * the content visible without animation.
 *
 * Visibility is sampled from `getBoundingClientRect()` on a throttled scroll
 * frame instead of a one-shot `IntersectionObserver`, which can skip elements
 * during fast scrolls. `data-revealed` is only cleared once the element is well
 * outside the viewport, so re-entry replays the animation without flicker.
 */
export default function useScrollReveal(rootRef: RefObject<HTMLElement | null>): void {
  const frameRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(revealSelector));
    if (targets.length === 0) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const state = { active: false };

    const check = () => {
      frameRef.current = null;
      if (!state.active) return;

      const viewportHeight = window.innerHeight;
      const toReveal: HTMLElement[] = [];
      const toReset: HTMLElement[] = [];

      for (const target of targets) {
        const rect = target.getBoundingClientRect();
        const revealed = target.dataset.revealed === 'true';

        if (rect.top < viewportHeight && rect.bottom > 0) {
          if (!revealed) toReveal.push(target);
          continue;
        }

        if (rect.bottom < -resetBuffer || rect.top > viewportHeight + resetBuffer) {
          if (revealed) toReset.push(target);
        }
      }

      for (const target of toReveal) {
        target.dataset.revealed = 'true';
      }

      for (const target of toReset) {
        delete target.dataset.revealed;
      }
    };

    const schedule = () => {
      if (!state.active || frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(check);
    };

    const stop = () => {
      if (!state.active) return;

      state.active = false;
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      delete root.dataset.revealEnabled;

      for (const target of targets) {
        delete target.dataset.revealed;
      }
    };

    const start = () => {
      if (!isMotionAllowed() || state.active) return;

      state.active = true;
      root.dataset.revealEnabled = 'true';
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      window.addEventListener('orientationchange', schedule);

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserverRef.current = new ResizeObserver(schedule);
        resizeObserverRef.current.observe(root);
      }

      check();
    };

    const handleMotionChange = () => {
      if (isMotionAllowed()) {
        start();
        return;
      }

      stop();
    };

    reduceMotion.addEventListener('change', handleMotionChange);
    start();

    return () => {
      reduceMotion.removeEventListener('change', handleMotionChange);
      stop();
    };
  }, [rootRef]);
}
