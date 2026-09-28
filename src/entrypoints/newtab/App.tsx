import { useEffect } from 'react';
import { DEV_TOOLS } from '@/lib/clock';
import { sendAction } from '@/lib/messages';
import { RechargedScreen } from '@/ui/RechargedScreen';
import { useTheme } from '@/ui/theme';
import { usePageVisible } from '@/ui/usePageVisible';
import { useDaySummaries } from '@/ui/useDaySummaries';
import { useEngine } from '@/ui/useEngine';
import { useHealth } from '@/ui/useHealth';
import { chipLabel, mainContent } from './content';
import { MainScreen } from './MainScreen';

/** The animation ends at ~4 s; leave a few seconds to read it. */
const RECHARGE_SHOWN_MS = 8_000;

export function App() {
  const { state, view, now } = useEngine();
  const health = useHealth();
  const summaries = useDaySummaries(state, view?.mode, now);
  useTheme(state?.settings.theme);

  const visible = usePageVisible();
  const recharge = state?.pendingRecharge ?? null;
  // "Recharged." plays once the next time you look at this tab, then the normal screen.
  useEffect(() => {
    if (!recharge || !visible) return;
    const t = setTimeout(() => void sendAction({ type: 'rechargeSeen' }), RECHARGE_SHOWN_MS);
    return () => clearTimeout(t);
  }, [recharge, visible]);

  if (!state || !view) return null;
  const theme = state.settings.theme;
  const toggleTheme = () =>
    sendAction({ type: 'updateSettings', settings: { theme: theme === 'light' ? 'dark' : 'light' } });

  if (recharge && visible) {
    return (
      <RechargedScreen
        recharge={recharge}
        goal={view.goal}
        theme={theme}
        onBack={() => sendAction({ type: 'rechargeSeen' })}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <MainScreen
      content={mainContent(view, { settings: state.settings, now, ...summaries })}
      chipLabel={chipLabel(state.settings, now)}
      theme={theme}
      notificationsOff={health?.notifications === 'denied'}
      onStartBreak={() => sendAction({ type: 'openPrompt' })}
      onOpenTimer={() => {
        location.href = '/settings.html';
      }}
      // The recap comes with #10.
      onOpenRecap={() => {}}
      onToggleTheme={toggleTheme}
      onGapAnswer={(moved) => sendAction({ type: 'gapAnswer', moved })}
      onTurnOnNotifications={() => {
        location.href = '/setup.html';
      }}
      devLink={DEV_TOOLS}
    />
  );
}
