import { useEffect, useState } from 'react';
import { HEALTH_KEY, type Health } from '@/lib/messages';

/** Whether notifications can reach the person (written by the background on every tick). */
export function useHealth(): Health | null {
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    void browser.storage.local.get(HEALTH_KEY).then((got) => setHealth((got[HEALTH_KEY] as Health) ?? null));
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && HEALTH_KEY in changes)
        setHealth((changes[HEALTH_KEY]!.newValue as Health) ?? null);
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);
  return health;
}
