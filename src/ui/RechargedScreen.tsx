import { useEffect, useState, type CSSProperties } from 'react';
import boltImg from '@/assets/illustrations/high-voltage.png';
import type { Recharge, Theme } from '@/engine';
import { Header, ThemeToggle } from './Header';
import { ArrowRightIcon } from './icons';
import { rechargedCopy } from './rechargedCopy';
import './recharged.css';

export interface RechargedScreenProps {
  recharge: Recharge;
  goal: number;
  theme: Theme;
  onBack: () => void;
  onToggleTheme: () => void;
  /** Play the animation (off: the final state, as with reduced motion). */
  play?: boolean;
  frame?: boolean;
}

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** "+N min" counts up once the battery is full (spec › Motion › Recharge). */
function useCountUp(target: number, play: boolean): number {
  const still = !play || reducedMotion();
  const [n, setN] = useState(still ? target : 0);
  useEffect(() => {
    if (still) return;
    let k = 0;
    let tick: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      tick = setInterval(
        () => {
          k += 1;
          setN(k);
          if (k >= target) clearInterval(tick);
        },
        target > 12 ? 60 : 160,
      );
    }, 2900);
    return () => {
      clearTimeout(start);
      clearInterval(tick);
    };
  }, [target, still]);
  return still ? target : n;
}

const delay = (s: number) => ({ '--delay': `${s}s` }) as CSSProperties;

/** Design frame "4 · Break done" and its variants (unprompted break, "Yes, I moved"). */
export function RechargedScreen(p: RechargedScreenProps) {
  const play = p.play ?? true;
  const copy = rechargedCopy(p.recharge, p.goal);
  const count = useCountUp(p.recharge.minutes, play);
  const n = p.recharge.breakNumber;

  return (
    <div
      className={`relative isolate flex flex-col items-center overflow-hidden ${play ? 'rc-play' : ''} ${p.frame ? 'h-[900px] w-[1440px]' : 'min-h-screen'}`}
    >
      <Header>
        <ThemeToggle theme={p.theme} onToggle={p.onToggleTheme} />
      </Header>

      <main className="grid w-[1120px] max-w-[calc(100%-80px)] flex-1 grid-cols-[minmax(280px,420px)_minmax(0,1fr)] items-center gap-x-[clamp(32px,6vw,80px)] pb-[72px]">
        <div className="relative flex flex-col items-center gap-1.5">
          <div
            aria-hidden="true"
            className="rc-halo pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[1100px] rounded-full"
            style={{
              background: 'radial-gradient(closest-side, rgb(111 207 122 / .32), rgb(111 207 122 / 0))',
            }}
          />
          <div aria-hidden="true" className="absolute top-10 left-1/2 size-0">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="rc-particle" />
            ))}
          </div>
          <div aria-hidden="true" className="absolute -top-24 left-1/2 -ml-12 size-24">
            <div className="rc-pop">
              <img src={boltImg} alt="" className="rc-float block size-24" />
            </div>
          </div>

          <div className="bg-ink h-4 w-[72px] rounded-t-[10px]" />
          <div
            role="img"
            aria-label="Battery recharged to 100 percent"
            className="rc-glow border-ink relative flex h-[440px] w-[220px] flex-col justify-end rounded-[48px] border-[6px] p-3"
          >
            <span
              aria-hidden="true"
              className="rc-ripple absolute -inset-1.5 rounded-[48px] border-[3px] border-[var(--batt-full)]"
            />
            <span
              aria-hidden="true"
              className="rc-ripple absolute -inset-1.5 rounded-[48px] border-2 border-[var(--batt-full)]"
              style={delay(2.75)}
            />
            <div className="rc-fill relative h-full w-full overflow-hidden rounded-[32px] bg-[var(--batt-full)]">
              <svg
                aria-hidden="true"
                className="rc-wave absolute top-0 left-0 h-3 w-[392px]"
                viewBox="0 0 392 12"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 12 Q24.5 0 49 12 T98 12 T147 12 T196 12 T245 12 T294 12 T343 12 T392 12 V0 H0 Z"
                  fill="rgb(255 255 255 / .35)"
                />
              </svg>
              <span className="rc-bubble" />
              <span className="rc-bubble" />
              <span className="rc-bubble" />
              <span className="rc-bubble" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-9">
          <div className="flex flex-col gap-3.5">
            {copy.eyebrow && (
              <div className="rc-rise text-eyebrow text-ink-2 font-medium uppercase">{copy.eyebrow}</div>
            )}
            <h1 className="rc-rise text-headline m-0 font-bold" style={delay(2.65)}>
              Recharged.
            </h1>
            <div className="rc-rise text-title font-bold" style={delay(2.9)}>
              <span className="text-pos">+{count} min</span>{' '}
              <span className="text-ink-2 font-semibold">{copy.unit}</span>
            </div>
          </div>

          <div className="rc-rise flex flex-col gap-3" style={delay(3.1)}>
            <span className="text-meta text-ink-2">{copy.line}</span>
            <div aria-hidden="true" className="flex gap-2">
              {Array.from({ length: Math.max(p.goal, n) }, (_, k) => (
                <span
                  key={k}
                  className={`h-2.5 w-10 rounded-full ${k < n ? 'bg-pos' : 'bg-pill'} ${k === n - 1 ? 'rc-dot' : ''}`}
                />
              ))}
            </div>
          </div>

          <div className="rc-rise" style={delay(3.3)}>
            <button
              type="button"
              onClick={p.onBack}
              className="bg-ink text-on-ink text-body inline-flex h-14 cursor-pointer items-center gap-2.5 rounded-full px-9 font-semibold"
            >
              Back to work
              <ArrowRightIcon size={20} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
