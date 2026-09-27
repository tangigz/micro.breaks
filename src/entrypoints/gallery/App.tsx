import type { LogEvent, Theme } from '@/engine';
import { dayStats } from '@/data/stats';
import { sim } from '@/engine/testing';
import { chipLabel, mainContent, type MainContext } from '@/entrypoints/newtab/content';
import { MainScreen } from '@/entrypoints/newtab/MainScreen';
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

function Shot({ f, theme }: { f: Frame; theme: Theme }) {
  const ctx: MainContext = {
    settings: f.s.state.settings,
    now: f.s.now,
    today: null,
    lastWorkday: null,
    ...f.ctx,
  };
  return (
    <div
      style={{ width: 1440 * SCALE, height: 900 * SCALE }}
      className="overflow-hidden rounded-xl shadow-lg"
    >
      <div data-theme={theme} style={{ transform: `scale(${SCALE})`, transformOrigin: '0 0' }}>
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
      </div>
    </div>
  );
}

export function App() {
  return (
    <div className="flex flex-col gap-10 p-10">
      <div className="flex items-baseline gap-3">
        <Wordmark />
        <span className="text-meta text-ink-2">Screen gallery · main screen · dark and light</span>
      </div>
      {frames.map((f) => (
        <section key={f.name} className="flex flex-col gap-3">
          <h2 className="text-meta text-ink-2 m-0 font-medium">{f.name}</h2>
          <div className="flex flex-wrap gap-6">
            <Shot f={f} theme="dark" />
            <Shot f={f} theme="light" />
          </div>
        </section>
      ))}
    </div>
  );
}
