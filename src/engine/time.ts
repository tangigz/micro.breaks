import type { Settings } from './types';

export const MIN = 60_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day, e.g. "2026-10-05". */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Epoch ms for a minute of the local day that contains `t`. */
export function atMinute(t: number, minuteOfDay: number): number {
  const d = new Date(t);
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    Math.floor(minuteOfDay / 60),
    minuteOfDay % 60,
  ).getTime();
}

export function nextMidnight(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

/** Monday to Friday. */
export function isWorkday(t: number): boolean {
  const w = new Date(t).getDay();
  return w >= 1 && w <= 5;
}

/** "9:05" style clock. */
export function clock(t: number): string {
  const d = new Date(t);
  return `${d.getHours()}:${pad(d.getMinutes())}`;
}

export interface DayTimes {
  start: number;
  end: number;
  lunchStart: number;
  lunchEnd: number;
  hasLunch: boolean;
}

export function dayTimes(t: number, s: Settings): DayTimes {
  const start = atMinute(t, s.dayStart);
  const end = atMinute(t, s.dayEnd);
  const hasLunch = s.lunchStart < s.lunchEnd && s.lunchStart >= s.dayStart && s.lunchEnd <= s.dayEnd;
  return {
    start,
    end,
    hasLunch,
    lunchStart: hasLunch ? atMinute(t, s.lunchStart) : end,
    lunchEnd: hasLunch ? atMinute(t, s.lunchEnd) : end,
  };
}

/** Tracked windows of the day containing `t`: working hours minus lunch. Empty on weekends. */
export function trackedWindows(t: number, s: Settings): [number, number][] {
  if (!isWorkday(t)) return [];
  const d = dayTimes(t, s);
  if (!d.hasLunch) return [[d.start, d.end]];
  return [
    [d.start, d.lunchStart],
    [d.lunchEnd, d.end],
  ];
}

/** Milliseconds of [from, to] that fall inside the tracked windows of `to`'s day. */
export function trackedOverlap(from: number, to: number, s: Settings): number {
  return trackedWindows(to, s).reduce(
    (sum, [a, b]) => sum + Math.max(0, Math.min(b, to) - Math.max(a, from)),
    0,
  );
}

export type Phase = 'weekend' | 'before' | 'work' | 'lunch' | 'after';

export function phaseAt(t: number, s: Settings): Phase {
  if (!isWorkday(t)) return 'weekend';
  const d = dayTimes(t, s);
  if (t < d.start) return 'before';
  if (t >= d.end) return 'after';
  if (d.hasLunch && t >= d.lunchStart && t < d.lunchEnd) return 'lunch';
  return 'work';
}
