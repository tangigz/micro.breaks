const pad = (n: number) => String(n).padStart(2, '0');

/** "42 min", or "1 h 05" from an hour. */
export function duration(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)}` : `${m} min`;
}

/** "17:50" countdown or count-up from milliseconds. */
export function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
