import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/engine';
import { draftFrom, label, problem, stepValue, TIMES, valueOf, wheel, withValue } from './sentence';

const d = draftFrom(DEFAULT_SETTINGS, 'office');

describe('movement timer sentence', () => {
  it('starts from the current settings', () => {
    expect(d).toEqual({
      intervalMin: 60,
      dayStart: 540,
      dayEnd: 1080,
      lunchStart: 750,
      lunchEnd: 810,
      place: 'office',
    });
    expect(label('interval', 60)).toBe('60 min');
    expect(label('dayStart', 540)).toBe('9:00');
  });

  it('times go from 6:00 to 22:00 in 15-min steps', () => {
    expect(TIMES[0]).toBe(360);
    expect(TIMES.at(-1)).toBe(22 * 60);
    expect(TIMES[1]! - TIMES[0]!).toBe(15);
  });

  it('the wheel shows five values around the current one', () => {
    expect(wheel(d, 'interval').map((w) => w.value)).toEqual([30, 45, 60, 75, 90]);
    expect(wheel(withValue(d, 'interval', 30), 'interval').map((w) => w.value)).toEqual([
      null,
      null,
      30,
      45,
      60,
    ]);
    expect(wheel(d, 'dayStart').map((w) => w.value && label('dayStart', w.value))).toEqual([
      '8:30',
      '8:45',
      '9:00',
      '9:15',
      '9:30',
    ]);
  });

  it('↑ ↓ move one step and stop at the ends', () => {
    expect(valueOf(stepValue(d, 'interval', 1), 'interval')).toBe(75);
    expect(valueOf(stepValue(d, 'interval', 5), 'interval')).toBe(90);
    expect(valueOf(stepValue(d, 'dayStart', -1), 'dayStart')).toBe(525);
  });

  it('refuses impossible days', () => {
    expect(problem(d)).toBeNull();
    expect(problem({ ...d, dayEnd: 540 })).toBe('Your day has to end after it starts.');
    expect(problem({ ...d, lunchEnd: 750 })).toBe('Lunch has to end after it starts.');
    expect(problem({ ...d, lunchStart: 480, lunchEnd: 510 })).toBe('Lunch has to fit inside your day.');
  });
});
