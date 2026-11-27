import { Children, isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { MDXComponents, MDXContent } from 'mdx/types';
import { HELP_PAGES, HELP_SECTIONS, headingId, type HelpPageInfo } from './pages';
import '../styles/help.css';

/** The words of a heading, for its id. */
const textOf = (node: ReactNode): string =>
  Children.toArray(node).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (isValidElement<{ children?: ReactNode }>(child)) return textOf(child.props.children);
    return '';
  }).join('');

const heading = (Tag: 'h2' | 'h3') => ({ id, children, ...rest }: ComponentPropsWithoutRef<'h2'>) => (
  <Tag id={id ?? headingId(textOf(children))} {...rest}>{children}</Tag>
);

const components: MDXComponents = {
  h2: heading('h2'),
  h3: heading('h3'),
  // Links inside the app stay in the app; anything else opens in a new tab
  a: ({ href = '', children, ...rest }) => href.startsWith('/')
    ? <Link to={href} {...rest}>{children}</Link>
    : <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>,
  table: props => <div className="help-table"><table {...props} /></div>,
  Note: ({ children }: { children: ReactNode }) => <div className="help-note">{children}</div>,
};

const PageList = ({ current }: { current?: string }) => (
  <>
    <Link to="/help" className="help-nav-all">All help</Link>
    {(['Getting started', ...HELP_SECTIONS.map(s => s.section)] as const).map(section => (
      <div key={section} className="help-nav-group">
        <span className="help-nav-label">{section}</span>
        {HELP_PAGES.filter(p => p.section === section).map(p => (
          <Link key={p.slug} to={`/help/${p.slug}`} aria-current={p.slug === current ? 'page' : undefined}>
            {p.short ?? p.title}
          </Link>
        ))}
      </div>
    ))}
  </>
);

type Props = {
  // The page to show, or null for the contents page
  page: HelpPageInfo | null;
  // The page's words, or null while they load
  Content: MDXContent | null;
};

/**
 * A help page, or the contents. Shared by the Help route and the prerender,
 * so it reads no auth or data.
 */
const HelpView = ({ page, Content }: Props) => {
  const body = Content ? <Content components={components} /> : <div className="state" role="status"><p>Loading...</p></div>;

  if (!page) {
    const start = HELP_PAGES[0];
    return (
      <div className="help help-contents">
        <div className="help-intro">
          <h1>Help</h1>
          <p>How to enter a match, tag it and read what it tells you. If you're new, start with the first page and come back to the rest when a question comes up.</p>
        </div>

        <Link to={`/help/${start.slug}`} className="help-start">
          <span className="help-start-text">
            <span className="help-start-eyebrow">{start.section}</span>
            <span className="help-start-title">{start.title}</span>
            <span>{start.description}</span>
          </span>
          <span className="help-start-button">Start here</span>
        </Link>

        <div className="help-sections">
          {HELP_SECTIONS.map(({ section, note }) => (
            <section key={section} className="card help-section" aria-labelledby={`help-${headingId(section)}`}>
              <div>
                <h2 id={`help-${headingId(section)}`}>{section}</h2>
                <p>{note}</p>
              </div>
              <ul>
                {HELP_PAGES.filter(p => p.section === section).map(p => (
                  <li key={p.slug}><Link to={`/help/${p.slug}`}>{p.title}</Link></li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="help-questions" aria-labelledby="common-questions">
          <h2 id="common-questions">Common questions</h2>
          <div className="help-prose">{body}</div>
        </section>
      </div>
    );
  }

  const index = HELP_PAGES.indexOf(page);
  const previous = HELP_PAGES[index - 1];
  const next = HELP_PAGES[index + 1];

  return (
    <div className="help help-page">
      <details className="card help-nav-phone">
        <summary>Help pages<span>{page.section}</span></summary>
        <nav aria-label="Help pages"><PageList current={page.slug} /></nav>
      </details>
      <nav className="help-nav" aria-label="Help pages"><PageList current={page.slug} /></nav>

      <article className="help-article">
        <header className="help-article-head">
          <span className="help-eyebrow">{page.section}</span>
          <h1>{page.title}</h1>
          <p className="help-lead">{page.description}</p>
        </header>
        <div className="help-prose">{body}</div>
        <nav className="help-pager" aria-label="Previous and next">
          {previous ? <Link to={`/help/${previous.slug}`} rel="prev">Previous: {previous.short ?? previous.title}</Link> : <span />}
          {next && <Link to={`/help/${next.slug}`} rel="next">Next: {next.short ?? next.title}</Link>}
        </nav>
      </article>
    </div>
  );
};

export default HelpView;
