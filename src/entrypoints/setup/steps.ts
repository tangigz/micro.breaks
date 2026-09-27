/**
 * The setup's two steps and what each offers (design frame "0 · First-run setup").
 * Pure, so every stage is unit-tested.
 */
import { clock, type Place, type Settings } from '@/engine';
import type { SetupProgress } from '@/lib/setup';

export type StepAction = 'keep' | 'edit' | 'allow' | 'test' | 'confirm';

export interface Step {
  n: number;
  done: boolean;
  title: string;
  desc: string;
  actions: { label: string; action: StepAction; primary: boolean }[];
}

const at = (minuteOfDay: number) =>
  clock(new Date(2000, 0, 1, Math.floor(minuteOfDay / 60), minuteOfDay % 60).getTime());

export interface StepContext {
  settings: Settings;
  place: Place;
  /** chrome.notifications.getPermissionLevel(). */
  notificationsAllowed: boolean;
  /** The movement timer screen exists (#7); until then "Edit" is hidden. */
  canEdit: boolean;
}

export function setupSteps(p: SetupProgress, ctx: StepContext): Step[] {
  const s = ctx.settings;
  const edit = ctx.canEdit ? [{ label: 'Edit', action: 'edit' as const, primary: false }] : [];

  const timer: Step = {
    n: 1,
    done: p.timer,
    title: 'Set your movement timer',
    desc: `Every ${s.intervalMin} min, ${at(s.dayStart)}–${at(s.dayEnd)}. Lunch ${at(s.lunchStart)}–${at(s.lunchEnd)}. ${ctx.place === 'home' ? 'From home' : 'From the office'}.`,
    actions: p.timer ? edit : [...edit, { label: 'Keep these', action: 'keep', primary: true }],
  };

  // 0 not allowed · 1 allowed, no test yet · 2 test sent · 3 confirmed
  const stage = !ctx.notificationsAllowed ? 0 : p.confirmed ? 3 : p.testSent ? 2 : 1;
  const notifications: Step = {
    n: 2,
    done: stage === 3,
    title: 'Allow notifications, and make them stay',
    desc: [
      'Then set Chrome to Alerts, not Banners, in System Settings › Notifications.',
      'Allowed. Now set Chrome to Alerts in System Settings › Notifications, then test.',
      'Did the test stay on screen until you closed it?',
      'Alerts are on. Notifications wait for you.',
    ][stage]!,
    actions: [
      [{ label: 'Allow', action: 'allow' as const, primary: true }],
      [{ label: 'Send a test', action: 'test' as const, primary: true }],
      [
        { label: 'Send again', action: 'test' as const, primary: false },
        { label: 'Yes, it stayed', action: 'confirm' as const, primary: true },
      ],
      [{ label: 'Send a test', action: 'test' as const, primary: false }],
    ][stage]!,
  };

  return [timer, notifications];
}

export const allDone = (steps: Step[]) => steps.every((s) => s.done);
