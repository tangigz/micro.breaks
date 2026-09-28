import { describe, expect, it } from 'vitest';
import { rechargedCopy } from './rechargedCopy';

describe('"Recharged." copy', () => {
  it('after a timed break or a prompt', () => {
    expect(rechargedCopy({ source: 'timer', minutes: 6, breakNumber: 3 }, 8)).toEqual({
      eyebrow: null,
      unit: 'of movement',
      line: 'Break 3 of 8 today',
    });
    expect(rechargedCopy({ source: 'prompt', minutes: 6, breakNumber: 1 }, 8).line).toBe(
      'Break 1 of 8 today',
    );
  });

  it('after an unprompted break, and after "Yes, I moved"', () => {
    expect(rechargedCopy({ source: 'away', minutes: 10, breakNumber: 3 }, 8)).toEqual({
      eyebrow: 'While you were away',
      unit: 'away',
      line: 'Counted as break 3 of 8 today',
    });
    expect(rechargedCopy({ source: 'gap', minutes: 40, breakNumber: 1 }, 8).eyebrow).toBe(
      'Chrome was closed · You moved',
    );
  });
});
