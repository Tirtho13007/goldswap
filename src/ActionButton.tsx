import { useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type Ref } from 'react';

export function Spinner() {
  return <svg className="action-spinner" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity=".25"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>;
}

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  pending?: boolean;
  ref?: Ref<HTMLButtonElement>;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => unknown;
};

/** Keeps async actions readable, announced and protected against duplicate clicks. */
export function ActionButton({ pending = false, disabled, onClick, children, ...props }: Props) {
  const [running, setRunning] = useState(false);
  const inFlight = useRef(false);
  const busy = pending || running;
  return <button {...props} disabled={disabled || busy} aria-busy={busy || undefined} onClick={onClick ? event => {
    if (busy || inFlight.current) return;
    const result = onClick(event);
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      inFlight.current = true;
      setRunning(true);
      void Promise.resolve(result).finally(() => { inFlight.current = false; setRunning(false); }).catch(() => {});
    }
  } : undefined}>{busy && <Spinner />}{children}</button>;
}
