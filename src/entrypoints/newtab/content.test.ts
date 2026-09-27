import { describe, expect, it } from 'vitest';
import { sim } from '@/engine/testing';
import { chipLabel, mainContent, type MainContext } from './content';

const MON = '2026-10-05';
const ctx = (s: ReturnType<typeof sim>, extra: Partial<MainContext> = {}): MainContext => ({
  settings: s.state.settings,
  now: s.now,
  today: null,
  lastWorkday: null,
  ...extra,
});
const content = (s: ReturnType<typeof sim>, extra?: Partial<MainContext>) =>
  mainContent(s.view(), ctx(s, extra));

describe('main screen copy (design frames "New tab …")', () => {
  it('normal: countdown and time since the last break', () => {
    const s = sim(`${MON} 9:00`).work().until('9:42');
    expect(content(s)).toMatchObject({
      eyebrow: 'Next break in',
      title: '18:00',
      titleSize: 'hero',
      timer: true,
      since: { value: '42 min', tone: 'ink' },
      start: true,
      chip: true,
      battery: { level: expect.closeTo(30, 5), idle: false },
      pill: { day: 'Today', taken: 0, goal: 8 },
    });
  });

  it('overdue, during reminders', () => {
    const s = sim(`${MON} 10:00`).work().until('11:08');
    expect(content(s)).toMatchObject({
      eyebrow: 'Break overdue by',
      eyebrowTone: 'att',
      title: '8:00',
      since: { value: '1 h 08', tone: 'att', note: ' · reminder 2 of 3 at 11:10' },
      overLine: undefined,
      battery: { level: 0 },
    });
  });

  it('overdue, after Skip', () => {
    const s = sim(`${MON} 10:04`).work().until('11:04').act({ type: 'skip' }).until('11:16');
    expect(content(s).overLine).toBe('Skipped. Next prompt at 12:04.');
  });

  it('overdue, reminders stopped', () => {
    const s = sim(`${MON} 10:00`).work().until('11:22');
    expect(content(s).overLine).toBe('Reminders stopped. Take a break when you can.');
  });

  it('before working hours', () => {
    const s = sim(`${MON} 8:40`);
    expect(content(s)).toMatchObject({
      eyebrow: 'Before working hours',
      title: '9:00',
      titleSize: 'hero',
      sub: 'Your day starts at 9:00, at your first activity.',
      start: false,
      chip: true,
      battery: { idle: true, still: true },
    });
  });

  it('lunch', () => {
    const s = sim(`${MON} 12:00`).work().until('12:45');
    expect(content(s)).toMatchObject({
      eyebrow: 'Lunch · 12:30–13:30',
      title: 'Lunch.',
      sub: 'Tracking paused until 13:30. Your battery will be full.',
      start: false,
      chip: true,
      battery: { idle: false },
    });
  });

  it('done for today', () => {
    const s = sim(`${MON} 17:00`).work().until('18:10');
    expect(content(s, { today: { breaks: 6, deskMin: 400, longestMin: 72 } })).toMatchObject({
      eyebrow: 'Monday · 18:00',
      title: 'Done for today.',
      stats: { breaks: '6 of 8', desk: '6 h 40', longest: '72 min' },
      start: false,
      chip: false,
      recap: 'See your day',
    });
  });

  it('weekend: shows Friday on the pill', () => {
    const s = sim('2026-10-10 10:00');
    const friday = new Date(2026, 9, 9, 12).getTime();
    expect(content(s, { lastWorkday: { date: friday, breaks: 7 } })).toMatchObject({
      eyebrow: 'Saturday',
      title: 'Weekend.',
      sub: 'See you Monday at 9:00.',
      recap: 'See Friday',
      pill: { day: 'Friday', taken: 7, goal: 8 },
    });
  });

  it('Chrome was closed: the question takes the hero spot', () => {
    const s = sim(`${MON} 9:00`).work().until('9:30').closeChrome().leave().until('10:10').openChrome();
    expect(content(s)).toMatchObject({
      kind: 'gap',
      eyebrow: 'Chrome was closed for 40 min',
      title: 'Did you step away?',
      sub: 'Your battery depends on it.',
      battery: { dim: true },
    });
  });

  it('timer chip', () => {
    const s = sim(`${MON} 9:00`);
    expect(chipLabel(s.state.settings, s.now)).toBe('Every 60 min · 9:00–18:00');
  });
});
