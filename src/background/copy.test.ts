import { describe, expect, it } from 'vitest';
import { duration, mmss } from '@/lib/format';
import { notificationCopy } from './copy';

describe('notification copy', () => {
  it('matches the design', () => {
    expect(notificationCopy('prompt', { seatedMin: 60 }).message).toBe(
      '1 h 00 seated. Your break is ready in Chrome.',
    );
    expect(notificationCopy('reminder', { seatedMin: 65 })).toEqual({
      title: 'Your break is waiting.',
      message: '1 h 05 seated.',
      button: 'Start break',
    });
    expect(notificationCopy('breakDone', { minutes: 6 }).message).toBe(
      '+6 min of movement. Battery recharged.',
    );
    expect(notificationCopy('dayEnd', { breaks: 7, goal: 8 }).message).toBe(
      '7 of 8 breaks. See how your day went.',
    );
  });
});

describe('format', () => {
  it('durations and clocks', () => {
    expect(duration(42)).toBe('42 min');
    expect(duration(68)).toBe('1 h 08');
    expect(mmss(17 * 60_000 + 50_000)).toBe('17:50');
    expect(mmss(-5)).toBe('0:00');
  });
});
