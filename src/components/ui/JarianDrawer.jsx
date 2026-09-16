import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import JarianBackdrop from './JarianBackdrop';

/**
 * Global left-only Drawer shell.
 * Side prop is intentionally ignored — drawers always open from the left.
 */
export default function JarianDrawer({
  open,
  onClose,
  title,
  subtitle = '',
  size = 'md',
  children,
  footer = null,
  className = '',
  /** @deprecated Drawers are left-only; kept for API compatibility and ignored. */
  side: _side = 'left',
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => setEntered(true));
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === 'sm'
    ? 'jarian-drawer--sm'
    : (size === 'lg' ? 'jarian-drawer--lg' : '');

  return createPortal(
    <>
      <JarianBackdrop
        open={open}
        onClose={onClose}
        variant="drawer"
        transition
        className={entered ? 'is-open' : ''}
        asButton
      />
      <aside
        className={[
          'jarian-drawer',
          'jarian-drawer--transition',
          sizeClass,
          entered ? 'is-open' : '',
          className,
        ].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'پنل'}
        data-drawer-side="left"
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
      >
        {(title || onClose) ? (
          <header className="jarian-drawer__header">
            <div>
              {title ? <h2 className="jarian-drawer__title font-meem">{title}</h2> : null}
              {subtitle ? <p className="jarian-drawer__subtitle font-meem">{subtitle}</p> : null}
            </div>
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
        <div className="jarian-drawer__body">{children}</div>
        {footer ? <footer className="jarian-drawer__footer">{footer}</footer> : null}
      </aside>
    </>,
    document.body,
  );
}
