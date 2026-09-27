import { Wordmark } from '@/ui/Wordmark';

// Placeholder until the "New tab + startup tab" slice.
export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-10 py-6">
        <Wordmark />
      </header>
      <main className="flex flex-1 items-center justify-center">
        <p className="text-section text-ink-2 font-semibold">Scaffold ready.</p>
      </main>
    </div>
  );
}
