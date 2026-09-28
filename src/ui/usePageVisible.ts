import { useEffect, useState } from 'react';

/** Whether the person can see this tab right now ("the next time you look at the tab"). */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

/** Visible and focused: the tab is in front of the person, not behind another app. */
export function useInFront(): boolean {
  const read = () => document.visibilityState === 'visible' && document.hasFocus();
  const [inFront, setInFront] = useState(read);
  useEffect(() => {
    const update = () => setInFront(read());
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
    };
  }, []);
  return inFront;
}
