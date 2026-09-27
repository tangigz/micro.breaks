import { clock } from '@/engine';
import { DEV_TOOLS } from '@/lib/clock';
import { duration, mmss } from '@/lib/format';
import { sendAction } from '@/lib/messages';
import { Pill } from '@/ui/Pill';
import { useEngine } from '@/ui/useEngine';
import { Wordmark } from '@/ui/Wordmark';

// Temporary: the live engine state as text, to test the background by hand.
// The designed main screen replaces it in #5.
export function App() {
  const { view: v, state } = useEngine();
  if (!v || !state) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-10 py-6">
        <Wordmark />
        <span className="text-meta text-ink-2 flex gap-4">
          {DEV_TOOLS && (
            <a href="/dev.html" className="underline">
              Dev panel
            </a>
          )}
          Today · {v.breaksToday} of {v.goal}
        </span>
      </header>
      <main className="mx-auto flex w-[1120px] max-w-full flex-1 flex-col justify-center gap-8 px-4">
        <div className="text-eyebrow text-ink-2 uppercase">{v.mode}</div>

        {v.gap ? (
          <div className="flex flex-col gap-6">
            <h1 className="text-headline font-bold">Did you step away?</h1>
            <p className="text-section text-ink-2">Chrome was closed for {v.gap.minutes} min.</p>
            <div className="flex gap-3">
              <Pill onClick={() => sendAction({ type: 'gapAnswer', moved: true })}>Yes, I moved</Pill>
              <Pill variant="secondary" onClick={() => sendAction({ type: 'gapAnswer', moved: false })}>
                No, I kept working
              </Pill>
            </div>
          </div>
        ) : (
          <>
            {v.recharge && (
              <div className="text-section text-pos font-semibold">
                Recharged. +{v.recharge.minutes} min ({v.recharge.source}) · break {v.recharge.breakNumber} of{' '}
                {v.goal}{' '}
                <button className="text-ink-2 underline" onClick={() => sendAction({ type: 'rechargeSeen' })}>
                  ok
                </button>
              </div>
            )}
            <div role="timer" aria-live="off" className="text-hero font-bold">
              {v.mode === 'overdue' ? mmss(v.overdueByMs) : mmss(v.nextBreakInMs)}
            </div>
            <div className="text-section text-ink-2 font-semibold">
              Battery {Math.round(v.level)}% · {duration(v.seatedMs / 60_000)} seated
              {v.overdueLine?.kind === 'reminder' &&
                ` · reminder ${v.overdueLine.n} of 3 at ${clock(v.overdueLine.at)}`}
              {v.overdueLine?.kind === 'skipped' &&
                ` · Skipped. Next prompt at ${clock(v.overdueLine.nextPromptAt)}.`}
              {v.overdueLine?.kind === 'stopped' && ' · Reminders stopped.'}
            </div>
            <div>
              <Pill onClick={() => sendAction({ type: 'openPrompt' })}>Start a break now</Pill>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
