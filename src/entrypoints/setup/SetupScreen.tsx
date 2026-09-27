import type { Theme } from '@/engine';
import { Header, ThemeToggle } from '@/ui/Header';
import { ArrowRightIcon, CheckIcon } from '@/ui/icons';
import { allDone, type Step, type StepAction } from './steps';

export interface SetupScreenProps {
  steps: Step[];
  theme: Theme;
  onAction: (a: StepAction) => void;
  onStart: () => void;
  onToggleTheme: () => void;
  /** Screen gallery: a fixed 1440 × 900 frame instead of the whole window. */
  frame?: boolean;
}

/** Design frame "0 · First-run setup": welcome on the left, two steps on the right. */
export function SetupScreen(p: SetupScreenProps) {
  const done = allDone(p.steps);
  return (
    <div
      className={`relative isolate flex flex-col items-center overflow-hidden ${p.frame ? 'h-[900px] w-[1440px]' : 'min-h-screen'}`}
    >
      <Header>
        <ThemeToggle theme={p.theme} onToggle={p.onToggleTheme} />
      </Header>

      <main className="grid w-[1120px] max-w-[calc(100%-80px)] flex-1 grid-cols-[minmax(280px,420px)_minmax(0,1fr)] items-center gap-x-[clamp(32px,6vw,80px)] pb-[72px]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="text-eyebrow text-ink-2 font-medium uppercase">Welcome</div>
            <h1 className="m-0 text-[56px] leading-[60px] font-bold tracking-[-0.035em]">
              Let's set up micro.breaks.
            </h1>
            <p className="text-body text-ink-2 m-0">
              Two steps, about a minute. Then it runs on its own whenever you're working.
            </p>
          </div>
          <button
            type="button"
            disabled={!done}
            onClick={p.onStart}
            className="text-body bg-ink text-on-ink disabled:bg-pill disabled:text-ink-3 inline-flex h-14 cursor-pointer items-center gap-2.5 self-start rounded-full px-8 font-semibold disabled:cursor-default"
          >
            Start moving
            {done && <ArrowRightIcon size={20} />}
          </button>
        </div>

        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {p.steps.map((s) => (
            <li
              key={s.n}
              className="bg-raised flex min-h-28 items-center gap-4 rounded-[28px] py-5 pr-5 pl-6"
              aria-label={`Step ${s.n}: ${s.title}${s.done ? ', done' : ''}`}
            >
              {s.done ? (
                <span className="bg-pos text-on-pos flex size-8 shrink-0 items-center justify-center rounded-full">
                  <CheckIcon size={18} />
                </span>
              ) : (
                <span className="border-line-2 text-meta text-ink-2 flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-semibold">
                  {s.n}
                </span>
              )}
              <div className="flex min-w-0 grow flex-col gap-1">
                <div className="text-body font-semibold">{s.title}</div>
                <div className="text-meta text-ink-2">{s.desc}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {s.actions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => p.onAction(a.action)}
                    className={`text-meta h-11 cursor-pointer rounded-full px-5 whitespace-nowrap ${a.primary ? 'bg-ink text-on-ink font-semibold' : 'bg-pill text-ink font-medium'}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
