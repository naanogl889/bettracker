import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safety patch for iframe sandboxes where window.fetch is getter-only
try {
  const target = window as any;
  const currentFetch = target.fetch;
  const desc =
    Object.getOwnPropertyDescriptor(target, 'fetch') ||
    (Object.getPrototypeOf(target) &&
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), 'fetch'));
  if (desc && !desc.set && desc.configurable) {
    Object.defineProperty(target, 'fetch', {
      configurable: true,
      enumerable: true,
      get: () => currentFetch,
      set: (val) => {
        target._fetch = val;
      },
    });
  }
} catch {
  // Ignore non-configurable environment properties
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
