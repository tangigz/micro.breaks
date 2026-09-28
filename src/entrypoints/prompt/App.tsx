import { useEffect, useRef, useState } from 'react';
import { activityFor, INTENTS } from '@/content/breaks';
import { MIN, type Intent } from '@/engine';
import { sendAction } from '@/lib/messages';
import { useTheme } from '@/ui/theme';
import { useEngine } from '@/ui/useEngine';
import { PromptScreen } from './PromptScreen';
import { RechargedScreen } from '@/ui/RechargedScreen';
import { useActivityWatch } from '@/ui/useActivityWatch';
import { BreakTimerScreen } from './BreakTimerScreen';

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

  useActivityWatch(state?.breakTimer ?? null);

  // "Recharged." seen elsewhere (the main screen): this tab has nothing left to say.
  const showedRecharge = useRef(false);
  useEffect(() => {
    if (state?.pendingRecharge) showedRecharge.current = true;
    else if (showedRecharge.current) window.close();
  }, [state?.pendingRecharge]);

  if (!state || !view) return null;
  const theme = state.settings.theme;
  const toggleTheme = () =>
    sendAction({ type: 'updateSettings', settings: { theme: theme === 'light' ? 'dark' : 'light' } });
  // Back to the main screen, which shows the overdue state (spec › I'm back, Cancel break).
  const toMain = () => {
    location.href = '/newtab.html';
  };

  if (state.pendingRecharge) {
    return (
      <RechargedScreen
        recharge={state.pendingRecharge}
        goal={view.goal}
        theme={theme}
        onBack={async () => {
          await sendAction({ type: 'rechargeSeen' });
          window.close();
        }}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const bt = state.breakTimer;
  if (bt) {
    const info = INTENTS.find((i) => i.intent === bt.intent)!;
    return (
      <BreakTimerScreen
        intent={info}
        activity={activityFor(bt.intent, state.place)}
        elapsedMs={bt.ended ? bt.lengthMin * MIN : bt.lengthMin * MIN - (bt.endsAt - now)}
        lengthMin={bt.lengthMin}
        early={bt.early}
        theme={theme}
        onLength={(m) => sendAction({ type: 'setBreakLength', lengthMin: m })}
        onBack={async () => {
          await sendAction({ type: 'imBack' });
          toMain();
        }}
        onCancel={async () => {
          await sendAction({ type: 'cancelBreak' });
          toMain();
        }}
        onToggleTheme={toggleTheme}
      />
    );
  }

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
      onToggleTheme={toggleTheme}
    />
  );
}
