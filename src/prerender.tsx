// Built with `vite build --ssr` and run by scripts/prerender.mjs to put the
// brochure's and the help pages' HTML into the built files, for search
// engines and first paint.
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import type { MDXContent } from 'mdx/types';
import HomeBrochure from './pages/HomeBrochure';
import AppFrame from './components/AppFrame';
import HelpView from './help/HelpView';
import { CONTENTS_SLUG, findHelpPage, helpSlugForPath, helpTitle, HELP_ROUTES } from './help/pages';

const helpContent = import.meta.glob<{ default: MDXContent }>('./help/content/*.mdx', { eager: true });

export const render = (): string =>
  renderToString(
    <StaticRouter location="/">
      <HomeBrochure />
    </StaticRouter>,
  );

export const helpRoutes = HELP_ROUTES;

const CONTENTS_DESCRIPTION = 'Help for TT Analysis: entering a match from video, marking unforced errors and attacks, and reading the analysis.';

/** A help route's HTML, drawn signed out, with the title and description for its head. */
export const renderHelp = (route: string): { html: string; title: string; description: string } => {
  const slug = helpSlugForPath(route);
  if (!slug) throw new Error(`${route} isn't a help page`);
  const page = slug === CONTENTS_SLUG ? null : findHelpPage(slug)!;
  const content = helpContent[`./help/content/${slug}.mdx`];
  if (!content) throw new Error(`No content file for ${route}`);
  const html = renderToString(
    <StaticRouter location={route}>
      <AppFrame signedIn={false}>
        <HelpView page={page} Content={content.default} />
      </AppFrame>
    </StaticRouter>,
  );
  return { html, title: helpTitle(page), description: page ? page.description : CONTENTS_DESCRIPTION };
};
