import { describe, expect, it } from 'vitest';
import { activityFor, INTENTS } from './breaks';

describe('M1 breaks', () => {
  it('one activity per intent, with the home variant for Energy', () => {
    expect(INTENTS.map((i) => [i.key, i.label])).toEqual([
      ['1', 'Energy'],
      ['2', 'Focus'],
      ['3', 'Pain relief'],
    ]);
    expect(activityFor('energy', 'office')).toMatchObject({
      name: 'Take the stairs',
      cue: 'Up and down a floor or two, at an easy pace.',
    });
    expect(activityFor('energy', 'home')).toMatchObject({
      name: 'Walk around',
      cue: 'A few laps of the flat, no phone.',
    });
    expect(activityFor('focus', 'home').name).toBe('Get some water');
    expect(activityFor('relief', 'office').name).toBe('Stand and stretch');
  });
});
