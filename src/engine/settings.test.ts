import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, initialState, normalizeState } from './settings';

describe('saved state from an older version', () => {
  it('a break timer saved before it counted time away restarts its count at zero', () => {
    const old = {
      ...initialState(),
      breakTimer: {
        startedAt: 1000,
        endsAt: 301_000,
        intent: 'energy',
        lengthMin: 5,
        early: false,
        ended: false,
      },
    };
    expect(normalizeState(old).breakTimer).toEqual({
      startedAt: 1000,
      intent: 'energy',
      lengthMin: 5,
      awayMs: 0,
      leftAt: null,
      ended: false,
    });
  });

  it('missing fields get their defaults; nothing saved gives a fresh state', () => {
    const partial = { version: 1, settings: { intervalMin: 45 }, day: '2026-10-05' };
    const st = normalizeState(partial);
    expect(st.settings).toEqual({ ...DEFAULT_SETTINGS, intervalMin: 45 });
    expect(st.today).toEqual({ breaks: 0, movedMin: 0 });
    expect(st.day).toBe('2026-10-05');
    expect(normalizeState(undefined)).toEqual(initialState());
  });

  it('an unreadable timer is dropped rather than shown broken', () => {
    expect(normalizeState({ ...initialState(), breakTimer: { endsAt: 5 } }).breakTimer).toBeNull();
  });
});
