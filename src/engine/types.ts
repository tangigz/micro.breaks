export type Intent = 'energy' | 'focus' | 'relief';
export type Place = 'office' | 'home';
export type Theme = 'dark' | 'light';
export type IdleState = 'active' | 'idle' | 'locked';

export interface Settings {
  /** Remind me to move every N minutes: 30, 45, 60, 75 or 90. */
  intervalMin: number;
  /** Minutes from midnight, 15-min steps. */
  dayStart: number;
  dayEnd: number;
  lunchStart: number;
  lunchEnd: number;
  /** 5, 10 or 15. The last length picked on the break timer. */
  breakLengthMin: number;
  /** Overrides the derived daily goal when set. */
  dailyGoal: number | null;
  theme: Theme;
  headsUpMin: number;
  reminderEveryMin: number;
  reminderMax: number;
  minBreakMin: number;
}

export type EpisodeStatus = 'open' | 'succeeded' | 'failed' | 'cut';
export type FailReason = 'skipped' | 'unanswered' | 'dayEnd';

/** A prompt plus its reminders, until it resolves. The unit of the 80% goal. */
export interface Episode {
  id: string;
  promptAt: number;
  remindersSent: number;
  status: EpisodeStatus;
  failReason: FailReason | null;
}

export interface BreakTimer {
  startedAt: number;
  endsAt: number;
  intent: Intent;
  lengthMin: number;
  /** Activity seen before the break counted: shows "Still here?". */
  early: boolean;
  /** The countdown reached zero while the person was away. */
  ended: boolean;
}

export type RechargeSource = 'timer' | 'prompt' | 'away' | 'gap';

export interface Recharge {
  source: RechargeSource;
  minutes: number;
  breakNumber: number;
}

export interface EngineState {
  version: 1;
  settings: Settings;
  /** Local day the rest of the state belongs to. */
  day: string | null;
  /** "Today I work from…"; resets to the office each morning. */
  place: Place;
  dayStartedAt: number | null;
  /** Start of the current seated stretch. Battery level derives from it. */
  seatedSince: number | null;
  lunchStartHandled: boolean;
  lunchEndHandled: boolean;
  dayEndHandled: boolean;
  /** No input on the computer since then (idle or locked). */
  away: { since: number; locked: boolean } | null;
  /** Last step processed; Chrome-closed gaps are measured from it. */
  lastSeenAt: number | null;
  /** When Chrome last started: time away can't begin before it. */
  startedAt: number | null;
  /** Due time the heads-up was sent for (once per cycle). */
  headsUpFor: number | null;
  /** After Skip or a failed episode, no new prompt before this time. */
  blockedUntil: number | null;
  episode: Episode | null;
  episodeCount: number;
  breakTimer: BreakTimer | null;
  /** Chrome was closed for 5+ tracked minutes: "Did you step away?" */
  pendingGap: { from: number; to: number; minutes: number; askedAt: number } | null;
  /** "Recharged." to play once on the next look. */
  pendingRecharge: Recharge | null;
  today: { breaks: number; movedMin: number };
}

export type Action =
  | { type: 'openPrompt' }
  | { type: 'chooseBreak'; intent: Intent }
  | { type: 'remindLater' }
  | { type: 'skip' }
  | { type: 'setBreakLength'; lengthMin: number }
  | { type: 'activity' }
  | { type: 'imBack' }
  | { type: 'cancelBreak' }
  | { type: 'gapAnswer'; moved: boolean }
  | { type: 'rechargeSeen' }
  | { type: 'setPlace'; place: Place }
  | { type: 'updateSettings'; settings: Partial<Settings> };

export type Input =
  /** Periodic alarm, with chrome.idle.queryState(300). */
  | { type: 'tick'; idle: IdleState }
  /** chrome.idle.onStateChanged. */
  | { type: 'idle'; idle: IdleState }
  /** Chrome started (runtime.onStartup). */
  | { type: 'startup' }
  /** Something the person did on a micro.breaks screen or notification. */
  | { type: 'action'; action: Action };

export type EventType =
  | 'day_start'
  | 'day_end'
  | 'idle'
  | 'locked'
  | 'active'
  | 'chrome_gap'
  | 'gap_answer'
  | 'headsup_sent'
  | 'prompt_shown'
  | 'choice_made'
  | 'prompt_later'
  | 'reminder_sent'
  | 'prompt_skipped'
  | 'episode_end'
  | 'break_timer_started'
  | 'break_timer_ended'
  | 'break_logged'
  | 'lunch_start'
  | 'lunch_end'
  | 'setting_changed';

export interface LogEvent {
  type: EventType;
  ts: number;
  payload?: Record<string, unknown>;
}

export type NotificationKind = 'headsUp' | 'prompt' | 'reminder' | 'breakDone' | 'dayEnd';

export type Effect =
  | { type: 'notify'; kind: NotificationKind; data: Record<string, number> }
  | { type: 'clearNotifications' }
  | { type: 'openPromptTab' }
  | { type: 'closePromptTab' }
  | { type: 'log'; event: LogEvent };

export interface StepResult {
  state: EngineState;
  effects: Effect[];
  /** Next time something is scheduled to happen; the background sets an alarm for it. */
  wakeAt: number | null;
}
