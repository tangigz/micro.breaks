import type { ReactNode } from 'react';
import type { Theme } from '@/engine';
import { ChevronRightIcon, MoonIcon, SunIcon } from './icons';
import { Wordmark } from './Wordmark';

export interface PillData {
  day: string;
  taken: number;
  goal: number;
}

/** "Today · 3 of 8" with one dot per goal break, green when taken. Opens the recap. */
export function TodayPill({ day, taken, goal, onOpen }: PillData & { onOpen?: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${day}: ${taken} of ${goal} active breaks. Open your day.`}
      className="bg-pill text-meta text-ink inline-flex h-11 cursor-pointer items-center gap-3 rounded-full pr-3.5 pl-[18px] font-semibold whitespace-nowrap"
    >
      <span>
        <span className="text-ink-2 font-medium">{day} ·</span> {taken} of {goal}
      </span>
      <span aria-hidden="true" className="flex gap-[3px]">
        {Array.from({ length: goal }, (_, k) => (
          <span key={k} className={`h-3.5 w-1 rounded-sm ${k < taken ? 'bg-pos' : 'bg-dot-off'}`} />
        ))}
      </span>
      <ChevronRightIcon size={16} className="text-ink-3" />
    </button>
  );
}

/** 44 px pill circle: sun in dark, moon in light. The choice is remembered. */
export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      className="bg-pill text-ink flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full"
    >
      {theme === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

/** Wordmark left; right-hand controls (pill, key hints, theme toggle). 24 / 40 px padding. */
export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="relative flex w-full items-center justify-between px-10 py-6">
      <Wordmark />
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
