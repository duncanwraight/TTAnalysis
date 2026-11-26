/** An inline error with a close button, used in place of alert(). */
const ErrorNotice = ({ message, onDismiss }: { message: string; onDismiss: () => void }) => (
  <div className="notice error dismissible" role="alert">
    <span>{message}</span>
    <button type="button" className="notice-close" onClick={onDismiss}>Dismiss</button>
  </div>
);

export default ErrorNotice;
