import type { EngineState, Settings } from './types';

export const INTERVALS = [30, 45, 60, 75, 90] as const;
export const BREAK_LENGTHS = [5, 10, 15] as const;

export const DEFAULT_SETTINGS: Settings = {
  intervalMin: 60,
  dayStart: 9 * 60,
  dayEnd: 18 * 60,
  lunchStart: 12 * 60 + 30,
  lunchEnd: 13 * 60 + 30,
  breakLengthMin: 5,
  dailyGoal: null,
  theme: 'dark',
  headsUpMin: 5,
  reminderEveryMin: 5,
  reminderMax: 3,
  minBreakMin: 5,
};

/** ⌈(working minutes − lunch) ÷ interval⌉, unless overridden. */
export function dailyGoal(s: Settings): number {
  if (s.dailyGoal != null) return s.dailyGoal;
  const lunch = s.lunchStart < s.lunchEnd ? s.lunchEnd - s.lunchStart : 0;
  return Math.max(1, Math.ceil((s.dayEnd - s.dayStart - lunch) / s.intervalMin));
}

export function initialState(settings: Settings = DEFAULT_SETTINGS): EngineState {
  return {
    version: 1,
    settings,
    day: null,
    place: 'office',
    dayStartedAt: null,
    seatedSince: null,
    lunchStartHandled: false,
    lunchEndHandled: false,
    dayEndHandled: false,
    away: null,
    lastSeenAt: null,
    startedAt: null,
    headsUpFor: null,
    blockedUntil: null,
    episode: null,
    episodeCount: 0,
    breakTimer: null,
    pendingGap: null,
    pendingRecharge: null,
    today: { breaks: 0, movedMin: 0 },
  };
}
