import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// Inject build-time meta tag for cache busting
const meta = document.createElement('meta');
meta.name = 'build-time';
meta.content = __BUILD_TIME__;
document.head.appendChild(meta);

console.log(`[Opinionated] Build: ${__BUILD_TIME__}`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
