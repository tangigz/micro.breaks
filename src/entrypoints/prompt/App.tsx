import { useEffect, useState } from 'react';
import type { Intent } from '@/engine';
import { mmss } from '@/lib/format';
import { sendAction } from '@/lib/messages';
import { Pill } from '@/ui/Pill';
import { useEngine } from '@/ui/useEngine';
import { Wordmark } from '@/ui/Wordmark';

const INTENTS: { id: Intent; label: string }[] = [
  { id: 'energy', label: 'Energy' },
  { id: 'focus', label: 'Focus' },
  { id: 'relief', label: 'Pain relief' },
];

// Temporary prompt, break timer and "Recharged." in one tab, to test the background
// by hand. The designed screens replace it in #8 and #9.
export function App() {
  const { state, now } = useEngine();
  const [intent, setIntent] = useState<Intent>('energy');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state?.breakTimer || state?.pendingRecharge) return;
      const k = ['1', '2', '3'].indexOf(e.key);
      if (k >= 0) setIntent(INTENTS[k]!.id);
      if (e.key === 'Enter') void sendAction({ type: 'chooseBreak', intent });
      if (e.key === 'Escape') void sendAction({ type: 'remindLater' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [intent, state]);

  if (!state) return null;
  const bt = state.breakTimer;

  let body;
  if (state.pendingRecharge) {
    body = (
      <>
        <h1 className="text-headline font-bold">Recharged.</h1>
        <p className="text-title text-pos font-bold">+{state.pendingRecharge.minutes} min of movement</p>
        <div>
          <Pill
            onClick={async () => {
              await sendAction({ type: 'rechargeSeen' });
              window.close();
            }}
          >
            Back to work
          </Pill>
        </div>
      </>
    );
  } else if (bt) {
    body = (
      <>
        <div className="text-eyebrow text-ink-2 uppercase">{bt.intent}</div>
        <div role="timer" aria-live="off" className="text-hero font-bold">
          {mmss(bt.endsAt - now)}
        </div>
        <p className="text-body text-ink-2">
          {bt.early ? (
            <>
              <b className="text-att">Still here?</b> The break counts once you've been away 5 min.
            </>
          ) : (
            <>
              <b className="text-ink">Leave the computer.</b> The break counts after 5 min away.
            </>
          )}
        </p>
        <div className="flex gap-3">
          <Pill onClick={() => sendAction({ type: 'imBack' })}>I'm back</Pill>
          <Pill variant="secondary" onClick={() => sendAction({ type: 'cancelBreak' })}>
            Cancel break
          </Pill>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <h1 className="text-headline font-bold">Time to move.</h1>
        <div role="radiogroup" aria-label="A movement break for" className="flex gap-3">
          {INTENTS.map((it, k) => (
            <button
              key={it.id}
              role="radio"
              aria-checked={intent === it.id}
              onClick={() => setIntent(it.id)}
              className={`text-title rounded-3xl border-2 px-6 py-4 font-bold ${intent === it.id ? 'border-ink bg-raised' : 'bg-band border-transparent'}`}
            >
              {it.label} <span className="text-meta text-ink-3">{k + 1}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <Pill onClick={() => sendAction({ type: 'chooseBreak', intent })}>Start my break</Pill>
          <Pill variant="secondary" onClick={() => sendAction({ type: 'remindLater' })}>
            Remind me later
          </Pill>
          <Pill variant="secondary" onClick={() => sendAction({ type: 'skip' })}>
            Skip this one
          </Pill>
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-10 py-6">
        <Wordmark />
      </header>
      <main className="mx-auto flex w-[1120px] max-w-full flex-1 flex-col justify-center gap-8 px-4">
        {body}
      </main>
    </div>
  );
}
