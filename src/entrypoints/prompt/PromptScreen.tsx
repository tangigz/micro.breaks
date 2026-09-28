import { activityFor, INTENTS } from '@/content/breaks';
import type { Intent, Place, Theme } from '@/engine';
import { duration } from '@/lib/format';
import { ThemeToggle } from '@/ui/Header';
import { ClockIcon, PlayIcon } from '@/ui/icons';
import { Wordmark } from '@/ui/Wordmark';

export interface PromptScreenProps {
  seatedMs: number;
  /** The break is due or overdue: the time since the last break shows in amber. */
  due: boolean;
  place: Place;
  intent: Intent;
  theme: Theme;
  onPick: (i: Intent) => void;
  onStart: () => void;
  onLater: () => void;
  onSkip: () => void;
  onToggleTheme: () => void;
  frame?: boolean;
}

/** Design frame "2 · Break prompt": opens in a new tab when the battery hits zero. */
export function PromptScreen(p: PromptScreenProps) {
  return (
    <div
      className={`relative isolate flex flex-col items-center overflow-hidden ${p.frame ? 'h-[900px] w-[1440px]' : 'min-h-screen'}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[200px] -right-[200px] -z-10 size-[1000px] rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, rgb(var(--prompt-glow) / .3), rgb(var(--prompt-glow) / 0))',
        }}
      />

      <header className="flex w-full items-center justify-between px-10 py-7">
        <Wordmark size={17} />
        <ThemeToggle theme={p.theme} onToggle={p.onToggleTheme} />
      </header>

      <main className="flex w-[1120px] max-w-[calc(100%-80px)] flex-1 flex-col justify-center gap-12 pb-14">
        <div className="flex flex-col gap-3">
          <h1 className="m-0 text-[120px] leading-[112px] font-bold tracking-[-0.03em]">Time to move.</h1>
          <div className="text-section text-ink-2 font-semibold">
            <span className={p.due ? 'text-att' : 'text-ink'}>{duration(p.seatedMs / 60_000)}</span> since
            your last active break
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div id="intent-label" className="text-body text-ink-2">
            A movement break for…
          </div>
          <div
            role="radiogroup"
            aria-labelledby="intent-label"
            className="grid grid-cols-[repeat(3,minmax(0,300px))] gap-3"
          >
            {INTENTS.map((it) => {
              const on = it.intent === p.intent;
              const routine = activityFor(it.intent, p.place).name;
              return (
                <button
                  key={it.intent}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`${it.label}, ${routine}`}
                  onClick={() => p.onPick(it.intent)}
                  className={`relative flex h-[132px] cursor-pointer items-center gap-4 rounded-3xl border-2 p-5 text-left ${on ? 'border-ink bg-raised text-ink' : 'bg-band text-ink-2 border-transparent'}`}
                >
                  <img src={it.img} alt="" className="size-16" style={{ opacity: on ? 1 : 0.55 }} />
                  <span className="flex flex-col gap-1">
                    <span className="text-title font-bold">{it.label}</span>
                    <span className={`text-meta ${on ? 'text-ink-2' : 'text-ink-3'}`}>{routine}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={p.onStart}
            className="bg-ink text-on-ink text-body inline-flex h-14 cursor-pointer items-center gap-2.5 rounded-full px-9 font-semibold whitespace-nowrap"
          >
            <PlayIcon size={18} />
            Start my break
          </button>
          <button
            type="button"
            onClick={p.onLater}
            className="bg-pill text-ink text-meta inline-flex h-14 cursor-pointer items-center gap-2 rounded-full px-[22px] font-medium whitespace-nowrap"
          >
            <ClockIcon size={18} />
            Remind me later
          </button>
          <button
            type="button"
            onClick={p.onSkip}
            className="bg-pill text-ink text-meta inline-flex h-14 cursor-pointer items-center rounded-full px-[22px] font-medium whitespace-nowrap"
          >
            Skip this one
          </button>
        </div>
      </main>
    </div>
  );
}
