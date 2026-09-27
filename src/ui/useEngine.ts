import { useEffect, useState } from 'react';
import { view, type EngineState, type MainView } from '@/engine';
import { onStateChange, readState } from '@/lib/messages';

/** Live engine state from the background, and the main-screen view recomputed every second. */
export function useEngine(): { state: EngineState | null; view: MainView | null; now: number } {
  const [state, setState] = useState<EngineState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    void readState().then((st) => alive && setState(st));
    const off = onStateChange(setState);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      off();
      clearInterval(timer);
    };
  }, []);

  return { state, view: state ? view(state, now) : null, now };
}
