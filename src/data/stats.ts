/**
 * Day numbers derived from the event log (spec › Data schema: store raw events,
 * derive everything else). Pure, so the recap can be redefined without migrating data.
 */
import type { EventType, Settings } from '@/engine';
import { MIN } from '@/engine';
import { trackedWindows } from '@/engine/time';

export interface LogLike {
  ts: number;
  type: EventType;
  payload?: Record<string, unknown>;
}

export interface Span {
  start: number;
  end: number;
}

export interface DayStats {
  dayStartAt: number | null;
  breaks: number;
  /** Minutes of logged breaks, "time moving". */
  movedMin: number;
  /** Seated minutes inside working hours, lunch not counted. */
  deskMin: number;
  /** Longest run of seated time without a break. */
  longest: (Span & { min: number }) | null;
  /** Seated stretches, in order (for the recap chart). */
  seated: Span[];
  breakSpans: Span[];
}

export function dayStats(events: LogLike[], settings: Settings, until: number): DayStats {
  const start = events.find((e) => e.type === 'day_start')?.ts ?? null;
  const breakSpans = events
    .filter((e) => e.type === 'break_logged')
    .map((e) => ({ start: Number(e.payload?.start), end: Number(e.payload?.end) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);
  const movedMin = events
    .filter((e) => e.type === 'break_logged')
    .reduce((sum, e) => sum + Number(e.payload?.minutes ?? 0), 0);

  if (start == null) {
    return {
      dayStartAt: null,
      breaks: breakSpans.length,
      movedMin,
      deskMin: 0,
      longest: null,
      seated: [],
      breakSpans,
    };
  }

  // Working windows (lunch excluded) from the first activity until now, minus the breaks.
  const seated: Span[] = [];
  for (const [a, b] of trackedWindows(start, settings)) {
    let cur = Math.max(a, start);
    const end = Math.min(b, until);
    for (const br of breakSpans) {
      if (br.end <= cur || br.start >= end) continue;
      if (br.start > cur) seated.push({ start: cur, end: br.start });
      cur = Math.max(cur, br.end);
    }
    if (end > cur) seated.push({ start: cur, end });
  }

  const deskMin = Math.round(seated.reduce((sum, s) => sum + (s.end - s.start), 0) / MIN);
  const top = seated.reduce<Span | null>((a, s) => (!a || s.end - s.start > a.end - a.start ? s : a), null);
  return {
    dayStartAt: start,
    breaks: breakSpans.length,
    movedMin,
    deskMin,
    longest: top ? { ...top, min: Math.round((top.end - top.start) / MIN) } : null,
    seated,
    breakSpans,
  };
}
