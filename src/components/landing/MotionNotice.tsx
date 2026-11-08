import {
  disableMotionOverride,
  enableMotionOverride,
  hasMotionOverride,
  prefersReducedMotion,
} from '../../lib/motionPreference.ts';

export default function MotionNotice() {
  if (!prefersReducedMotion()) return null;

  const overridden = hasMotionOverride();

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/50">
      <span>
        {overridden
          ? 'Animasi gerak aktif untuk situs ini.'
          : 'Animasi gerak dimatikan oleh pengaturan perangkat.'}
      </span>
      <button
        type="button"
        onClick={overridden ? disableMotionOverride : enableMotionOverride}
        className="cursor-pointer rounded-md border border-gold/40 px-2.5 py-1 text-[10.5px] font-semibold text-gold transition-colors duration-150 hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {overridden ? 'Matikan animasi' : 'Aktifkan animasi'}
      </button>
    </div>
  );
}
