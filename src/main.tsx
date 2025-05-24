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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
