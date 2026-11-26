import { Component, type ReactNode } from 'react';
import { useLocation } from 'react-router';

type Props = { children: ReactNode };
type BoundaryProps = Props & { pathname: string };
type State = { failed: boolean };

// Catches a page that throws while rendering or fails to load its code,
// so the visitor sees a way out instead of a blank screen
class Boundary extends Component<BoundaryProps, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.failed && prev.pathname !== this.props.pathname) this.setState({ failed: false });
  }

  componentDidCatch(error: unknown) {
    console.error('Page failed:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="state" role="alert">
        <p>This page didn't load. Check your connection and try again.</p>
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>Reload the page</button>
        {' '}
        <a className="btn" href="/matches">Your matches</a>
      </div>
    );
  }
}

// Leaving a failed page clears the error. A key would do the same but would
// also remount every page on each navigation, such as the analysis page's tabs.
const PageErrorBoundary = ({ children }: Props) => {
  const { pathname } = useLocation();
  return <Boundary pathname={pathname}>{children}</Boundary>;
};

export default PageErrorBoundary;
