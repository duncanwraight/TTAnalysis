import { useCallback, useState } from 'react';
import ConfirmDialog, { type ConfirmOptions } from './ConfirmDialog';

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

/**
 * An in-page replacement for window.confirm. Call `confirm(...)` and await
 * true or false, and render `dialog` somewhere in the page.
 */
export const useConfirm = () => {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>(resolve => setPending({ ...options, resolve })),
    []
  );

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const dialog = pending ? <ConfirmDialog {...pending} onClose={close} /> : null;
  return { confirm, dialog };
};
