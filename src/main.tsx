import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Welcome message for developers
console.log(`
🏓 Welcome to TT Analysis!

Found a bug or have a feature request?
Visit: https://github.com/duncanwraight/TTAnalysis/issues

Built with ❤️ for table tennis players
`);

// index.html hides the prerendered homepage from browsers holding a session
// (scripts/prerender.mjs). From here React decides what to show.
document.documentElement.classList.remove('has-session');

// Pages load on demand (App.tsx), so a tab opened before a deploy asks for
// chunks the new deploy no longer has. Reload once to pick up the new build.
// The timestamp stops a loop if a chunk is missing for another reason.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'chunk-reload-at';
  try {
    if (Date.now() - Number(sessionStorage.getItem(key) ?? 0) < 10_000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
