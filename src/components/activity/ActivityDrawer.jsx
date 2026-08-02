import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, History } from 'lucide-react';
import './activity.css';

/**
 * درایر عمومی سوابق فعالیت — از لبهٔ مخالف سایدبار (چپ فیزیکی) می‌آید.
 */
export default function ActivityDrawer({
  open,
  onClose,
  title = 'سوابق فعالیت‌ها',
  subtitle = '',
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="activity-drawer-root" dir="rtl">
      <button
        type="button"
        className="activity-drawer__backdrop"
        aria-label="بستن"
        onClick={onClose}
      />
      <aside
        className="activity-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="activity-drawer__head">
          <div className="activity-drawer__titles">
            <span className="activity-drawer__badge" aria-hidden="true">
              <History size={16} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="activity-drawer__title font-meem">{title}</h2>
              {subtitle ? (
                <p className="activity-drawer__sub font-meem">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="activity-drawer__close"
            aria-label="بستن"
            onClick={onClose}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <div className="activity-drawer__body">
          {children}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
