import { useEffect, useRef, useState } from 'react';
import { sendAction } from '@/lib/messages';
import { saveSetup } from '@/lib/setup';
import { useTheme } from '@/ui/theme';
import { useEngine } from '@/ui/useEngine';
import { draftFrom, stepValue, withValue, type Draft, type Field } from './sentence';
import { SettingsScreen } from './SettingsScreen';

/** Opened from the setup (step 1 › Edit) it returns there; otherwise to the main screen. */
const fromSetup = new URLSearchParams(location.search).get('from') === 'setup';
const back = () => {
  location.href = fromSetup ? '/setup.html' : '/newtab.html';
};

export function App() {
  const { state } = useEngine();
  // Only the person's edits are kept; until the first one, the saved settings show.
  const [edits, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<Field | null>(null);
  useTheme(state?.settings.theme);
  const draft = edits ?? (state ? draftFrom(state.settings, state.place) : null);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  });

  // ↑ ↓ move the value being edited; Enter or Esc closes the wheel.
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && draftRef.current) {
        e.preventDefault();
        // Build on the previous press, not on the last render: key repeat is faster than React.
        const delta = e.key === 'ArrowUp' ? -1 : 1;
        setDraft((prev) => stepValue(prev ?? draftRef.current!, editing, delta));
      }
      if (e.key === 'Enter' || e.key === 'Escape') {
        // Otherwise Enter also "clicks" the focused word and reopens the wheel it just closed.
        e.preventDefault();
        setEditing(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  if (!state || !draft) return null;
  const theme = state.settings.theme;

  return (
    <SettingsScreen
      draft={draft}
      editing={editing}
      theme={theme}
      onOpen={(f) => setEditing(editing === f ? null : f)}
      onPick={(v) => editing && setDraft(withValue(draft, editing, v))}
      onStep={(delta) => editing && setDraft(stepValue(draft, editing, delta))}
      onDone={() => setEditing(null)}
      onTogglePlace={() => setDraft({ ...draft, place: draft.place === 'home' ? 'office' : 'home' })}
      onSave={async () => {
        const { place, ...times } = draft;
        await sendAction({ type: 'updateSettings', settings: times });
        if (place !== state.place) await sendAction({ type: 'setPlace', place });
        if (fromSetup) await saveSetup({ timer: true });
        back();
      }}
      onBack={back}
      onToggleTheme={() =>
        sendAction({ type: 'updateSettings', settings: { theme: theme === 'light' ? 'dark' : 'light' } })
      }
    />
  );
}
