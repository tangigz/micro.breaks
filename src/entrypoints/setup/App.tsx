import { useEffect, useState } from 'react';
import { showTestNotification } from '@/background/notifications';
import { sendAction } from '@/lib/messages';
import { NO_PROGRESS, onSetupChange, readSetup, saveSetup, type SetupProgress } from '@/lib/setup';
import { useTheme } from '@/ui/theme';
import { useEngine } from '@/ui/useEngine';
import { useHealth } from '@/ui/useHealth';
import { SetupScreen } from './SetupScreen';
import { setupSteps, type StepAction } from './steps';

export function App() {
  const { state } = useEngine();
  const health = useHealth();
  const [progress, setProgress] = useState<SetupProgress>(NO_PROGRESS);
  const [allowed, setAllowed] = useState(true);
  useTheme(state?.settings.theme);

  useEffect(() => {
    void readSetup().then(setProgress);
    return onSetupChange(setProgress);
  }, []);

  // Ask Chrome directly on load and whenever the tab comes back into view (after
  // changing the setting), not only when the background next ticks.
  useEffect(() => {
    const check = () =>
      void browser.notifications.getPermissionLevel().then((level) => setAllowed(level === 'granted'));
    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [health]);

  if (!state) return null;
  const theme = state.settings.theme;
  const steps = setupSteps(progress, {
    settings: state.settings,
    place: state.place,
    notificationsAllowed: allowed,
    canEdit: true,
  });

  const onAction = async (a: StepAction) => {
    switch (a) {
      case 'keep':
        return saveSetup({ timer: true });
      case 'edit':
        location.href = '/settings.html?from=setup';
        return;
      case 'allow':
        // Extensions can't ask for this permission; Chrome's own setting turns it back on.
        return browser.tabs.create({ url: 'chrome://settings/content/notifications' });
      case 'test':
        await showTestNotification();
        return saveSetup({ testSent: true });
      case 'confirm':
        return saveSetup({ confirmed: true });
    }
  };

  return (
    <SetupScreen
      steps={steps}
      theme={theme}
      onAction={(a) => void onAction(a)}
      onStart={() => {
        location.href = '/newtab.html';
      }}
      onToggleTheme={() =>
        sendAction({ type: 'updateSettings', settings: { theme: theme === 'light' ? 'dark' : 'light' } })
      }
    />
  );
}
