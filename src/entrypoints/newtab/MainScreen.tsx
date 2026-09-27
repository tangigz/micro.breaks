import type { Theme } from '@/engine';
import { Battery } from '@/ui/Battery';
import { Header, ThemeToggle, TodayPill } from '@/ui/Header';
import { ArrowRightIcon, BellOffIcon, PlayIcon, TimerIcon } from '@/ui/icons';
import type { MainContent, Tone } from './content';

export interface MainScreenProps {
  content: MainContent;
  chipLabel: string;
  theme: Theme;
  notificationsOff: boolean;
  onStartBreak: () => void;
  onOpenTimer: () => void;
  onOpenRecap: () => void;
  onToggleTheme: () => void;
  onGapAnswer: (moved: boolean) => void;
  onTurnOnNotifications: () => void;
  /** Dev builds: a way to the dev panel. */
  devLink?: boolean;
  /** Screen gallery: a fixed 1440 × 900 frame instead of the whole window. */
  frame?: boolean;
}

const tone: Record<Tone, string> = { ink: 'text-ink', ink2: 'text-ink-2', att: 'text-att' };

const primary =
  'bg-ink text-on-ink text-meta inline-flex h-[52px] cursor-pointer items-center gap-2.5 rounded-full px-[26px] font-semibold whitespace-nowrap';

/** The pinned micro.breaks tab and every new tab (design frames "New tab …", 1440 × 900). */
export function MainScreen(p: MainScreenProps) {
  const c = p.content;
  const batteryLabel = c.battery.idle
    ? 'Battery idle, not tracking right now'
    : c.kind === 'overdue'
      ? 'Battery empty, your break is due'
      : c.eyebrow.startsWith('Lunch')
        ? 'Battery recharging during lunch'
        : `Battery at ${Math.round(c.battery.level)} percent until your next break`;

  return (
    <div
      className={`relative isolate flex flex-col items-center overflow-hidden ${p.frame ? 'h-[900px] w-[1440px]' : 'min-h-screen'}`}
    >
      <Header>
        {p.devLink && (
          <a href="/dev.html" className="text-meta text-ink-3 mr-3 underline">
            Dev panel
          </a>
        )}
        <TodayPill {...c.pill} onOpen={p.onOpenRecap} />
        <ThemeToggle theme={p.theme} onToggle={p.onToggleTheme} />
      </Header>

      <main className="grid w-[1120px] max-w-[calc(100%-80px)] flex-1 grid-cols-[minmax(280px,420px)_minmax(0,1fr)] items-center gap-x-[clamp(32px,6vw,80px)] pb-[72px]">
        <div className="flex justify-center">
          <Battery
            level={c.battery.level}
            idle={c.battery.idle}
            still={c.battery.still}
            dim={c.battery.dim}
            label={batteryLabel}
          />
        </div>

        {c.kind === 'gap' ? (
          <div role="dialog" aria-labelledby="gap-question" className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <div className={`text-eyebrow font-medium uppercase ${tone[c.eyebrowTone]}`}>{c.eyebrow}</div>
              <h1 id="gap-question" className="text-headline m-0 font-bold">
                {c.title}
              </h1>
              <div className="text-section text-ink-2 font-semibold">{c.sub}</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => p.onGapAnswer(true)}
                className="bg-ink text-on-ink text-body h-14 cursor-pointer rounded-full px-8 font-semibold"
              >
                Yes, I moved
              </button>
              <button
                type="button"
                onClick={() => p.onGapAnswer(false)}
                className="bg-pill text-ink text-meta h-14 cursor-pointer rounded-full px-6 font-medium"
              >
                No, I kept working
              </button>
            </div>
            <div className="text-meta text-ink-3">No answer counts as seated.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {c.kind === 'quiet' ? (
              <div className="flex flex-col gap-3">
                <div className={`text-eyebrow font-medium uppercase ${tone[c.eyebrowTone]}`}>{c.eyebrow}</div>
                <h1 className={`m-0 font-bold ${c.titleSize === 'hero' ? 'text-hero' : 'text-headline'}`}>
                  {c.title}
                </h1>
                {c.sub && (
                  <div className="text-section text-ink-2 mt-3 max-w-[540px] leading-[30px] font-semibold">
                    {c.sub}
                  </div>
                )}
                {c.stats && (
                  <div className="text-section text-ink-2 mt-3 leading-[30px] font-semibold">
                    <span className="text-ink">{c.stats.breaks}</span> breaks ·{' '}
                    <span className="text-ink">{c.stats.desk}</span> at your desk · longest{' '}
                    <span className="text-ink">{c.stats.longest}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <div className={`text-eyebrow font-medium uppercase ${tone[c.eyebrowTone]}`}>
                    {c.eyebrow}
                  </div>
                  <div role="timer" aria-live="off" className="text-hero font-bold">
                    {c.title}
                  </div>
                </div>
                {c.since && (
                  <div className="flex flex-col gap-2.5">
                    <div className="text-section text-ink-2 font-semibold">
                      <span className={tone[c.since.tone]}>{c.since.value}</span> since your last active break
                      {c.since.note && <span className="text-ink-3">{c.since.note}</span>}
                    </div>
                    {c.overLine && <div className="text-ink-2 text-[17px] leading-[22px]">{c.overLine}</div>}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {c.recap && (
                <button type="button" onClick={p.onOpenRecap} className={primary}>
                  {c.recap}
                  <ArrowRightIcon size={18} />
                </button>
              )}
              {c.start && (
                <button type="button" onClick={p.onStartBreak} className={primary}>
                  <PlayIcon size={18} />
                  Start a break now
                </button>
              )}
              {c.chip && (
                <button
                  type="button"
                  onClick={p.onOpenTimer}
                  aria-label={`Edit your movement timer: ${p.chipLabel}`}
                  className="border-line text-ink-2 text-meta inline-flex h-[52px] cursor-pointer items-center gap-2.5 rounded-full border px-[22px] font-medium whitespace-nowrap"
                >
                  <TimerIcon size={18} />
                  {p.chipLabel}
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {p.notificationsOff && (
        <div
          role="status"
          className="bg-att-bg text-ink text-meta absolute bottom-10 left-1/2 flex h-12 -translate-x-1/2 items-center gap-3 rounded-full pr-2 pl-5 whitespace-nowrap"
        >
          <BellOffIcon size={18} className="text-att" />
          <span>
            <b className="font-semibold">Notifications are off.</b> micro.breaks can't reach you outside
            Chrome.
          </span>
          <button
            type="button"
            onClick={p.onTurnOnNotifications}
            className="bg-ink text-on-ink text-meta h-9 cursor-pointer rounded-full px-4 font-semibold"
          >
            Turn on
          </button>
        </div>
      )}
    </div>
  );
}
