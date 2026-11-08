import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { applyMotionPreference } from './lib/motionPreference.ts';

applyMotionPreference();
window
  .matchMedia('(prefers-reduced-motion: reduce)')
  .addEventListener('change', applyMotionPreference);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
