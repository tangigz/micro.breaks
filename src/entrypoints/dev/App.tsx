import { useEffect, useState, type ReactNode } from 'react';
import { DEV_PRESENCE_KEY, type DevCommand, type PresenceMode } from '@/lib/dev';
import { SETUP_KEY } from '@/lib/setup';
import { db, type StoredEvent } from '@/data/db';
import { clock, timerAwayMs } from '@/engine';
import { currentDevClock } from '@/lib/clock';
import { duration, mmss } from '@/lib/format';
import { useEngine } from '@/ui/useEngine';
import { Wordmark } from '@/ui/Wordmark';

// Dev builds only: move time and play the person at the computer.

async function dev(command: DevCommand) {
  const res = (await browser.runtime.sendMessage({ type: 'dev', command })) as {
    ok: boolean;
    error?: string;
  };
  if (!res?.ok) alert(res?.error ?? 'Dev command failed');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Today if it's a workday, else next Monday, as "YYYY-MM-DD". */
function workday(t: number, plus = 0): string {
  const d = new Date(t);
  d.setDate(d.getDate() + plus);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function Button({ onClick, children, on }: { onClick: () => void; children: ReactNode; on?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-meta h-10 cursor-pointer rounded-full px-4 font-medium ${on ? 'bg-ink text-on-ink' : 'bg-pill text-ink'}`}
    >
      {children}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-line flex flex-col gap-3 rounded-[28px] border p-6">
      <div className="text-eyebrow text-ink-2 uppercase">{title}</div>
      {hint && <p className="text-meta text-ink-3 -mt-1">{hint}</p>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

export function App() {
  const { state, view: v, now } = useEngine();
  const [presence, setPresence] = useState<{ mode: PresenceMode; since: number } | null>(null);
  const [events, setEvents] = useState<StoredEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      const got = await browser.storage.local.get(DEV_PRESENCE_KEY);
      setPresence((got[DEV_PRESENCE_KEY] as typeof presence) ?? null);
      setEvents(await db.events.orderBy('id').reverse().limit(14).toArray());
    };
    void load();
    const t = setInterval(load, 1000);
    return () => clearInterval(t);
  }, []);

  if (!state || !v) return null;
  const speed = currentDevClock()?.speed ?? 1;
  const fake = currentDevClock() != null;
  const day = workday(now);
  const ep = state.episode;
  const date = new Date(now).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="text-meta text-ink-2">Dev panel</span>
        </div>
        <div className="flex gap-4">
          <a className="text-meta text-ink-2 underline" href="/newtab.html" target="_blank">
            Main screen
          </a>
          <a className="text-meta text-ink-2 underline" href="/prompt.html" target="_blank">
            Prompt
          </a>
          <a className="text-meta text-ink-2 underline" href="/gallery.html" target="_blank">
            Screen gallery
          </a>
          <button
            type="button"
            className="text-meta text-ink-2 cursor-pointer underline"
            onClick={async () => {
              await browser.storage.local.remove(SETUP_KEY);
              window.open('/setup.html', '_blank');
            }}
          >
            Show setup again
          </button>
        </div>
      </header>

      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-eyebrow text-ink-2 uppercase">
            {date} · {fake ? `fake time · ${speed}×` : 'real time'}
          </div>
          <div className="text-hero font-bold">{new Date(now).toLocaleTimeString('en-GB')}</div>
        </div>
        <dl className="text-meta text-ink-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-right">
          <dt>Screen</dt>
          <dd className="text-ink font-semibold">{v.gap ? 'Did you step away?' : v.mode}</dd>
          <dt>Battery</dt>
          <dd className="text-ink">
            {Math.round(v.level)}% · {duration(v.seatedMs / 60_000)} seated
          </dd>
          <dt>{v.mode === 'overdue' ? 'Overdue by' : 'Next break in'}</dt>
          <dd className="text-ink">{mmss(v.mode === 'overdue' ? v.overdueByMs : v.nextBreakInMs)}</dd>
          <dt>Prompt</dt>
          <dd className="text-ink">
            {ep
              ? `${ep.status}${ep.failReason ? ` (${ep.failReason})` : ''} · ${ep.remindersSent} reminders`
              : '–'}
          </dd>
          <dt>Break timer</dt>
          <dd className="text-ink">
            {state.breakTimer
              ? `${mmss(state.breakTimer.lengthMin * 60_000 - timerAwayMs(state, now))} left · ${state.away ? 'counting' : 'waiting'}`
              : '–'}
          </dd>
          <dt>Today</dt>
          <dd className="text-ink">
            {v.breaksToday} of {v.goal} breaks · {v.movedMinToday} min moving
          </dd>
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Section
          title="Start a fresh day"
          hint={`Today cleared; you're at the computer, so the day starts then, battery full. ${day}.`}
        >
          {['8:55', '9:00', '12:20', '17:50'].map((t) => (
            <Button key={t} onClick={() => dev({ cmd: 'freshDay', at: `${day}T${t.padStart(5, '0')}` })}>
              {t}
            </Button>
          ))}
          <Button onClick={() => dev({ cmd: 'freshDay', at: `${workday(now, 1)}T08:55` })}>
            Next workday 8:55
          </Button>
        </Section>

        <Section title="Speed" hint="Fast time flows while a micro.breaks tab is open.">
          {[1, 10, 60].map((s) => (
            <Button key={s} on={fake && speed === s} onClick={() => dev({ cmd: 'speed', speed: s })}>
              {s === 1 ? '1× (fake clock)' : s === 60 ? '60× · 1 min per second' : `${s}×`}
            </Button>
          ))}
          <Button on={!fake} onClick={() => dev({ cmd: 'realTime' })}>
            Back to real time
          </Button>
        </Section>

        <Section title="Skip ahead" hint="Minute by minute: prompts and notifications fire on the way.">
          {[1, 5, 15, 30, 60].map((m) => (
            <Button key={m} onClick={() => dev({ cmd: 'forward', minutes: m })}>
              +{m === 60 ? '1 h' : `${m} min`}
            </Button>
          ))}
        </Section>

        <Section
          title="You"
          hint={
            presence
              ? `${presence.mode === 'present' ? 'At the computer' : presence.mode === 'away' ? 'Away' : 'Locked'} since ${clock(presence.since)}. Away counts as idle after 5 min, like Chrome.`
              : 'Real computer activity.'
          }
        >
          <Button on={presence?.mode === 'present'} onClick={() => dev({ cmd: 'presence', mode: 'present' })}>
            At the computer
          </Button>
          <Button on={presence?.mode === 'away'} onClick={() => dev({ cmd: 'presence', mode: 'away' })}>
            Leave the computer
          </Button>
          <Button on={presence?.mode === 'locked'} onClick={() => dev({ cmd: 'presence', mode: 'locked' })}>
            Lock the screen
          </Button>
        </Section>

        <Section title="Chrome" hint="Closed for a while, then reopened: the startup rules apply.">
          {[3, 10, 40].map((m) => (
            <Button key={m} onClick={() => dev({ cmd: 'closeChrome', minutes: m })}>
              Closed for {m} min
            </Button>
          ))}
        </Section>

        <Section title="Last events">
          <ol className="text-meta text-ink-2 w-full">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="text-ink-3 w-12 shrink-0">{clock(e.ts)}</span>
                <span className="text-ink">{e.type}</span>
                <span className="truncate">{e.payload ? JSON.stringify(e.payload) : ''}</span>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  );
}
