import { useRef } from 'react';
import type { Theme } from '@/engine';
import { ThemeToggle } from '@/ui/Header';
import { ChevronDownIcon, ChevronLeftIcon, ChevronUpIcon } from '@/ui/icons';
import { Wordmark } from '@/ui/Wordmark';
import { label, NAMES, problem, TITLES, valueOf, wheel, type Draft, type Field } from './sentence';

export interface SettingsScreenProps {
  draft: Draft;
  /** The token being edited, if any. */
  editing: Field | null;
  theme: Theme;
  onOpen: (f: Field) => void;
  onPick: (value: number) => void;
  onStep: (delta: number) => void;
  onDone: () => void;
  onTogglePlace: () => void;
  onSave: () => void;
  onBack: () => void;
  onToggleTheme: () => void;
  frame?: boolean;
}

/** Design frames "1b · Movement timer" and "1c · Picking a time". */
export function SettingsScreen(p: SettingsScreenProps) {
  const d = p.draft;
  const error = problem(d);
  const wheelAcc = useRef(0);

  const token = (f: Field) => {
    const on = p.editing === f;
    const v = label(f, valueOf(d, f));
    return (
      <button
        type="button"
        onClick={() => p.onOpen(f)}
        aria-label={`${NAMES[f]}, ${v}`}
        aria-expanded={on}
        className={`cursor-pointer rounded-[14px] px-3.5 leading-[52px] ${on ? 'bg-ink text-on-ink' : 'bg-pill text-ink'}`}
      >
        {v}
      </button>
    );
  };

  const panel = (dashed = false) =>
    `rounded-[28px] p-6 ${dashed ? 'border-line border border-dashed' : 'bg-raised border-line border'}`;

  return (
    <div
      className={`relative isolate flex flex-col items-center ${p.frame ? 'h-[900px] w-[1440px]' : 'min-h-screen'}`}
    >
      <header className="flex w-full items-center justify-between px-10 py-6">
        <button
          type="button"
          onClick={p.onBack}
          className="bg-raised text-ink text-meta flex h-11 cursor-pointer items-center gap-1.5 rounded-full pr-4 pl-3 font-semibold"
        >
          <ChevronLeftIcon size={20} />
          Back
        </button>
        <Wordmark />
        <div className="flex w-[88px] justify-end">
          <ThemeToggle theme={p.theme} onToggle={p.onToggleTheme} />
        </div>
      </header>

      <main className="grid w-[1120px] max-w-[calc(100%-80px)] flex-1 grid-cols-[minmax(0,1fr)_380px] items-center gap-x-[clamp(32px,6vw,80px)] pb-[72px]">
        <div className="flex flex-col gap-8">
          <div className="text-eyebrow text-ink-2 font-medium uppercase">Your movement timer</div>
          <p className="text-sentence text-ink-2 m-0 font-bold">
            Remind me to move every {token('interval')} from {token('dayStart')} to {token('dayEnd')}. Pause
            for lunch from {token('lunchStart')} to {token('lunchEnd')}. Today I work{' '}
            <button
              type="button"
              onClick={p.onTogglePlace}
              aria-label={`Place, ${d.place === 'home' ? 'from home' : 'from the office'}. Switch`}
              className="bg-pill text-ink cursor-pointer rounded-[14px] px-3.5 leading-[52px]"
            >
              {d.place === 'home' ? 'from home' : 'from the office'}
            </button>
            .
          </p>
          <div className="text-meta text-ink-2">
            Starts on its own when you're active on your computer during your hours.
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {p.editing ? (
            <section
              aria-label={TITLES[p.editing]}
              className={`${panel()} flex flex-col gap-4`}
              onWheel={(e) => {
                wheelAcc.current += e.deltaY;
                if (Math.abs(wheelAcc.current) >= 40) {
                  p.onStep(wheelAcc.current > 0 ? 1 : -1);
                  wheelAcc.current = 0;
                }
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-body font-semibold">{TITLES[p.editing]}</span>
                <span className="text-eyebrow text-ink-3 font-medium tracking-normal">Scroll or ↑ ↓</span>
              </div>
              <div
                role="listbox"
                aria-label={TITLES[p.editing]}
                className="relative flex h-60 flex-col items-center justify-center"
              >
                <div aria-hidden="true" className="bg-pill absolute inset-x-0 top-24 h-12 rounded-[14px]" />
                {wheel(d, p.editing).map((w) => {
                  const far = Math.abs(w.offset);
                  return (
                    <button
                      key={w.offset}
                      type="button"
                      role="option"
                      aria-selected={w.offset === 0}
                      tabIndex={-1}
                      disabled={w.value == null}
                      onClick={() => w.value != null && p.onPick(w.value)}
                      className={`relative h-12 w-full cursor-pointer ${far === 0 ? 'text-ink text-[28px] font-bold' : far === 1 ? 'text-ink-2 text-[22px] font-medium' : 'text-ink-3 text-lg font-medium'}`}
                    >
                      {w.value == null ? '' : label(p.editing!, w.value)}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  aria-label="Previous value"
                  onClick={() => p.onStep(-1)}
                  className="bg-pill text-ink flex h-11 cursor-pointer items-center justify-center rounded-[14px]"
                >
                  <ChevronUpIcon />
                </button>
                <button
                  type="button"
                  aria-label="Next value"
                  onClick={() => p.onStep(1)}
                  className="bg-pill text-ink flex h-11 cursor-pointer items-center justify-center rounded-[14px]"
                >
                  <ChevronDownIcon />
                </button>
                <button
                  type="button"
                  onClick={p.onDone}
                  className="bg-ink text-on-ink text-meta h-11 cursor-pointer rounded-[14px] font-semibold"
                >
                  Done
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className={`${panel(true)} flex flex-col gap-2`}>
                <span className="text-body font-semibold">Make it yours</span>
                <span className="text-meta text-ink-2">Click any highlighted word to change it.</span>
                {error && (
                  <span role="alert" className="text-meta text-att font-semibold">
                    {error}
                  </span>
                )}
              </section>
              <button
                type="button"
                onClick={p.onSave}
                disabled={!!error}
                className="bg-ink text-on-ink text-meta disabled:bg-pill disabled:text-ink-3 h-[52px] cursor-pointer rounded-full font-semibold disabled:cursor-default"
              >
                Save
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
