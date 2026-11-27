import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { MDXContent } from 'mdx/types';
import Layout from '../components/Layout';
import HelpView from '../help/HelpView';
import { APP_TITLE, CONTENTS_SLUG, findHelpPage, helpSlugForPath, helpTitle } from '../help/pages';
import { loadHelpContent, loadedHelpContent } from '../help/content';

/**
 * /help and /help/<page>. Public, and prerendered by the build. Loaded with
 * the main bundle rather than on demand, so a prerendered page isn't swapped
 * for a loading state while its chunk arrives.
 */
const Help = () => {
  const { pathname, hash, key } = useLocation();
  const slug = helpSlugForPath(pathname);
  const page = slug && slug !== CONTENTS_SLUG ? findHelpPage(slug) ?? null : null;
  const [, setLoadedSlug] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const Content: MDXContent | null = (slug && loadedHelpContent(slug)) || null;

  useEffect(() => {
    if (!slug || loadedHelpContent(slug)) return;
    let cancelled = false;
    setFailed(false);
    loadHelpContent(slug)
      .then(() => { if (!cancelled) setLoadedSlug(slug); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    document.title = helpTitle(page);
    return () => { document.title = APP_TITLE; };
  }, [page]);

  // Open at the linked heading once the words are there, or at the top
  useEffect(() => {
    if (!Content) return;
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [Content, hash, key]);

  if (!slug) return <Navigate to="/help" replace />;

  return (
    <Layout>
      {failed ? (
        <div className="state">
          <h2>This help page didn't load</h2>
          <p>Check your connection and try again.</p>
          <div className="form-actions">
            <button type="button" className="btn primary" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      ) : (
        <HelpView page={page} Content={Content} />
      )}
    </Layout>
  );
};

export default Help;
