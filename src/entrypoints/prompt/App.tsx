import { useEffect, useRef, useState } from 'react';
import { INTENTS } from '@/content/breaks';
import type { Intent } from '@/engine';
import { sendAction } from '@/lib/messages';
import { useTheme } from '@/ui/theme';
import { useEngine } from '@/ui/useEngine';
import { PromptScreen } from './PromptScreen';
import { TemporaryBreak } from './Temporary';

/** The prompt tab: the prompt, then the break timer and "Recharged." in the same tab. */
export function App() {
  const { state, view, now } = useEngine();
  useTheme(state?.settings.theme);
  // Energy is preselected (spec › Choices on the prompt).
  const [intent, setIntentState] = useState<Intent>('energy');
  // Keys can arrive faster than a re-render ("2" then Enter): read the choice from a ref.
  const intentRef = useRef<Intent>('energy');
  const setIntent = (i: Intent) => {
    intentRef.current = i;
    setIntentState(i);
  };
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 1 2 3 to choose, Enter to start, Esc to be reminded later (spec › Keyboard-first prompt).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (!st || st.breakTimer || st.pendingRecharge) return;
      const k = INTENTS.findIndex((i) => i.key === e.key);
      if (k >= 0) setIntent(INTENTS[k]!.intent);
      if (e.key === 'Enter') {
        // Don't also "click" whatever button has focus.
        e.preventDefault();
        void sendAction({ type: 'chooseBreak', intent: intentRef.current });
      }
      if (e.key === 'Escape') void sendAction({ type: 'remindLater' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!state || !view) return null;
  if (state.breakTimer || state.pendingRecharge) return <TemporaryBreak state={state} now={now} />;
  const theme = state.settings.theme;

  return (
    <PromptScreen
      seatedMs={view.seatedMs}
      due={view.mode === 'overdue'}
      place={state.place}
      intent={intent}
      theme={theme}
      onPick={setIntent}
      onStart={() => sendAction({ type: 'chooseBreak', intent: intentRef.current })}
      onLater={() => sendAction({ type: 'remindLater' })}
      onSkip={() => sendAction({ type: 'skip' })}
      onToggleTheme={() =>
        sendAction({ type: 'updateSettings', settings: { theme: theme === 'light' ? 'dark' : 'light' } })
      }
    />
  );
}
