import { useEffect, useState } from 'react';
import { view, type EngineState, type MainView } from '@/engine';
import { currentDevClock, DEV_TOOLS, initClock, now as clockNow } from '@/lib/clock';
import { onStateChange, readState } from '@/lib/messages';

/** Live engine state from the background, and the main-screen view recomputed every second. */
export function useEngine(): { state: EngineState | null; view: MainView | null; now: number } {
  const [state, setState] = useState<EngineState | null>(null);
  const [now, setNow] = useState(() => clockNow());

  useEffect(() => {
    let alive = true;
    void initClock().then(() => alive && setNow(clockNow()));
    void readState().then((st) => alive && setState(st));
    const off = onStateChange(setState);
    const timer = setInterval(() => setNow(clockNow()), 250);
    // Dev: fast time only flows while a micro.breaks page keeps the background ticking.
    const devTicker = DEV_TOOLS
      ? setInterval(() => {
          if ((currentDevClock()?.speed ?? 1) > 1) {
            void browser.runtime.sendMessage({ type: 'dev', command: { cmd: 'tick' } });
          }
        }, 1000)
      : undefined;
    return () => {
      alive = false;
      off();
      clearInterval(timer);
      clearInterval(devTicker);
    };
  }, []);

  return { state, view: state ? view(state, now) : null, now };
}
