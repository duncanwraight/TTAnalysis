// Built with `vite build --ssr` and run by scripts/prerender.mjs to put the
// brochure's HTML into index.html for search engines and first paint.
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import HomeBrochure from './pages/HomeBrochure';

export const render = (): string =>
  renderToString(
    <StaticRouter location="/">
      <HomeBrochure />
    </StaticRouter>,
  );
