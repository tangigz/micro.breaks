/**
 * What the main screen shows, derived from engine state (spec › Main screen states).
 * Pure, so every state can be rendered in the screen gallery and tested.
 */
import { dailyGoal } from './settings';
import { MIN, dayTimes, isWorkday, phaseAt } from './time';
import type { BreakTimer, EngineState, Recharge } from './types';

export type MainMode = 'before' | 'normal' | 'overdue' | 'lunch' | 'done' | 'weekend';

export type OverdueLine =
  | { kind: 'reminder'; n: number; of: number; at: number }
  | { kind: 'skipped'; nextPromptAt: number }
  | { kind: 'stopped' }
  | null;

export interface MainView {
  mode: MainMode;
  /** 0–100. Full and grey when the day is off; empty when a break is due. */
  level: number;
  seatedMs: number;
  nextBreakInMs: number;
  overdueByMs: number;
  overdueLine: OverdueLine;
  /** "Did you step away?" replaces the countdown until answered. */
  gap: { minutes: number } | null;
  recharge: Recharge | null;
  breakTimer: BreakTimer | null;
  /** A prompt episode is open: the prompt tab belongs to it. */
  promptOpen: boolean;
  breaksToday: number;
  movedMinToday: number;
  goal: number;
  dayStartAt: number;
  dayEndAt: number;
  lunchStartAt: number;
  lunchEndAt: number;
}

export function view(st: EngineState, now: number): MainView {
  const s = st.settings;
  const d = dayTimes(now, s);
  const interval = s.intervalMin * MIN;
  const phase = phaseAt(now, s);
  const seatedMs = st.seatedSince != null && phase === 'work' ? Math.max(0, now - st.seatedSince) : 0;

  let mode: MainMode;
  if (!isWorkday(now)) mode = 'weekend';
  else if (phase === 'before') mode = 'before';
  else if (phase === 'after') mode = 'done';
  else if (phase === 'lunch') mode = 'lunch';
  else if (st.dayStartedAt == null) mode = 'before';
  else if (seatedMs >= interval) mode = 'overdue';
  else mode = 'normal';

  const ep = st.episode;
  let overdueLine: OverdueLine = null;
  if (mode === 'overdue' && ep) {
    if (ep.status === 'open' && ep.remindersSent < s.reminderMax) {
      const n = ep.remindersSent + 1;
      overdueLine = {
        kind: 'reminder',
        n,
        of: s.reminderMax,
        at: ep.promptAt + n * s.reminderEveryMin * MIN,
      };
    } else if (ep.status === 'failed' && ep.failReason === 'skipped' && st.blockedUntil != null) {
      overdueLine = { kind: 'skipped', nextPromptAt: st.blockedUntil };
    } else if (ep.status === 'open' || ep.failReason === 'unanswered') {
      overdueLine = { kind: 'stopped' };
    }
  }

  return {
    mode,
    level: mode === 'normal' ? 100 * (1 - seatedMs / interval) : mode === 'overdue' ? 0 : 100,
    seatedMs,
    nextBreakInMs: mode === 'normal' ? interval - seatedMs : 0,
    overdueByMs: mode === 'overdue' ? seatedMs - interval : 0,
    overdueLine,
    gap: st.pendingGap ? { minutes: st.pendingGap.minutes } : null,
    recharge: st.pendingRecharge,
    breakTimer: st.breakTimer,
    promptOpen: ep?.status === 'open',
    breaksToday: st.today.breaks,
    movedMinToday: st.today.movedMin,
    goal: dailyGoal(s),
    dayStartAt: d.start,
    dayEndAt: d.end,
    lunchStartAt: d.lunchStart,
    lunchEndAt: d.lunchEnd,
  };
}
