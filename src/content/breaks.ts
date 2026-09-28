/**
 * M1 breaks: one simple idea per intent (spec › The break). The data lives in
 * breaks.json so the M2 exercise library can grow in the same place.
 */
import type { Intent, Place } from '@/engine';
import brain from '@/assets/illustrations/brain.png';
import chair from '@/assets/illustrations/chair.png';
import droplet from '@/assets/illustrations/droplet.png';
import footprints from '@/assets/illustrations/footprints.png';
import highVoltage from '@/assets/illustrations/high-voltage.png';
import raisingHands from '@/assets/illustrations/raising-hands.png';
import data from './breaks.json';

const IMAGES: Record<string, string> = {
  'high-voltage': highVoltage,
  brain,
  chair,
  droplet,
  footprints,
  'raising-hands': raisingHands,
};

export interface IntentInfo {
  intent: Intent;
  /** Card label: "Energy", "Focus", "Pain relief". */
  label: string;
  /** Eyebrow on the break timer. */
  eyebrow: string;
  /** Card illustration (spec › Icons: high voltage, brain, chair). */
  img: string;
  key: '1' | '2' | '3';
}

export const INTENTS: IntentInfo[] = [
  { intent: 'energy', label: 'Energy', eyebrow: 'Energy', img: highVoltage, key: '1' },
  { intent: 'focus', label: 'Focus', eyebrow: 'Focus', img: brain, key: '2' },
  { intent: 'relief', label: 'Pain relief', eyebrow: 'Pain relief', img: chair, key: '3' },
];

export interface Activity {
  id: string;
  name: string;
  cue: string;
  /** Illustration on the break timer. */
  img: string;
}

interface Entry {
  id: string;
  intent: string;
  name: string;
  cue: string;
  img: string;
  home?: { name: string; cue: string; img: string };
}

/** The activity for an intent, as done at the office or at home. */
export function activityFor(intent: Intent, place: Place): Activity {
  const e = (data.breaks as Entry[]).find((b) => b.intent === intent)!;
  const v = place === 'home' && e.home ? e.home : e;
  return { id: e.id, name: v.name, cue: v.cue, img: IMAGES[v.img] ?? highVoltage };
}
