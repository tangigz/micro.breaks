import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/engine';
import { NO_PROGRESS } from '@/lib/setup';
import { allDone, setupSteps, type StepContext } from './steps';

const ctx: StepContext = {
  settings: DEFAULT_SETTINGS,
  place: 'office',
  notificationsAllowed: true,
  canEdit: false,
};
const labels = (s: { actions: { label: string }[] }) => s.actions.map((a) => a.label);

describe('first-run setup steps', () => {
  it('step 1 shows the current movement timer and "Keep these"', () => {
    const [timer] = setupSteps(NO_PROGRESS, ctx);
    expect(timer).toMatchObject({
      title: 'Set your movement timer',
      desc: 'Every 60 min, 9:00–18:00. Lunch 12:30–13:30. From the office.',
      done: false,
    });
    expect(labels(timer!)).toEqual(['Keep these']);
    expect(labels(setupSteps(NO_PROGRESS, { ...ctx, canEdit: true })[0]!)).toEqual(['Edit', 'Keep these']);
  });

  it('step 2 walks from allow to test to "Yes, it stayed"', () => {
    const step = (p = NO_PROGRESS, allowed = true) =>
      setupSteps(p, { ...ctx, notificationsAllowed: allowed })[1]!;
    expect(labels(step(NO_PROGRESS, false))).toEqual(['Allow']);
    expect(step(NO_PROGRESS, false).desc).toBe(
      'Then set Chrome to Alerts, not Banners, in System Settings › Notifications.',
    );
    expect(labels(step())).toEqual(['Send a test']);
    expect(labels(step({ ...NO_PROGRESS, testSent: true }))).toEqual(['Send again', 'Yes, it stayed']);
    expect(step({ ...NO_PROGRESS, testSent: true }).desc).toBe(
      'Did the test stay on screen until you closed it?',
    );
    const done = step({ ...NO_PROGRESS, testSent: true, confirmed: true });
    expect(done).toMatchObject({ done: true, desc: 'Alerts are on. Notifications wait for you.' });
  });

  it('notifications blocked again: step 2 is not done any more', () => {
    const p = { timer: true, testSent: true, confirmed: true };
    expect(allDone(setupSteps(p, ctx))).toBe(true);
    expect(allDone(setupSteps(p, { ...ctx, notificationsAllowed: false }))).toBe(false);
  });

  it('home place', () => {
    expect(setupSteps(NO_PROGRESS, { ...ctx, place: 'home' })[0]!.desc).toMatch(/From home\.$/);
  });
});
