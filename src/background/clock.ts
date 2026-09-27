/** The only place the background reads the time; the dev panel (#4) will be able to shift and speed it. */
export function now(): number {
  return Date.now();
}
