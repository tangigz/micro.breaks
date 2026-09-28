import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/ui/tokens.css';
import { TestModeBanner } from '@/ui/TestModeBanner';
import { applyStoredTheme } from '@/ui/theme';
import { App } from './App';

applyStoredTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <TestModeBanner />
  </StrictMode>,
);
