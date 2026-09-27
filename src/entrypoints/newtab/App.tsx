import { DEV_TOOLS } from '@/lib/clock';
import { sendAction } from '@/lib/messages';
import { useTheme } from '@/ui/theme';
import { useDaySummaries } from '@/ui/useDaySummaries';
import { useEngine } from '@/ui/useEngine';
import { useHealth } from '@/ui/useHealth';
import { chipLabel, mainContent } from './content';
import { MainScreen } from './MainScreen';

export function App() {
  const { state, view, now } = useEngine();
  const health = useHealth();
  const summaries = useDaySummaries(state, view?.mode, now);
  useTheme(state?.settings.theme);

  if (!state || !view) return null;
  const theme = state.settings.theme;

  return (
    <MainScreen
      content={mainContent(view, { settings: state.settings, now, ...summaries })}
      chipLabel={chipLabel(state.settings, now)}
      theme={theme}
      notificationsOff={health?.notifications === 'denied'}
      onStartBreak={() => sendAction({ type: 'openPrompt' })}
      // The movement timer (#7) and the recap (#10) come in their own slices.
      onOpenTimer={() => {}}
      onOpenRecap={() => {}}
      onToggleTheme={() =>
        sendAction({ type: 'updateSettings', settings: { theme: theme === 'light' ? 'dark' : 'light' } })
      }
      onGapAnswer={(moved) => sendAction({ type: 'gapAnswer', moved })}
      // First-run setup (#6) will walk through this; until then, Chrome's notification settings.
      onTurnOnNotifications={() => browser.tabs.create({ url: 'chrome://settings/content/notifications' })}
      devLink={DEV_TOOLS}
    />
  );
}
