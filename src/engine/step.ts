/**
 * The rules engine: every product rule of docs/spec.html › Product rules, as one
 * pure function. The background feeds it inputs and runs the effects it returns;
 * screens read the state through view() and send actions.
 */
import { dailyGoal } from './settings';
import { MIN, dayKey, dayTimes, isWorkday, nextMidnight, phaseAt, trackedOverlap } from './time';
import type {
  Action,
  Effect,
  EngineState,
  EpisodeStatus,
  EventType,
  FailReason,
  IdleState,
  Input,
  NotificationKind,
  RechargeSource,
  StepResult,
} from './types';

/** chrome.idle reports "idle" after this long without input (detection interval 300 s). */
export const IDLE_DETECTION = 5 * MIN;
/** During the break timer, the shortest window chrome.idle allows: the countdown follows you. */
export const TIMER_IDLE_DETECTION = 15_000;
/** Alarms tick every minute; a longer silence while Chrome is open means the computer slept. */
export const SLEEP_GAP = 6 * MIN;
/** "Did you step away?" with no answer after this long counts as seated. */
export const GAP_ANSWER_WINDOW = 5 * MIN;

/** The idle detection window the background should ask chrome.idle for. */
export function idleDetectionMs(st: EngineState): number {
  return st.breakTimer ? TIMER_IDLE_DETECTION : IDLE_DETECTION;
}

/** Time away counted by the break timer so far, the current absence included. */
export function timerAwayMs(st: EngineState, now: number): number {
  const bt = st.breakTimer;
  if (!bt) return 0;
  return bt.awayMs + (st.away ? Math.max(0, now - Math.max(st.away.since, bt.startedAt)) : 0);
}

interface Run {
  st: EngineState;
  now: number;
  effects: Effect[];
}

export function step(prev: EngineState, input: Input, now: number): StepResult {
  const r: Run = { st: structuredClone(prev), now, effects: [] };
  rollover(r);

  if (input.type === 'startup') {
    onStartup(r);
  } else if (r.st.lastSeenAt != null && now - r.st.lastSeenAt > SLEEP_GAP && !r.st.away) {
    r.st.away = { since: r.st.lastSeenAt, locked: true };
  }

  if (input.type === 'tick' || input.type === 'idle') observeIdle(r, input.idle, input.idleMs);
  if (input.type === 'action') {
    observeIdle(r, 'active');
    onAction(r, input.action);
  }

  advance(r);
  r.st.lastSeenAt = now;
  return { state: r.st, effects: r.effects, wakeAt: nextWake(r.st, now) };
}

// ── helpers ────────────────────────────────────────────────────────────────

function log(r: Run, type: EventType, payload?: Record<string, unknown>) {
  r.effects.push({ type: 'log', event: { type, ts: r.now, ...(payload ? { payload } : {}) } });
}

function notify(r: Run, kind: NotificationKind, data: Record<string, number> = {}) {
  r.effects.push({ type: 'notify', kind, data });
}

function seatedMin(r: Run): number {
  return r.st.seatedSince == null ? 0 : Math.floor((r.now - r.st.seatedSince) / MIN);
}

function endEpisode(r: Run, status: Exclude<EpisodeStatus, 'open'>, reason: FailReason | null = null) {
  const ep = r.st.episode;
  if (!ep || ep.status !== 'open') return;
  ep.status = status;
  ep.failReason = reason;
  // After a skip or an unanswered prompt, the next prompt comes one interval after this one.
  if (status === 'failed' && reason !== 'dayEnd') {
    r.st.blockedUntil = ep.promptAt + r.st.settings.intervalMin * MIN;
  }
  log(r, 'episode_end', {
    id: ep.id,
    status,
    reason,
    promptAt: ep.promptAt,
    remindersSent: ep.remindersSent,
  });
}

function logBreak(r: Run, start: number, end: number, minutes: number, forced?: RechargeSource) {
  const { st } = r;
  const episodeOpen = st.episode?.status === 'open';
  const source: RechargeSource = forced ?? (st.breakTimer ? 'timer' : episodeOpen ? 'prompt' : 'away');
  const episodeId = episodeOpen ? st.episode!.id : null;
  st.today.breaks += 1;
  st.today.movedMin += minutes;
  st.seatedSince = r.now;
  st.headsUpFor = null;
  st.blockedUntil = null;
  st.breakTimer = null;
  st.pendingGap = null;
  st.pendingRecharge = { source, minutes, breakNumber: st.today.breaks };
  if (episodeOpen) endEpisode(r, 'succeeded');
  log(r, 'break_logged', { start, end, minutes, source, episodeId });
  r.effects.push({ type: 'clearNotifications' });
}

// ── day boundaries ─────────────────────────────────────────────────────────

function rollover(r: Run) {
  const { st } = r;
  const key = dayKey(r.now);
  if (st.day === key) return;
  if (st.day && st.dayStartedAt != null && !st.dayEndHandled) {
    endEpisode(r, 'failed', 'dayEnd');
    log(r, 'day_end', { day: st.day, late: true });
  }
  Object.assign(st, {
    day: key,
    place: 'office',
    dayStartedAt: null,
    seatedSince: null,
    lunchStartHandled: false,
    lunchEndHandled: false,
    dayEndHandled: false,
    headsUpFor: null,
    blockedUntil: null,
    episode: null,
    episodeCount: 0,
    breakTimer: null,
    pendingGap: null,
    pendingRecharge: null,
    today: { breaks: 0, movedMin: 0 },
  } satisfies Partial<EngineState>);
}

function maybeStartDay(r: Run) {
  const { st, now } = r;
  if (st.dayStartedAt != null || phaseAt(now, st.settings) !== 'work') return;
  const d = dayTimes(now, st.settings);
  st.dayStartedAt = now;
  st.seatedSince = now;
  st.lunchStartHandled = st.lunchEndHandled = d.hasLunch && now >= d.lunchEnd;
  log(r, 'day_start');
}

// ── inputs ─────────────────────────────────────────────────────────────────

function onStartup(r: Run) {
  const { st, now } = r;
  st.away = null;
  st.startedAt = now;
  if (st.dayStartedAt == null || st.lastSeenAt == null) return;
  const tracked = trackedOverlap(st.lastSeenAt, now, st.settings);
  // Under 5 min (update, crash, restart): counted as seated, no question.
  if (tracked < st.settings.minBreakMin * MIN) return;
  const minutes = Math.round(tracked / MIN);
  st.pendingGap = { from: st.lastSeenAt, to: now, minutes, askedAt: now };
  log(r, 'chrome_gap', { from: st.lastSeenAt, minutes });
}

function observeIdle(r: Run, idle: IdleState, idleMs = IDLE_DETECTION) {
  const { st, now } = r;
  if (idle === 'active') {
    if (st.away) returnFromAway(r);
    maybeStartDay(r);
    return;
  }
  if (!st.away) {
    const since = idle === 'idle' ? now - idleMs : now;
    st.away = { since: Math.max(since, st.startedAt ?? since), locked: idle === 'locked' };
    const bt = st.breakTimer;
    if (bt) bt.leftAt ??= Math.max(st.away.since, bt.startedAt);
    log(r, idle);
  } else if (idle === 'locked') {
    st.away.locked = true;
  }
}

function returnFromAway(r: Run) {
  const { st, now } = r;
  const since = st.away!.since;
  st.away = null;
  log(r, 'active', { awayMin: Math.floor((now - since) / MIN) });
  if (st.dayStartedAt == null) return;
  const bt = st.breakTimer;
  if (bt) {
    // The timer adds up absences: 3 min + 2 min is a 5-min break.
    bt.awayMs += trackedOverlap(Math.max(since, bt.startedAt), now, st.settings);
    if (bt.awayMs >= st.settings.minBreakMin * MIN) {
      logBreak(r, bt.leftAt ?? since, now, Math.round(bt.awayMs / MIN));
    }
    return;
  }
  // Only the part inside today's working hours, outside lunch, counts.
  const tracked = trackedOverlap(since, now, st.settings);
  if (tracked >= st.settings.minBreakMin * MIN) logBreak(r, since, now, Math.round(tracked / MIN));
}

function onAction(r: Run, a: Action) {
  const { st, now } = r;
  switch (a.type) {
    case 'openPrompt':
      r.effects.push({ type: 'openPromptTab' });
      return;
    case 'chooseBreak': {
      const len = st.settings.breakLengthMin;
      st.breakTimer = {
        startedAt: now,
        intent: a.intent,
        lengthMin: len,
        awayMs: 0,
        leftAt: null,
        ended: false,
      };
      const episodeId = st.episode?.status === 'open' ? st.episode.id : null;
      log(r, 'choice_made', { intent: a.intent, episodeId });
      log(r, 'break_timer_started', { lengthMin: len, episodeId });
      r.effects.push({ type: 'clearNotifications' });
      return;
    }
    case 'remindLater':
      log(r, 'prompt_later', { episodeId: st.episode?.status === 'open' ? st.episode.id : null });
      r.effects.push({ type: 'closePromptTab' });
      return;
    case 'skip':
      if (st.episode?.status === 'open') {
        log(r, 'prompt_skipped', { episodeId: st.episode.id });
        endEpisode(r, 'failed', 'skipped');
      }
      r.effects.push({ type: 'closePromptTab' }, { type: 'clearNotifications' });
      return;
    case 'setBreakLength':
      st.settings.breakLengthMin = a.lengthMin;
      if (st.breakTimer) {
        st.breakTimer.lengthMin = a.lengthMin;
        st.breakTimer.ended = timerAwayMs(st, now) >= a.lengthMin * MIN;
      }
      log(r, 'setting_changed', { breakLengthMin: a.lengthMin });
      return;
    case 'imBack':
    case 'cancelBreak':
      // A break that already counted was logged on return; otherwise nothing is logged.
      if (st.breakTimer) {
        st.breakTimer = null;
        log(r, 'break_timer_ended', { reason: a.type });
      }
      return;
    case 'gapAnswer': {
      const gap = st.pendingGap;
      if (!gap) return;
      log(r, 'gap_answer', { moved: a.moved });
      if (a.moved) logBreak(r, gap.from, gap.to, gap.minutes, 'gap');
      st.pendingGap = null;
      return;
    }
    case 'rechargeSeen':
      st.pendingRecharge = null;
      return;
    case 'setPlace':
      st.place = a.place;
      log(r, 'setting_changed', { place: a.place });
      return;
    case 'updateSettings':
      st.settings = { ...st.settings, ...a.settings };
      log(r, 'setting_changed', { ...a.settings });
      return;
  }
}

// ── time passing ───────────────────────────────────────────────────────────

function advance(r: Run) {
  const { st, now } = r;
  const s = st.settings;
  if (!isWorkday(now)) return;
  const d = dayTimes(now, s);

  if (st.pendingGap && now - st.pendingGap.askedAt >= GAP_ANSWER_WINDOW) {
    log(r, 'gap_answer', { moved: false, expired: true });
    st.pendingGap = null;
  }
  if (st.dayStartedAt == null) return;

  if (d.hasLunch && !st.lunchStartHandled && now >= d.lunchStart) {
    st.lunchStartHandled = true;
    endEpisode(r, 'cut');
    if (st.breakTimer) log(r, 'break_timer_ended', { reason: 'lunch' });
    st.breakTimer = null;
    st.pendingGap = null;
    r.effects.push({ type: 'closePromptTab' }, { type: 'clearNotifications' });
    log(r, 'lunch_start');
  }
  if (d.hasLunch && !st.lunchEndHandled && now >= d.lunchEnd) {
    // Lunch counts as a break: the battery is full when it ends.
    st.lunchEndHandled = true;
    st.seatedSince = Math.max(st.seatedSince ?? d.lunchEnd, d.lunchEnd);
    st.headsUpFor = null;
    st.blockedUntil = null;
    log(r, 'lunch_end');
  }

  if (now >= d.end) {
    if (st.dayEndHandled) return;
    st.dayEndHandled = true;
    endEpisode(r, 'failed', 'dayEnd');
    st.breakTimer = null;
    st.pendingGap = null;
    r.effects.push({ type: 'closePromptTab' }, { type: 'clearNotifications' });
    notify(r, 'dayEnd', { breaks: st.today.breaks, goal: dailyGoal(s) });
    log(r, 'day_end', { day: st.day });
    return;
  }
  if (phaseAt(now, s) !== 'work' || st.seatedSince == null) return;
  if (st.pendingGap) return; // "Did you step away?" takes the hero spot until answered

  // The countdown only runs while away, so it can only end while away.
  const bt = st.breakTimer;
  if (bt && !bt.ended && st.away && timerAwayMs(st, now) >= bt.lengthMin * MIN) {
    bt.ended = true;
    notify(r, 'breakDone', { minutes: Math.floor(timerAwayMs(st, now) / MIN) });
  }

  // Away: nothing interrupts. A timer waiting for the person to leave does not silence reminders.
  const quiet = st.away != null;
  const due = st.seatedSince + s.intervalMin * MIN;
  const ep = st.episode;

  if (ep?.status === 'open') {
    const every = s.reminderEveryMin * MIN;
    const n = Math.min(s.reminderMax, Math.floor((now - ep.promptAt) / every));
    if (n > ep.remindersSent) {
      // Reminders that came due while away or on the timer are dropped, the rest still fire.
      if (!quiet) {
        notify(r, 'reminder', { n, of: s.reminderMax, seatedMin: seatedMin(r) });
        log(r, 'reminder_sent', { episodeId: ep.id, n });
      }
      ep.remindersSent = n;
    }
    if (!quiet && now >= ep.promptAt + every * (s.reminderMax + 1)) endEpisode(r, 'failed', 'unanswered');
    return;
  }

  if (quiet) return;

  const dueInHours = due < d.end && !(d.hasLunch && due >= d.lunchStart && due < d.lunchEnd);
  const headsUpAt = due - s.headsUpMin * MIN;
  if (st.blockedUntil == null && dueInHours && st.headsUpFor !== due && now >= headsUpAt && now < due) {
    st.headsUpFor = due;
    notify(r, 'headsUp', { dueAt: due });
    log(r, 'headsup_sent', { dueAt: due });
  }

  const promptAt = Math.max(due, st.blockedUntil ?? 0);
  if (now >= promptAt) {
    st.episodeCount += 1;
    st.episode = {
      id: `${st.day}#${st.episodeCount}`,
      promptAt: now,
      remindersSent: 0,
      status: 'open',
      failReason: null,
    };
    st.blockedUntil = null;
    r.effects.push({ type: 'openPromptTab' });
    notify(r, 'prompt', { seatedMin: seatedMin(r) });
    log(r, 'prompt_shown', { episodeId: st.episode.id, seatedMin: seatedMin(r) });
  }
}

function nextWake(st: EngineState, now: number): number | null {
  const s = st.settings;
  const c: number[] = [nextMidnight(now)];
  if (isWorkday(now)) {
    const d = dayTimes(now, s);
    c.push(d.start, d.lunchStart, d.lunchEnd, d.end);
    if (st.pendingGap) c.push(st.pendingGap.askedAt + GAP_ANSWER_WINDOW);
    if (st.breakTimer && !st.breakTimer.ended && st.away) {
      c.push(now + st.breakTimer.lengthMin * MIN - timerAwayMs(st, now));
    }
    if (st.seatedSince != null) {
      const due = st.seatedSince + s.intervalMin * MIN;
      c.push(due - s.headsUpMin * MIN, due);
    }
    if (st.blockedUntil != null) c.push(st.blockedUntil);
    const ep = st.episode;
    if (ep?.status === 'open') {
      const every = s.reminderEveryMin * MIN;
      c.push(ep.promptAt + every * (ep.remindersSent + 1), ep.promptAt + every * (s.reminderMax + 1));
    }
  }
  const future = c.filter((t) => t > now);
  return future.length ? Math.min(...future) : null;
}
