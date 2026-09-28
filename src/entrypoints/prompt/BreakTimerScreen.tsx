import { BREAK_LENGTHS, MIN, type Theme } from '@/engine';
import type { Activity, IntentInfo } from '@/content/breaks';
import { mmss } from '@/lib/format';
import { Header, ThemeToggle } from '@/ui/Header';
import { AlertCircleIcon, MonitorIcon } from '@/ui/icons';

export interface BreakTimerScreenProps {
  intent: IntentInfo;
  activity: Activity;
  /** Time on the timer so far, and its length. */
  elapsedMs: number;
  lengthMin: number;
  /** Activity seen before the break counted. */
  early: boolean;
  theme: Theme;
  onLength: (min: number) => void;
  onBack: () => void;
  onCancel: () => void;
  onToggleTheme: () => void;
  frame?: boolean;
}

const R = 178;
const C = 2 * Math.PI * R;

/** Design frame "3 · Break timer": the M1 break, a timer and one simple idea. */
export function BreakTimerScreen(p: BreakTimerScreenProps) {
  const total = p.lengthMin * MIN;
  const elapsed = Math.min(total, Math.max(0, p.elapsedMs));
  const left = total - elapsed;
  // The mark where the break starts to count (5 min), on a ring that starts at 12 o'clock.
  const a = (Math.min(5 * MIN, total) / total) * 2 * Math.PI;
  const reached = elapsed >= 5 * MIN;
  const secs = Math.ceil(left / 1000);

  return (
    <div
      className={`relative isolate flex flex-col items-center overflow-hidden ${p.frame ? 'h-[900px] w-[1440px]' : 'min-h-screen'}`}
    >
      <Header>
        <ThemeToggle theme={p.theme} onToggle={p.onToggleTheme} />
      </Header>

      <main className="grid w-[1120px] max-w-[calc(100%-80px)] flex-1 grid-cols-[minmax(280px,420px)_minmax(0,1fr)] items-center gap-x-[clamp(32px,6vw,80px)] pb-[72px]">
        <div className="relative flex justify-center">
          {/* Green halo: the battery is charging while you're away. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[1100px] rounded-full"
            style={{
              transform: 'translate(calc(-50% + 60px), calc(-50% + 10px))',
              background: 'radial-gradient(closest-side, rgb(111 207 122 / .24), rgb(111 207 122 / 0))',
            }}
          />
          <div className="relative size-[380px]">
            <svg
              width="380"
              height="380"
              viewBox="0 0 380 380"
              aria-hidden="true"
              className="absolute inset-0 -rotate-90"
            >
              <circle cx="190" cy="190" r={R} fill="none" stroke="var(--pill)" strokeWidth="12" />
              <circle
                cx="190"
                cy="190"
                r={R}
                fill="none"
                stroke="var(--pos)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - elapsed / total)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
              <circle
                cx={190 + R * Math.cos(a)}
                cy={190 + R * Math.sin(a)}
                r="9"
                fill="var(--bg)"
                stroke={reached ? 'var(--pos)' : 'var(--ink-3)'}
                strokeWidth="4"
              />
            </svg>
            <div className="bg-raised absolute inset-11 flex items-center justify-center rounded-full">
              <img src={p.activity.img} alt="" className="mb-float size-[168px]" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <div className="text-eyebrow text-ink-2 font-medium uppercase">{p.intent.eyebrow}</div>
            <h1 className="text-display m-0 font-bold">{p.activity.name}</h1>
            <div className="text-section text-ink-2 font-semibold">{p.activity.cue}</div>
          </div>

          <div
            role="timer"
            aria-live="off"
            aria-label={`${Math.floor(secs / 60)} minutes ${secs % 60} seconds left`}
            className="text-hero font-bold"
          >
            {mmss(left)}
          </div>

          {p.early ? (
            <div
              role="status"
              className="bg-att-bg text-ink text-body flex min-h-12 items-center gap-3 self-start rounded-full px-5 py-3"
            >
              <AlertCircleIcon className="text-att shrink-0" />
              <span>
                <b className="font-semibold">Still here?</b> The break counts once you've been away 5 min.
              </span>
            </div>
          ) : (
            <div className="text-body text-ink-2 flex items-center gap-3">
              <MonitorIcon className="text-pos shrink-0" />
              <span>
                <b className="text-ink font-semibold">Leave the computer.</b> The break counts after 5 min
                away.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <div
              role="group"
              aria-label="Break length"
              className="bg-raised flex h-12 gap-1 rounded-full p-1.5"
            >
              {BREAK_LENGTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={m === p.lengthMin}
                  onClick={() => p.onLength(m)}
                  className={`text-meta h-9 cursor-pointer rounded-full px-4 font-semibold ${m === p.lengthMin ? 'bg-ink text-on-ink' : 'text-ink-2'}`}
                >
                  {m} min
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={p.onBack}
              className="bg-pill text-ink text-meta h-12 cursor-pointer rounded-full px-5 font-medium"
            >
              I'm back
            </button>
            <button
              type="button"
              onClick={p.onCancel}
              className="text-ink-2 text-meta h-12 cursor-pointer px-3 font-medium"
            >
              Cancel break
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
