import { useEffect, useState } from 'react';
import { clock } from '@/engine';
import { DEV_CLOCK_KEY, DEV_TOOLS, now as clockNow, type DevClock } from '@/lib/clock';
import { DEV_PRESENCE_KEY, type PresenceMode } from '@/lib/dev';

const WHO: Record<PresenceMode, string> = {
  present: 'at the computer',
  away: 'away',
  locked: 'screen locked',
};

/**
 * Dev builds only: while the dev panel's fake clock or simulated person is on, the
 * real computer is ignored. Say so on every screen, with a way back.
 */
export function TestModeBanner() {
  const [devClock, setDevClock] = useState<DevClock | null>(null);
  const [presence, setPresence] = useState<{ mode: PresenceMode } | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!DEV_TOOLS) return;
    const load = async () => {
      const got = await browser.storage.local.get([DEV_CLOCK_KEY, DEV_PRESENCE_KEY]);
      setDevClock((got[DEV_CLOCK_KEY] as DevClock | undefined) ?? null);
      setPresence((got[DEV_PRESENCE_KEY] as { mode: PresenceMode } | undefined) ?? null);
    };
    void load();
    const onChange = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && (DEV_CLOCK_KEY in changes || DEV_PRESENCE_KEY in changes)) void load();
    };
    browser.storage.onChanged.addListener(onChange);
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      browser.storage.onChanged.removeListener(onChange);
      clearInterval(t);
    };
  }, []);

  if (!DEV_TOOLS || (!devClock && !presence)) return null;
  const date = new Date(clockNow()).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      role="status"
      className="bg-att-bg text-ink text-meta fixed bottom-4 left-4 z-50 flex h-10 items-center gap-3 rounded-full pr-1.5 pl-4 shadow-lg"
    >
      <b className="text-att font-semibold">Test mode</b>
      <span className="text-ink-2">
        {devClock && `${date} ${clock(clockNow())}${devClock.speed > 1 ? ` · ${devClock.speed}×` : ''}`}
        {devClock && presence && ' · '}
        {presence && `you: ${WHO[presence.mode]}`} · your real computer is ignored
      </span>
      <button
        type="button"
        onClick={() => browser.runtime.sendMessage({ type: 'dev', command: { cmd: 'realTime' } })}
        className="bg-ink text-on-ink h-7 cursor-pointer rounded-full px-3 font-semibold"
      >
        Back to real time
      </button>
    </div>
  );
}
