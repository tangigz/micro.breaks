import Dexie, { type EntityTable } from 'dexie';
import type { EventType } from '@/engine';

/** Append-only log of everything. Recap numbers are derived from it (spec › Data schema). */
export interface StoredEvent {
  id?: number;
  ts: number;
  /** Local day, "2026-10-05". */
  day: string;
  type: EventType;
  payload?: Record<string, unknown>;
}

export const db = new Dexie('micro.breaks') as Dexie & {
  events: EntityTable<StoredEvent, 'id'>;
};

db.version(1).stores({
  events: '++id, ts, day, type',
});
