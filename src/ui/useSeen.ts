import { useEffect, useState } from 'react';

const inFront = () => document.visibilityState === 'visible' && document.hasFocus();

/**
 * Whether this tab has been in front of the person (visible and focused) since it
 * mounted. "Recharged." waits for it: the break may be logged while the tab is
 * behind another tab or another app.
 */
export function useSeen(): boolean {
  const [seen, setSeen] = useState(inFront);
  useEffect(() => {
    if (seen) return;
    const check = () => {
      if (inFront()) setSeen(true);
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [seen]);
  return seen;
}
