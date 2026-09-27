import { describe, expect, it } from 'vitest';
import type { LogEvent } from '@/engine';
import { clock } from '@/engine';
import { sim } from '@/engine/testing';
import { dayStats } from './stats';

const events = (s: ReturnType<typeof sim>) =>
  s.log.flatMap((l) => (l.effect.type === 'log' ? [l.effect.event as LogEvent] : []));

describe('day stats from the event log', () => {
  it('desk time, breaks, time moving and the longest stretch', () => {
    // 9:00 start · break 10:00–10:06 · lunch · break 15:00–15:10 · day ends 18:00
    const s = sim('2026-10-05 9:00').work().until('10:00').leave().until('10:06').back();
    s.until('15:00').leave().until('15:10').back().until('18:30');
    const d = dayStats(events(s), s.state.settings, s.now);

    expect(d.breaks).toBe(2);
    expect(d.movedMin).toBe(16);
    // 9 h − 1 h lunch − 16 min moving
    expect(d.deskMin).toBe(8 * 60 - 16);
    expect(d.longest).toMatchObject({ min: 170 });
    expect([clock(d.longest!.start), clock(d.longest!.end)]).toEqual(['15:10', '18:00']);
  });

  it('so far: counts until now', () => {
    const s = sim('2026-10-05 9:00').work().until('9:42');
    expect(dayStats(events(s), s.state.settings, s.now)).toMatchObject({ deskMin: 42, breaks: 0 });
  });

  it('no day yet: zeros', () => {
    const s = sim('2026-10-05 8:00').until('8:30');
    expect(dayStats(events(s), s.state.settings, s.now)).toMatchObject({ dayStartAt: null, deskMin: 0 });
  });
});
