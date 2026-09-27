/**
 * First-run setup progress (spec › First run). Kept in chrome.storage so closing
 * and reopening the setup keeps the checked steps. Not a product rule: the engine
 * runs whether or not setup is done.
 */
export const SETUP_KEY = 'setup';

export interface SetupProgress {
  /** Step 1: movement timer kept or edited. */
  timer: boolean;
  /** Step 2: a test notification was sent, then confirmed as staying on screen. */
  testSent: boolean;
  confirmed: boolean;
}

export const NO_PROGRESS: SetupProgress = { timer: false, testSent: false, confirmed: false };

export async function readSetup(): Promise<SetupProgress> {
  const got = await browser.storage.local.get(SETUP_KEY);
  return { ...NO_PROGRESS, ...(got[SETUP_KEY] as Partial<SetupProgress> | undefined) };
}

export async function saveSetup(patch: Partial<SetupProgress>): Promise<void> {
  await browser.storage.local.set({ [SETUP_KEY]: { ...(await readSetup()), ...patch } });
}

export function onSetupChange(cb: (p: SetupProgress) => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && SETUP_KEY in changes) {
      cb({ ...NO_PROGRESS, ...(changes[SETUP_KEY]!.newValue as Partial<SetupProgress> | undefined) });
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
