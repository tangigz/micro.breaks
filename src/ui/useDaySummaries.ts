import { useEffect, useState } from 'react';
import { db } from '@/data/db';
import { dayStats } from '@/data/stats';
import { dayKey, type EngineState, type MainMode } from '@/engine';
import type { DaySummary } from '@/entrypoints/newtab/content';

/**
 * Numbers the main screen needs from the event log: today's summary once the day
 * is done, and the last working day on weekends.
 */
export function useDaySummaries(state: EngineState | null, mode: MainMode | undefined, now: number) {
  const [today, setToday] = useState<DaySummary | null>(null);
  const [lastWorkday, setLastWorkday] = useState<{ date: number; breaks: number } | null>(null);
  const day = dayKey(now);
  const breaks = state?.today.breaks;

  useEffect(() => {
    if (!state || (mode !== 'done' && mode !== 'weekend')) return;
    let alive = true;
    void (async () => {
      if (mode === 'done') {
        const events = await db.events.where('day').equals(day).sortBy('ts');
        const d = dayStats(events, state.settings, now);
        if (alive) setToday({ breaks: d.breaks, deskMin: d.deskMin, longestMin: d.longest?.min ?? 0 });
      } else {
        const starts = await db.events.where('type').equals('day_start').reverse().sortBy('ts');
        const last = starts.find((e) => e.day < day);
        if (!last) return;
        const count = await db.events
          .where('day')
          .equals(last.day)
          .filter((e) => e.type === 'break_logged')
          .count();
        if (alive) setLastWorkday({ date: last.ts, breaks: count });
      }
    })();
    return () => {
      alive = false;
    };
    // Recomputed when the day, the mode or the number of breaks changes, not every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, mode, breaks]);

  return { today, lastWorkday };
}
