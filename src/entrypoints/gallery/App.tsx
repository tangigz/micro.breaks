import type { ReactNode } from 'react';
import { DEFAULT_SETTINGS, type LogEvent, type Theme } from '@/engine';
import { dayStats } from '@/data/stats';
import { sim } from '@/engine/testing';
import { chipLabel, mainContent, type MainContext } from '@/entrypoints/newtab/content';
import { MainScreen } from '@/entrypoints/newtab/MainScreen';
import { draftFrom, type Draft, type Field } from '@/entrypoints/settings/sentence';
import { SettingsScreen } from '@/entrypoints/settings/SettingsScreen';
import { SetupScreen } from '@/entrypoints/setup/SetupScreen';
import { setupSteps } from '@/entrypoints/setup/steps';
import { NO_PROGRESS, type SetupProgress } from '@/lib/setup';
import { Wordmark } from '@/ui/Wordmark';

// Dev builds only: every main-screen state, dark and light, to compare with the
// design export frames. Each state comes from running the real engine to that moment.

const MON = '2026-10-05';
type Sim = ReturnType<typeof sim>;

const summary = (s: Sim) => {
  const events = s.log.flatMap((l) => (l.effect.type === 'log' ? [l.effect.event as LogEvent] : []));
  const d = dayStats(events, s.state.settings, s.now);
  return { breaks: d.breaks, deskMin: d.deskMin, longestMin: d.longest?.min ?? 0 };
};

/** A day with six breaks, ending at 18:10. */
function fullDay(): Sim {
  const s = sim(`${MON} 9:00`).work();
  for (const [out, back] of [
    ['9:50', '9:56'],
    ['10:40', '10:47'],
    ['11:45', '11:50'],
    ['14:23', '14:29'],
    ['15:35', '15:41'],
    ['16:50', '16:56'],
  ] as const) {
    s.until(out).leave().until(back).back();
  }
  return s.until('18:10');
}

interface Frame {
  name: string;
  s: Sim;
  ctx?: Partial<MainContext>;
  notificationsOff?: boolean;
}

const frames: Frame[] = [
  { name: '1 · New tab', s: sim(`${MON} 9:00`).work().until('9:42') },
  { name: 'Before working hours', s: sim(`${MON} 8:40`) },
  { name: 'Overdue, during reminders', s: sim(`${MON} 10:00`).work().until('11:08') },
  {
    name: 'Overdue, after Skip',
    s: sim(`${MON} 10:04`).work().until('11:04').act({ type: 'skip' }).until('11:16'),
  },
  { name: 'Overdue, reminders stopped', s: sim(`${MON} 10:00`).work().until('11:22') },
  { name: 'Lunch', s: sim(`${MON} 12:00`).work().until('12:45') },
  (() => {
    const s = fullDay();
    return { name: 'Done for today', s, ctx: { today: summary(s) } };
  })(),
  (() => {
    const s = fullDay().until('2026-10-10 10:00');
    return {
      name: 'Weekend',
      s,
      ctx: { lastWorkday: { date: new Date(2026, 9, 9, 12).getTime(), breaks: 7 } },
    };
  })(),
  {
    name: 'Chrome was closed',
    s: sim(`${MON} 9:00`).work().until('9:30').closeChrome().leave().until('10:10').openChrome(),
  },
  {
    name: 'Health line, notifications off',
    s: sim(`${MON} 9:00`).work().until('9:42'),
    notificationsOff: true,
  },
];

const SCALE = 0.45;

function mainShot(f: Frame, theme: Theme) {
  const ctx: MainContext = {
    settings: f.s.state.settings,
    now: f.s.now,
    today: null,
    lastWorkday: null,
    ...f.ctx,
  };
  return (
    <MainScreen
      frame
      content={mainContent(f.s.view(), ctx)}
      chipLabel={chipLabel(f.s.state.settings, f.s.now)}
      theme={theme}
      notificationsOff={!!f.notificationsOff}
      onStartBreak={() => {}}
      onOpenTimer={() => {}}
      onOpenRecap={() => {}}
      onToggleTheme={() => {}}
      onGapAnswer={() => {}}
      onTurnOnNotifications={() => {}}
    />
  );
}

function setupShot(progress: SetupProgress, allowed: boolean) {
  const Shot = (theme: Theme) => (
    <SetupScreen
      frame
      steps={setupSteps(progress, {
        settings: DEFAULT_SETTINGS,
        place: 'office',
        notificationsAllowed: allowed,
        canEdit: false,
      })}
      theme={theme}
      onAction={() => {}}
      onStart={() => {}}
      onToggleTheme={() => {}}
    />
  );
  return Shot;
}

function timerShot(editing: Field | null, change: Partial<Draft> = {}) {
  const Shot = (theme: Theme) => (
    <SettingsScreen
      frame
      draft={{ ...draftFrom(DEFAULT_SETTINGS, 'office'), ...change }}
      editing={editing}
      theme={theme}
      onOpen={() => {}}
      onPick={() => {}}
      onStep={() => {}}
      onDone={() => {}}
      onTogglePlace={() => {}}
      onSave={() => {}}
      onBack={() => {}}
      onToggleTheme={() => {}}
    />
  );
  return Shot;
}

const groups: { title: string; shots: { name: string; render: (theme: Theme) => ReactNode }[] }[] = [
  {
    title: 'First-run setup',
    shots: [
      { name: '0 · First-run setup, notifications not allowed', render: setupShot(NO_PROGRESS, false) },
      {
        name: 'Setup, test sent',
        render: setupShot({ timer: true, testSent: true, confirmed: false }, true),
      },
      { name: 'Setup, all done', render: setupShot({ timer: true, testSent: true, confirmed: true }, true) },
    ],
  },
  {
    title: 'Movement timer',
    shots: [
      { name: '1b · Movement timer', render: timerShot(null) },
      { name: '1c · Picking a time', render: timerShot('dayStart') },
      { name: 'Movement timer, impossible day', render: timerShot(null, { dayEnd: 8 * 60 }) },
    ],
  },
  {
    title: 'Main screen',
    shots: frames.map((f) => ({ name: f.name, render: (t: Theme) => mainShot(f, t) })),
  },
];

function Framed({ theme, children }: { theme: Theme; children: ReactNode }) {
  return (
    <div
      style={{ width: 1440 * SCALE, height: 900 * SCALE }}
      className="overflow-hidden rounded-xl shadow-lg"
    >
      <div data-theme={theme} style={{ transform: `scale(${SCALE})`, transformOrigin: '0 0' }}>
        {children}
      </div>
    </div>
  );
}

export function App() {
  return (
    <div className="flex flex-col gap-10 p-10">
      <div className="flex items-baseline gap-3">
        <Wordmark />
        <span className="text-meta text-ink-2">Screen gallery · dark and light</span>
      </div>
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-8">
          <h1 className="text-title m-0 font-bold">{g.title}</h1>
          {g.shots.map((shot) => (
            <section key={shot.name} className="flex flex-col gap-3">
              <h2 className="text-meta text-ink-2 m-0 font-medium">{shot.name}</h2>
              <div className="flex flex-wrap gap-6">
                <Framed theme="dark">{shot.render('dark')}</Framed>
                <Framed theme="light">{shot.render('light')}</Framed>
              </div>
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
