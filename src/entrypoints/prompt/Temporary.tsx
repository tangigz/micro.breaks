import type { EngineState } from '@/engine';
import { mmss } from '@/lib/format';
import { sendAction } from '@/lib/messages';
import { Pill } from '@/ui/Pill';
import { Wordmark } from '@/ui/Wordmark';

// Temporary break timer and "Recharged." in the prompt tab, to test the flow by
// hand. The designed screens replace them in #9.
export function TemporaryBreak({ state, now }: { state: EngineState; now: number }) {
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
