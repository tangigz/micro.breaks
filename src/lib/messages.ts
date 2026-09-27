import type { Action, EngineState } from '@/engine';
import { initialState } from '@/engine';

/** chrome.storage.local keys shared by the background and the screens. */
export const STATE_KEY = 'engine';
export const HEALTH_KEY = 'health';

export interface Health {
  /** chrome.notifications.getPermissionLevel(). */
  notifications: 'granted' | 'denied';
}

export interface ActionMessage {
  type: 'action';
  action: Action;
}

/** Screens never change state themselves: they send actions to the background. */
export async function sendAction(action: Action): Promise<void> {
  await browser.runtime.sendMessage({ type: 'action', action } satisfies ActionMessage);
}

export async function readState(): Promise<EngineState> {
  const got = await browser.storage.local.get(STATE_KEY);
  return (got[STATE_KEY] as EngineState | undefined) ?? initialState();
}

export function onStateChange(cb: (st: EngineState) => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && changes[STATE_KEY]?.newValue) cb(changes[STATE_KEY].newValue as EngineState);
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
