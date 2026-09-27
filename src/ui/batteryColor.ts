/** Battery colour (spec › Battery and glow): full → half over the first half, then half → empty. */
const FULL = [111, 207, 122]; // #6FCF7A
const HALF = [255, 197, 107]; // #FFC56B
const EMPTY = [255, 138, 91]; // #FF8A5B, never pure red

const lerp = (p: number[], q: number[], f: number) => p.map((v, i) => Math.round(v + (q[i]! - v) * f));

/** "r g b" for a level from 0 to 100. */
export function batteryRgb(level: number): string {
  const t = 1 - Math.min(100, Math.max(0, level)) / 100;
  const rgb = t < 0.5 ? lerp(FULL, HALF, t / 0.5) : lerp(HALF, EMPTY, (t - 0.5) / 0.5);
  return rgb.join(' ');
}
