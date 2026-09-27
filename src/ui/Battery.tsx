import { batteryRgb } from './batteryColor';

interface Props {
  /** 0–100. */
  level: number;
  /** Grey: the day is off (before hours, done, weekend). */
  idle?: boolean;
  /** No breathing or shine (the day is off, or nothing is draining). */
  still?: boolean;
  /** Faded behind a question ("Did you step away?"). */
  dim?: boolean;
  label: string;
}

/**
 * The product's metaphor: 220 × 440, 6 px ink outline, 12 px inset, 72 × 16 cap,
 * with a 1100 px halo of the same colour that grows stronger as the level drops.
 */
export function Battery({ level, idle = false, still = false, dim = false, label }: Props) {
  const color = idle ? 'var(--batt-idle)' : `rgb(${batteryRgb(level)})`;
  const t = 1 - Math.min(100, Math.max(0, level)) / 100;
  const glowAlpha = idle
    ? 'var(--glow-idle)'
    : `calc(var(--glow-min) + (var(--glow-max) - var(--glow-min)) * ${t})`;
  const glowRgb = idle ? 'var(--batt-idle-rgb)' : batteryRgb(level);

  return (
    <div
      className="relative flex flex-col items-center gap-1.5 transition-opacity duration-400"
      style={{ opacity: dim ? 0.3 : 1 }}
    >
      {/* Halo: in the design its centre sits 60 px right and 10 px below the battery's. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[1100px] rounded-full"
        style={{
          transform: 'translate(calc(-50% + 60px), calc(-50% + 10px))',
          background: `radial-gradient(closest-side, rgb(${glowRgb} / ${glowAlpha}), rgb(${glowRgb} / 0))`,
        }}
      />
      <div className="bg-ink h-4 w-[72px] rounded-t-[10px]" />
      <div
        role="img"
        aria-label={label}
        className="border-ink flex h-[440px] w-[220px] flex-col justify-end rounded-[48px] border-[6px] p-3"
      >
        <div
          className={`relative min-h-6 w-full overflow-hidden rounded-[32px] ${still ? '' : 'mb-breathe'}`}
          style={{
            height: `${level}%`,
            background: color,
            transition: 'height 1s linear, background-color 1s linear',
          }}
        >
          {!still && (
            <div
              className="mb-shine absolute inset-x-0 bottom-0 h-[30%]"
              style={{
                background:
                  'linear-gradient(0deg, rgba(255,255,255,0), rgba(255,255,255,.35), rgba(255,255,255,0))',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
