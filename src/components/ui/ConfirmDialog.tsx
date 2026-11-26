import { useEffect, useRef } from 'react';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  // Red confirm button, for deletes
  danger?: boolean;
};

/** The dialog behind useConfirm. */
const ConfirmDialog = ({ title, message, confirmLabel = 'OK', danger, onClose }: ConfirmOptions & { onClose: (ok: boolean) => void }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus Cancel, so Enter or Space can't delete anything by accident
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="dialog-backdrop confirm-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(false); }}>
      <div className="card dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby={message ? 'confirm-message' : undefined}>
        <h2 id="confirm-title">{title}</h2>
        {message && <p id="confirm-message">{message}</p>}
        <div className="form-actions end">
          <button type="button" className="btn" ref={cancelRef} onClick={() => onClose(false)}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'danger' : 'primary'}`} onClick={() => onClose(true)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
