import type { Recharge } from '@/engine';

export interface RechargedCopy {
  /** "While you were away", "Chrome was closed · You moved", or none after a timed break. */
  eyebrow: string | null;
  /** After "+N min": "of movement" or "away". */
  unit: string;
  /** "Break 3 of 8 today" / "Counted as break 3 of 8 today". */
  line: string;
}

/** Design frames "4 · Break done" and its two variants. */
export function rechargedCopy(r: Recharge, goal: number): RechargedCopy {
  const away = r.source === 'away' || r.source === 'gap';
  return {
    eyebrow:
      r.source === 'away'
        ? 'While you were away'
        : r.source === 'gap'
          ? 'Chrome was closed · You moved'
          : null,
    unit: away ? 'away' : 'of movement',
    line: `${away ? 'Counted as break' : 'Break'} ${r.breakNumber} of ${goal} today`,
  };
}
