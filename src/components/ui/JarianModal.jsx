import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import JarianBackdrop from './JarianBackdrop';

/**
 * Global centered Modal shell — shares the same backdrop as drawers.
 */
export default function JarianModal({
  open,
  onClose,
  title,
  size = 'md',
  children,
  footer = null,
  className = '',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === 'sm'
    ? 'jarian-modal--sm'
    : (size === 'lg' ? 'jarian-modal--lg' : (size === 'xl' ? 'jarian-modal--xl' : ''));

  return createPortal(
    <JarianBackdrop open={open} onClose={onClose} variant="modal">
      <div
        className={['jarian-modal', sizeClass, className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'پنجره'}
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
      >
        {(title || onClose) ? (
          <header className="jarian-modal__header">
            {title ? <h2 className="jarian-modal__title font-meem">{title}</h2> : <span />}
            {onClose ? (
              <button
                type="button"
                className="jarian-overlay-close"
                aria-label="بستن"
                onClick={onClose}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            ) : null}
          </header>
        ) : null}
        <div className="jarian-modal__body">{children}</div>
        {footer ? <footer className="jarian-modal__footer">{footer}</footer> : null}
      </div>
    </JarianBackdrop>,
    document.body,
  );
}
