import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { isMotionAllowed } from '../../lib/motionPreference.ts';

type ParallaxLayerProps = {
  children: ReactNode;
  className?: string;
  speed?: number;
  pointerDepth?: number;
  drift?: number;
  startOnEnter?: boolean;
};

export default function ParallaxLayer({
  children,
  className = '',
  speed = 0.1,
  pointerDepth = 0,
  drift = 0,
  startOnEnter = false,
}: ParallaxLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const section = layer.closest('section');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer: fine)');

    const state = { active: false };
    const pointer = { x: 0, y: 0 };

    const applyTransform = () => {
      frameRef.current = null;
      if (!state.active) return;

      const sectionTop = section?.getBoundingClientRect().top ?? 0;
      const progress = startOnEnter
        ? Math.max(0, window.innerHeight - sectionTop)
        : Math.max(0, -sectionTop);
      const offsetX = progress * drift + pointer.x * pointerDepth;
      const offsetY = progress * speed + pointer.y * pointerDepth * 0.6;

      layer.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    };

    const schedule = () => {
      if (!state.active || frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(applyTransform);
    };

    const handleScroll = () => schedule();

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;

      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
      schedule();
    };

    const resetPointer = () => {
      pointer.x = 0;
      pointer.y = 0;
      schedule();
    };

    const stop = () => {
      if (!state.active) return;

      state.active = false;
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('orientationchange', handleScroll);
      section?.removeEventListener('pointermove', handlePointerMove);
      section?.removeEventListener('pointerleave', resetPointer);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      layer.style.transform = '';
    };

    const start = () => {
      if (!isMotionAllowed() || state.active) {
        if (!isMotionAllowed()) stop();
        return;
      }

      state.active = true;
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll);
      window.addEventListener('orientationchange', handleScroll);

      if (pointerDepth !== 0 && finePointer.matches && section) {
        section.addEventListener('pointermove', handlePointerMove, { passive: true });
        section.addEventListener('pointerleave', resetPointer);
      }

      applyTransform();
    };

    const handleMotionChange = () => {
      if (!isMotionAllowed()) {
        pointer.x = 0;
        pointer.y = 0;
        stop();
        return;
      }

      start();
    };

    const handlePointerCapabilityChange = () => {
      stop();
      start();
    };

    start();
    reduceMotion.addEventListener('change', handleMotionChange);
    finePointer.addEventListener('change', handlePointerCapabilityChange);

    return () => {
      reduceMotion.removeEventListener('change', handleMotionChange);
      finePointer.removeEventListener('change', handlePointerCapabilityChange);
      stop();
    };
  }, [speed, pointerDepth, drift, startOnEnter]);

  return (
    <div ref={layerRef} className={className} aria-hidden="true">
      {children}
    </div>
  );
}
