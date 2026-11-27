import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { helpPath } from '../help/pages';

type Props = {
  // The help page's slug (src/help/pages.ts)
  page: string;
  // A heading on that page, as written, such as "Who attacked first"
  heading?: string;
  children?: ReactNode;
  // Opens in a new tab, so the page it's on (the tracker) stays as it is
  newTab?: boolean;
  // Greyed out and not clickable, as the tracker's tools are mid-point
  disabled?: boolean;
};

const QuestionIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
  </svg>
);

/**
 * A small "How this works" link to a help page, or to a heading on it. Left
 * out of PDF exports. The help explains so the page itself doesn't have to.
 */
const HelpLink = ({ page, heading, children = 'How this works', newTab = false, disabled = false }: Props) => {
  const to = helpPath(page, heading);
  const content = <><QuestionIcon />{children}</>;
  if (newTab) {
    return (
      <a
        href={to}
        className="help-link"
        target="_blank"
        rel="noopener"
        data-html2canvas-ignore="true"
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
      >
        {content}
      </a>
    );
  }
  return <Link to={to} className="help-link" data-html2canvas-ignore="true">{content}</Link>;
};

export default HelpLink;
