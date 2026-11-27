import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { helpSlugForPath } from './help/pages'
import { loadHelpContent } from './help/content'

// Welcome message for developers
console.log(`
🏓 Welcome to TT Analysis!

Found a bug or have a feature request?
Visit: https://github.com/duncanwraight/TTAnalysis/issues

Built with ❤️ for table tennis players
`);


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

// A prerendered help page stays on screen until its words have loaded, so
// React replaces it with the same page rather than a loading state.
const helpSlug = helpSlugForPath(window.location.pathname);
const ready = helpSlug ? loadHelpContent(helpSlug).catch(() => undefined) : Promise.resolve();

ready.then(() => {
  // The prerendered pages hide parts of themselves from browsers holding a
  // session (scripts/prerender.mjs). From here React decides what to show.
  document.documentElement.classList.remove('has-session');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
