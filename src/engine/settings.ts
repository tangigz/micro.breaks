import type { BreakTimer, EngineState, Settings } from './types';

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

/**
 * Brings saved state up to date. The extension can update while Chrome runs (or
 * mid-break), so state saved by an older version must never break the screens:
 * missing fields get their defaults, and a break timer from before it counted time
 * away (it had `endsAt`) restarts its count at zero.
 */
export function normalizeState(saved: unknown): EngineState {
  const st = saved as Partial<EngineState> | null | undefined;
  if (!st || typeof st !== 'object') return initialState();
  const base = initialState({ ...DEFAULT_SETTINGS, ...(st.settings ?? {}) });
  const out: EngineState = { ...base, ...st, settings: base.settings, version: 1 };
  const bt = st.breakTimer as (Partial<BreakTimer> & { startedAt?: number }) | null | undefined;
  if (bt) {
    out.breakTimer =
      typeof bt.startedAt === 'number' && typeof bt.intent === 'string'
        ? {
            startedAt: bt.startedAt,
            intent: bt.intent,
            lengthMin: typeof bt.lengthMin === 'number' ? bt.lengthMin : base.settings.breakLengthMin,
            awayMs: typeof bt.awayMs === 'number' && Number.isFinite(bt.awayMs) ? bt.awayMs : 0,
            leftAt: typeof bt.leftAt === 'number' ? bt.leftAt : null,
            ended: bt.ended === true && typeof bt.awayMs === 'number',
          }
        : null;
  }
  return out;
}
