import { useEffect } from 'react';
import type { BreakTimer } from '@/engine';
import { DEV_TOOLS } from '@/lib/clock';
import { DEV_PRESENCE_KEY, type PresenceMode } from '@/lib/dev';
import { sendAction } from '@/lib/messages';

/**
 * During the break timer, watch for someone at the computer before the break counts
 * ("Still here?"). chrome.idle only says "idle" after 5 min, so ask with its shortest
 * window (15 s). In dev builds, the dev panel's simulated person answers instead.
 */
export function useActivityWatch(timer: BreakTimer | null) {
  const watching = !!timer && !timer.ended && !timer.early;
  const startedAt = timer?.startedAt ?? 0;

  useEffect(() => {
    if (!watching) return;
    const check = async () => {
      if (DEV_TOOLS) {
        const got = await browser.storage.local.get(DEV_PRESENCE_KEY);
        const p = got[DEV_PRESENCE_KEY] as { mode: PresenceMode; since: number } | undefined;
        if (p) {
          if (p.mode === 'present' && p.since > startedAt) await sendAction({ type: 'activity' });
          return;
        }
      }
      if ((await browser.idle.queryState(15)) === 'active') await sendAction({ type: 'activity' });
    };
    const t = setInterval(() => void check(), 2000);
    return () => clearInterval(t);
  }, [watching, startedAt]);
}
