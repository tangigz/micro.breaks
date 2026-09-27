/**
 * What the main screen says in each state (spec › Screen rules › New tab states).
 * Pure: the component only lays it out, and every state is unit-tested here.
 */
import { clock, type MainView, type Settings } from '@/engine';
import { duration, mmss } from '@/lib/format';

export interface DaySummary {
  breaks: number;
  deskMin: number;
  longestMin: number;
}

export interface MainContext {
  settings: Settings;
  now: number;
  /** Today's numbers from the event log, for "Done for today". */
  today: DaySummary | null;
  /** The last working day before a weekend, for the pill and "See Friday". */
  lastWorkday: { date: number; breaks: number } | null;
}

export type Tone = 'ink' | 'ink2' | 'att';

export interface MainContent {
  kind: 'gap' | 'countdown' | 'overdue' | 'quiet';
  eyebrow: string;
  eyebrowTone: Tone;
  title: string;
  /** Countdown-sized (160) or headline-sized (104). */
  titleSize: 'hero' | 'headline';
  /** The title is a live countdown (role="timer"). */
  timer: boolean;
  /** "<42 min> since your last active break · reminder 2 of 3 at 11:15" */
  since?: { value: string; tone: Tone; note?: string };
  sub?: string;
  /** Second line under an overdue countdown. */
  overLine?: string;
  /** "6 of 8 breaks · 6 h 40 at your desk · longest 72 min" */
  stats?: { breaks: string; desk: string; longest: string };
  start: boolean;
  chip: boolean;
  recap?: string;
  battery: { level: number; idle: boolean; still: boolean; dim: boolean };
  pill: { day: string; taken: number; goal: number };
}

const weekday = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'long' });

export function chipLabel(s: Settings, now: number): string {
  return `Every ${s.intervalMin} min · ${clockAt(now, s.dayStart)}–${clockAt(now, s.dayEnd)}`;
}

function clockAt(now: number, minuteOfDay: number): string {
  const d = new Date(now);
  d.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
  return clock(d.getTime());
}

/** The next Monday–Friday after `t`. */
function nextWorkday(t: number): number {
  const d = new Date(t);
  do d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6);
  return d.getTime();
}

export function mainContent(v: MainView, ctx: MainContext): MainContent {
  const { settings: s, now } = ctx;
  const start = clock(v.dayStartAt);
  const live = { level: v.level, idle: false, still: false, dim: false };
  const idle = { level: 100, idle: true, still: true, dim: false };
  const pill = { day: 'Today', taken: v.breaksToday, goal: v.goal };
  const since = duration(v.seatedMs / 60_000);

  if (v.gap) {
    return {
      kind: 'gap',
      eyebrow: `Chrome was closed for ${v.gap.minutes} min`,
      eyebrowTone: 'att',
      title: 'Did you step away?',
      titleSize: 'headline',
      timer: false,
      sub: 'Your battery depends on it.',
      start: false,
      chip: false,
      battery: { ...live, dim: true },
      pill,
    };
  }

  switch (v.mode) {
    case 'normal':
      return {
        kind: 'countdown',
        eyebrow: 'Next break in',
        eyebrowTone: 'ink2',
        title: mmss(v.nextBreakInMs),
        titleSize: 'hero',
        timer: true,
        since: { value: since, tone: 'ink' },
        start: true,
        chip: true,
        battery: live,
        pill,
      };
    case 'overdue': {
      const line = v.overdueLine;
      return {
        kind: 'overdue',
        eyebrow: 'Break overdue by',
        eyebrowTone: 'att',
        title: mmss(v.overdueByMs),
        titleSize: 'hero',
        timer: true,
        since: {
          value: since,
          tone: 'att',
          note:
            line?.kind === 'reminder'
              ? ` · reminder ${line.n} of ${line.of} at ${clock(line.at)}`
              : undefined,
        },
        overLine:
          line?.kind === 'skipped'
            ? `Skipped. Next prompt at ${clock(line.nextPromptAt)}.`
            : line?.kind === 'stopped'
              ? 'Reminders stopped. Take a break when you can.'
              : undefined,
        start: true,
        chip: true,
        battery: live,
        pill,
      };
    }
    case 'before':
      return {
        kind: 'quiet',
        eyebrow: 'Before working hours',
        eyebrowTone: 'ink2',
        title: start,
        titleSize: 'hero',
        timer: false,
        sub: `Your day starts at ${start}, at your first activity.`,
        start: false,
        chip: true,
        battery: idle,
        pill,
      };
    case 'lunch':
      return {
        kind: 'quiet',
        eyebrow: `Lunch · ${clock(v.lunchStartAt)}–${clock(v.lunchEndAt)}`,
        eyebrowTone: 'ink2',
        title: 'Lunch.',
        titleSize: 'headline',
        timer: false,
        sub: `Tracking paused until ${clock(v.lunchEndAt)}. Your battery will be full.`,
        start: false,
        chip: true,
        battery: live,
        pill,
      };
    case 'done': {
      const t = ctx.today;
      return {
        kind: 'quiet',
        eyebrow: `${weekday(now)} · ${clock(v.dayEndAt)}`,
        eyebrowTone: 'ink2',
        title: 'Done for today.',
        titleSize: 'headline',
        timer: false,
        stats: t
          ? {
              breaks: `${t.breaks} of ${v.goal}`,
              desk: duration(t.deskMin),
              // The design writes it in minutes here ("longest 72 min"); the recap uses "1 h 12".
              longest: `${t.longestMin} min`,
            }
          : undefined,
        start: false,
        chip: false,
        recap: 'See your day',
        battery: idle,
        pill,
      };
    }
    case 'weekend': {
      const last = ctx.lastWorkday;
      return {
        kind: 'quiet',
        eyebrow: weekday(now),
        eyebrowTone: 'ink2',
        title: 'Weekend.',
        titleSize: 'headline',
        timer: false,
        sub: `See you ${weekday(nextWorkday(now))} at ${clockAt(now, s.dayStart)}.`,
        start: false,
        chip: false,
        recap: last ? `See ${weekday(last.date)}` : undefined,
        battery: idle,
        pill: last ? { day: weekday(last.date), taken: last.breaks, goal: v.goal } : pill,
      };
    }
  }
}
