import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { turnstileSiteKey } from '../../lib/turnstile';

// The Cloudflare Turnstile widget on the auth forms (see src/lib/turnstile.ts).
// Tokens only work once, so the form calls reset() after every request to
// Supabase, whether it succeeded or not.

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
  'timeout-callback': () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'flexible' | 'compact';
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// One script per page, however many times a form mounts
let scriptPromise: Promise<TurnstileApi> | null = null;

const loadTurnstile = (): Promise<TurnstileApi> => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile loaded without window.turnstile')));
    script.onerror = () => reject(new Error('Turnstile failed to load'));
    document.head.appendChild(script);
  }).catch((error) => {
    // Let a later mount try again rather than keeping the failure
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
};

export interface TurnstileHandle {
  reset(): void;
}

interface TurnstileProps {
  /** Called with a fresh token, or null when the current one is spent or expired. */
  onToken: (token: string | null) => void;
}

const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile({ onToken }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const apiRef = useRef<TurnstileApi | null>(null);
  const onTokenRef = useRef(onToken);
  const [loadFailed, setLoadFailed] = useState(false);

  onTokenRef.current = onToken;

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current(null);
      if (apiRef.current && widgetIdRef.current) apiRef.current.reset(widgetIdRef.current);
    },
  }));

  useEffect(() => {
    let cancelled = false;

    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        apiRef.current = api;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: turnstileSiteKey(window.location.hostname),
          theme: 'light',
          size: 'flexible',
          callback: (token) => onTokenRef.current(token),
          // Turnstile fetches a new token by itself; until then there's none to send
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
          'timeout-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      if (apiRef.current && widgetIdRef.current) apiRef.current.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, []);

  return (
    <div className="turnstile">
      <div ref={containerRef} />
      {loadFailed && (
        <div className="notice error" role="alert">
          The security check didn't load. Check your connection, or allow challenges.cloudflare.com if you block scripts, then reload the page.
        </div>
      )}
    </div>
  );
});

export default Turnstile;
