import { describe, expect, it } from 'vitest';
import { dailyGoal, DEFAULT_SETTINGS, initialState } from './settings';
import { step } from './step';
import { parseLocal, sim } from './testing';
import { MIN, clock } from './time';

const MON = '2026-10-05';
const at = (hm: string) => `${MON} ${hm}`;
const times = (xs: { at: number }[]) => xs.map((x) => clock(x.at));

describe('day start', () => {
  it('starts at the first activity inside working hours, battery full', () => {
    const s = sim(at('8:30')).work().until('9:04');
    expect(s.events('day_start')).toHaveLength(1);
    expect(times(s.events('day_start'))).toEqual(['9:00']);
    expect(s.view()).toMatchObject({ mode: 'normal', level: expect.closeTo(93.3, 1) });
  });

  it('shows "before" until the first activity', () => {
    const s = sim(at('8:30')).until('9:10');
    expect(s.view().mode).toBe('before');
    s.work();
    expect(s.view()).toMatchObject({ mode: 'normal', level: 100 });
    expect(times(s.events('day_start'))).toEqual(['9:10']);
  });

  it('never starts on a weekend', () => {
    const s = sim('2026-10-10 9:00').work().until('12:00');
    expect(s.events('day_start')).toHaveLength(0);
    expect(s.notifications()).toHaveLength(0);
    expect(s.view().mode).toBe('weekend');
  });
});

describe('the spec day timeline', () => {
  // 9:04 day starts · 9:59 heads-up · 10:04 prompt · 10:04–10:10 away · 11:05 heads-up · 11:10 due
  const day = () => sim(at('9:04')).work();

  it('heads-up 5 min before, prompt at zero', () => {
    const s = day().until('10:05');
    expect(times(s.notifications('headsUp'))).toEqual(['9:59']);
    expect(times(s.notifications('prompt'))).toEqual(['10:04']);
    expect(s.effects('openPromptTab')).toHaveLength(1);
    expect(s.notifications('prompt')[0]!.effect.data).toEqual({ seatedMin: 60 });
  });

  it('a 6-min absence from the prompt is logged as a break and refills the battery', () => {
    const s = day().until('10:04').leave().until('10:10').back();
    const logged = s.events('break_logged');
    expect(logged).toHaveLength(1);
    expect((logged[0]!.effect as { event: { payload: unknown } }).event.payload).toMatchObject({
      minutes: 6,
      source: 'prompt',
    });
    expect(s.view()).toMatchObject({ mode: 'normal', level: 100, breaksToday: 1 });
    expect(s.state.pendingRecharge).toMatchObject({ source: 'prompt', minutes: 6, breakNumber: 1 });
    expect(s.state.episode).toMatchObject({ status: 'succeeded' });
  });

  it('the interval restarts when you come back, not on the clock', () => {
    const s = day().until('10:04').leave().until('10:10').back().until('11:11');
    expect(times(s.notifications('headsUp'))).toEqual(['9:59', '11:05']);
    expect(times(s.notifications('prompt'))).toEqual(['10:04', '11:10']);
  });
});

describe('what counts as a break', () => {
  it('under 5 min away is not a break; seated time keeps running', () => {
    const s = sim(at('9:00')).work().until('9:30');
    s.leave().until('9:34');
    s.back();
    expect(s.events('break_logged')).toHaveLength(0);
    expect(s.view().seatedMs).toBe(34 * MIN);
  });

  it('5 min or more away, unprompted, is a break that plays "while you were away"', () => {
    const s = sim(at('9:00')).work().until('9:30').leave().until('9:40').back();
    expect(s.events('break_logged')).toHaveLength(1);
    expect(s.state.pendingRecharge).toEqual({ source: 'away', minutes: 10, breakNumber: 1 });
    expect(s.notifications()).toHaveLength(0);
    s.act({ type: 'rechargeSeen' });
    expect(s.state.pendingRecharge).toBeNull();
  });

  it('screen locked under 5 min: nothing happens', () => {
    const s = sim(at('9:00')).work().until('9:30').lock().until('9:33').unlock();
    expect(s.events('break_logged')).toHaveLength(0);
    expect(s.view().seatedMs).toBe(33 * MIN);
  });

  it('screen locked 5 min or more: a break for the whole away time', () => {
    const s = sim(at('9:00')).work().until('9:30').lock().until('9:37').unlock();
    expect(s.events('break_logged')).toHaveLength(1);
    expect(s.state.today.movedMin).toBe(7);
    expect(s.view().level).toBe(100);
  });

  it('the computer sleeping with Chrome open counts as away', () => {
    const s = sim(at('9:00')).work().until('9:30').sleep().until('9:45').wake();
    expect(s.events('break_logged')).toHaveLength(1);
    expect(s.state.today.movedMin).toBe(15);
  });

  it('a prompt that fires just after you left succeeds when you come back', () => {
    // chrome.idle only reports "idle" 5 min after the last input: at 10:00 you left 3 min ago.
    const s = sim(at('9:00')).work().until('9:57').leave().until('10:20');
    expect(times(s.notifications('prompt'))).toEqual(['10:00']);
    expect(s.notifications('reminder')).toHaveLength(0);
    s.back();
    expect(s.state.episode).toMatchObject({ status: 'succeeded' });
    expect(s.state.pendingRecharge).toMatchObject({ source: 'prompt', minutes: 23 });
  });

  it('once you are known to be away, prompts wait', () => {
    const s = sim(at('9:00')).work().until('9:50').leave().until('10:20');
    expect(s.notifications('prompt')).toHaveLength(0);
    s.back();
    expect(s.events('break_logged')).toHaveLength(1);
    expect(s.notifications('prompt')).toHaveLength(0);
  });
});

describe('reminders and episodes', () => {
  const prompted = () => sim(at('9:00')).work().until('10:00');

  it('remind me later closes the prompt; reminders at +5, +10, +15, then silence', () => {
    const s = prompted();
    s.act({ type: 'remindLater' });
    expect(s.effects('closePromptTab')).toHaveLength(1);
    s.until('11:00');
    expect(times(s.notifications('reminder'))).toEqual(['10:05', '10:10', '10:15']);
    expect(s.notifications('reminder').map((n) => n.effect.data.n)).toEqual([1, 2, 3]);
    expect(s.notifications('reminder')[0]!.effect.data.seatedMin).toBe(65);
  });

  it('no reaction behaves like remind me later', () => {
    const s = prompted().until('10:16');
    expect(times(s.notifications('reminder'))).toEqual(['10:05', '10:10', '10:15']);
  });

  it('fails after the third unanswered reminder; next prompt one interval after the first', () => {
    const s = prompted().until('11:01');
    const ends = s.events('episode_end');
    expect(times(ends)).toEqual(['10:20']);
    expect((ends[0]!.effect as { event: { payload: unknown } }).event.payload).toMatchObject({
      status: 'failed',
      reason: 'unanswered',
    });
    expect(times(s.notifications('prompt'))).toEqual(['10:00', '11:00']);
    // No heads-up while the battery is already empty.
    expect(times(s.notifications('headsUp'))).toEqual(['9:55']);
  });

  it('the overdue screen tracks reminders, then says they stopped', () => {
    const s = prompted().until('10:08');
    expect(s.view()).toMatchObject({
      mode: 'overdue',
      level: 0,
      overdueByMs: 8 * MIN,
      overdueLine: { kind: 'reminder', n: 2, of: 3, at: s.t('10:10') },
    });
    s.until('10:22');
    expect(s.view().overdueLine).toEqual({ kind: 'stopped' });
  });

  it('skip: logged, no reminders, no heads-up, next prompt one interval later', () => {
    const s = prompted().act({ type: 'skip' });
    expect(s.view().overdueLine).toEqual({ kind: 'skipped', nextPromptAt: s.t('11:00') });
    s.until('11:01');
    expect(s.notifications('reminder')).toHaveLength(0);
    expect(times(s.notifications('headsUp'))).toEqual(['9:55']);
    expect(times(s.notifications('prompt'))).toEqual(['10:00', '11:00']);
    expect(s.events('prompt_skipped')).toHaveLength(1);
  });

  it('a break after a failed episode refills the battery and restarts the interval', () => {
    const s = prompted().act({ type: 'skip' }).until('10:30').leave().until('10:36').back();
    expect(s.view()).toMatchObject({ mode: 'normal', level: 100 });
    s.until('11:37');
    expect(times(s.notifications('prompt'))).toEqual(['10:00', '11:36']);
  });

  it('a break taken during the reminders succeeds the episode', () => {
    const s = prompted().act({ type: 'remindLater' }).until('10:07').leave().until('10:14').back();
    expect(s.state.episode).toMatchObject({ status: 'succeeded' });
    // 10:10 still fires: away is only known 5 min after the last input.
    expect(times(s.notifications('reminder'))).toEqual(['10:05', '10:10']);
    expect(s.effects('clearNotifications').length).toBeGreaterThan(0);
  });

  it('start a break now opens the prompt tab without an episode', () => {
    const s = sim(at('9:00')).work().until('9:20').act({ type: 'openPrompt' });
    expect(s.effects('openPromptTab')).toHaveLength(1);
    expect(s.state.episode).toBeNull();
  });
});

describe('break timer', () => {
  const onTimer = () => sim(at('9:00')).work().until('10:00').act({ type: 'chooseBreak', intent: 'energy' });

  it('validated after 5 min away; logged on return with the real away time', () => {
    const s = onTimer().leave().until('10:08').back();
    expect(s.state.pendingRecharge).toEqual({ source: 'timer', minutes: 8, breakNumber: 1 });
    expect(s.state.breakTimer).toBeNull();
    expect(s.state.episode).toMatchObject({ status: 'succeeded' });
  });

  it('timer ends while away: "Break done" notification', () => {
    const s = onTimer().leave().until('10:07');
    expect(s.notifications('breakDone').map((n) => [clock(n.at), n.effect.data.minutes])).toEqual([
      ['10:05', 5],
    ]);
    expect(s.state.breakTimer?.ended).toBe(true);
  });

  it('leaving right after the click: the break counts with the timer', () => {
    const s = onTimer().leave().until('10:12').back();
    expect(s.state.pendingRecharge).toMatchObject({ source: 'timer', minutes: 12 });
  });

  it('coming back early shows "Still here?" and the timer keeps running', () => {
    const s = onTimer().act({ type: 'setBreakLength', lengthMin: 10 }).leave().until('10:02');
    s.act({ type: 'activity' });
    expect(s.state.breakTimer).toMatchObject({ early: true });
    s.leave().until('10:08');
    expect(s.state.breakTimer).toMatchObject({ early: false });
    s.until('10:13').back();
    expect(s.state.pendingRecharge).toMatchObject({ source: 'timer', minutes: 11 });
  });

  it("I'm back before 5 min: nothing logged, back to the overdue screen", () => {
    const s = onTimer().until('10:03').act({ type: 'imBack' });
    expect(s.events('break_logged')).toHaveLength(0);
    expect(s.state.breakTimer).toBeNull();
    expect(s.view().mode).toBe('overdue');
  });

  it('cancel break: no break, the episode continues and remaining reminders fire', () => {
    const s = onTimer().until('10:03').act({ type: 'cancelBreak' }).until('10:16');
    expect(s.events('break_logged')).toHaveLength(0);
    expect(times(s.notifications('reminder'))).toEqual(['10:05', '10:10', '10:15']);
  });

  it('reminders due while the timer runs are dropped; later ones still fire', () => {
    const s = onTimer().act({ type: 'setBreakLength', lengthMin: 10 }).until('10:16');
    expect(times(s.notifications('reminder'))).toEqual(['10:15']);
  });

  it('timer ends while still at the computer: closes a minute later, nothing logged', () => {
    const s = onTimer().until('10:05');
    expect(s.state.breakTimer).not.toBeNull();
    s.until('10:06');
    expect(s.state.breakTimer).toBeNull();
    expect(s.events('break_timer_ended')).toHaveLength(1);
  });

  it('the length picked becomes the default', () => {
    const s = onTimer().act({ type: 'setBreakLength', lengthMin: 10 });
    expect(s.state.breakTimer).toMatchObject({ lengthMin: 10, endsAt: s.t('10:10') });
    expect(s.state.settings.breakLengthMin).toBe(10);
  });
});

describe('lunch', () => {
  it('is silent, cuts an open episode, and refills the battery at 13:30 without a recharge', () => {
    const s = sim(at('11:25')).work().until('12:26');
    expect(times(s.notifications('prompt'))).toEqual(['12:25']);
    s.until('13:00');
    expect(s.view().mode).toBe('lunch');
    expect(s.state.episode).toMatchObject({ status: 'cut' });
    expect(s.notifications('reminder').map((n) => clock(n.at))).toEqual([]);
    s.until('13:31');
    expect(s.view()).toMatchObject({ mode: 'normal', seatedMs: 1 * MIN });
    expect(s.state.pendingRecharge).toBeNull();
    expect(s.events('break_logged')).toHaveLength(0);
  });

  it('no heads-up for a break that would fall in lunch', () => {
    const s = sim(at('11:32')).work().until('12:31');
    expect(s.notifications('headsUp')).toHaveLength(0);
  });

  it('only the part of an absence outside lunch counts', () => {
    const s = sim(at('11:50')).work().until('12:27').leave().until('13:32').back();
    expect(s.events('break_logged')).toHaveLength(1);
    expect(s.state.today.movedMin).toBe(5);
  });
});

describe('day end and rollover', () => {
  it('at the end of hours: recap notification, open episode fails, then silence', () => {
    const s = sim(at('16:59')).work().until('18:30');
    expect(times(s.notifications('dayEnd'))).toEqual(['18:00']);
    expect(s.notifications('dayEnd')[0]!.effect.data).toEqual({ breaks: 0, goal: 8 });
    expect(s.state.episode).toMatchObject({ status: 'failed', failReason: 'dayEnd' });
    expect(s.view().mode).toBe('done');
  });

  it('a new day resets the day and the place', () => {
    const s = sim(at('9:00'))
      .work()
      .act({ type: 'setPlace', place: 'home' })
      .until('9:40')
      .leave()
      .until('9:50');
    s.back().until('2026-10-06 9:01');
    expect(s.state.place).toBe('office');
    expect(s.state.today).toEqual({ breaks: 0, movedMin: 0 });
    expect(s.events('day_start')).toHaveLength(2);
  });
});

describe('Chrome closed', () => {
  const open = () => sim(at('9:00')).work().until('9:30');

  it('under 5 min: counted as seated, no question', () => {
    const s = open().closeChrome().until('9:33').openChrome().work();
    expect(s.state.pendingGap).toBeNull();
    expect(s.view().seatedMs).toBe(33 * MIN);
  });

  it('5 min or more: asks once; "Yes, I moved" logs a break and fills the battery', () => {
    const s = open().closeChrome().leave().until('10:10').openChrome();
    expect(s.view().gap).toEqual({ minutes: 40 });
    s.act({ type: 'gapAnswer', moved: true });
    expect(s.state.pendingRecharge).toEqual({ source: 'gap', minutes: 40, breakNumber: 1 });
    expect(s.view()).toMatchObject({ mode: 'normal', level: 100 });
  });

  it('"No, I kept working" counts the gap as seated; the prompt follows', () => {
    const s = open().closeChrome().until('10:10').openChrome().work();
    expect(s.notifications('prompt')).toHaveLength(0);
    s.act({ type: 'gapAnswer', moved: false });
    s.until('10:11');
    expect(s.state.pendingGap).toBeNull();
    expect(times(s.notifications('prompt'))).toEqual(['10:10']);
  });

  it('no answer within 5 min counts as seated; the prompt follows', () => {
    const s = open().closeChrome().until('10:10').openChrome().work().until('10:16');
    expect(times(s.notifications('prompt'))).toEqual(['10:15']);
  });

  it('only the part of the gap inside today’s hours, outside lunch, counts', () => {
    const s = sim(at('12:00')).work().until('12:27').closeChrome().until('13:33').openChrome();
    expect(s.state.pendingGap).toBeNull();
  });

  it('opening Chrome on a new day asks nothing', () => {
    const s = open().closeChrome().until('2026-10-06 9:30').openChrome().work();
    expect(s.state.pendingGap).toBeNull();
    expect(s.view()).toMatchObject({ mode: 'normal', level: 100 });
  });
});

describe('settings', () => {
  it('daily goal: ⌈(work − lunch) ÷ interval⌉', () => {
    expect(dailyGoal(DEFAULT_SETTINGS)).toBe(8);
    expect(dailyGoal({ ...DEFAULT_SETTINGS, intervalMin: 45 })).toBe(11);
    expect(dailyGoal({ ...DEFAULT_SETTINGS, dayStart: 8 * 60 + 30 })).toBe(9);
    expect(dailyGoal({ ...DEFAULT_SETTINGS, dailyGoal: 6 })).toBe(6);
  });

  it('a new interval applies to the current seated time', () => {
    const s = sim(at('9:00')).work().until('9:40');
    s.act({ type: 'updateSettings', settings: { intervalMin: 45 } }).until('9:46');
    expect(times(s.notifications('prompt'))).toEqual(['9:45']);
  });

  it('wakes up exactly for the next scheduled moment', () => {
    const t0 = parseLocal(at('9:00'));
    const res = step(initialState(), { type: 'tick', idle: 'active' }, t0);
    expect(clock(res.wakeAt!)).toBe('9:55');
    const later = step(res.state, { type: 'tick', idle: 'active' }, parseLocal(at('9:55')));
    expect(later.effects.some((e) => e.type === 'notify' && e.kind === 'headsUp')).toBe(false);
    // Ticks are a minute apart; 55 min of silence means the computer slept: a break.
    expect(later.state.today.breaks).toBe(1);
    expect(clock(later.wakeAt!)).toBe('10:50');
  });
});

describe('main screen modes', () => {
  it('before, normal, lunch, done, weekend', () => {
    const s = sim(at('8:00'));
    expect(s.view()).toMatchObject({ mode: 'before', level: 100 });
    s.until('9:00').work().until('9:15');
    expect(s.view()).toMatchObject({
      mode: 'normal',
      level: 75,
      nextBreakInMs: 45 * MIN,
      seatedMs: 15 * MIN,
    });
    s.leave().until('12:45');
    expect(s.view()).toMatchObject({ mode: 'lunch', level: 100 });
    s.until('18:05');
    expect(s.view()).toMatchObject({ mode: 'done', level: 100 });
    s.until('2026-10-10 10:00');
    expect(s.view().mode).toBe('weekend');
  });

  it('lunch ends an open break timer and a pending question', () => {
    const s = sim(at('12:20')).work().act({ type: 'chooseBreak', intent: 'focus' }).until('12:31');
    expect(s.state.breakTimer).toBeNull();
    expect(s.events('break_timer_ended')).toHaveLength(1);
  });
});
