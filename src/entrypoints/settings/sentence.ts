/**
 * The movement timer sentence (design frame "1b · Movement timer"): its tokens,
 * the values each can take, and what makes a draft valid. Pure and tested.
 */
import { INTERVALS, type Place, type Settings } from '@/engine';

export type Field = 'interval' | 'dayStart' | 'dayEnd' | 'lunchStart' | 'lunchEnd';

export interface Draft {
  intervalMin: number;
  dayStart: number;
  dayEnd: number;
  lunchStart: number;
  lunchEnd: number;
  place: Place;
}

/** Times in 15-min steps, 6:00–22:00, as minutes from midnight. */
export const TIMES: number[] = Array.from({ length: (22 - 6) * 4 + 1 }, (_, i) => 6 * 60 + i * 15);

export const OPTIONS: Record<Field, readonly number[]> = {
  interval: INTERVALS,
  dayStart: TIMES,
  dayEnd: TIMES,
  lunchStart: TIMES,
  lunchEnd: TIMES,
};

/** Panel title while picking (design copy). */
export const TITLES: Record<Field, string> = {
  interval: 'Remind me every',
  dayStart: 'Start of your day',
  dayEnd: 'End of your day',
  lunchStart: 'Lunch starts',
  lunchEnd: 'Lunch ends',
};

/** Screen-reader names of the tokens. */
export const NAMES: Record<Field, string> = {
  interval: 'Interval',
  dayStart: 'Start of day',
  dayEnd: 'End of day',
  lunchStart: 'Lunch starts',
  lunchEnd: 'Lunch ends',
};

const KEY: Record<Field, keyof Draft> = {
  interval: 'intervalMin',
  dayStart: 'dayStart',
  dayEnd: 'dayEnd',
  lunchStart: 'lunchStart',
  lunchEnd: 'lunchEnd',
};

export const hm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

export function valueOf(d: Draft, f: Field): number {
  return d[KEY[f]] as number;
}

export function label(f: Field, v: number): string {
  return f === 'interval' ? `${v} min` : hm(v);
}

export function withValue(d: Draft, f: Field, v: number): Draft {
  return { ...d, [KEY[f]]: v };
}

/** Moves a field by `delta` options, staying within its list. */
export function stepValue(d: Draft, f: Field, delta: number): Draft {
  const opts = OPTIONS[f];
  const i = opts.indexOf(valueOf(d, f));
  const next = opts[Math.max(0, Math.min(opts.length - 1, (i < 0 ? 0 : i) + delta))]!;
  return withValue(d, f, next);
}

/** The five values shown on the wheel, centred on the current one (empty past the ends). */
export function wheel(d: Draft, f: Field): { value: number | null; offset: number }[] {
  const opts = OPTIONS[f];
  const i = opts.indexOf(valueOf(d, f));
  return [-2, -1, 0, 1, 2].map((offset) => ({ value: opts[i + offset] ?? null, offset }));
}

/** Why the draft can't be saved, or null. */
export function problem(d: Draft): string | null {
  if (d.dayEnd <= d.dayStart) return 'Your day has to end after it starts.';
  if (d.lunchEnd <= d.lunchStart) return 'Lunch has to end after it starts.';
  if (d.lunchStart < d.dayStart || d.lunchEnd > d.dayEnd) return 'Lunch has to fit inside your day.';
  return null;
}

export function draftFrom(s: Settings, place: Place): Draft {
  return {
    intervalMin: s.intervalMin,
    dayStart: s.dayStart,
    dayEnd: s.dayEnd,
    lunchStart: s.lunchStart,
    lunchEnd: s.lunchEnd,
    place,
  };
}
