import { useEffect, useState } from 'react';
import { getEventConfig } from '../../config/notificationEvents';
import './GlobalGlassToast.css';

/**
 * Toast شیشه‌ای عمومی — بدون وابستگی به دامنه سند/پیش‌فاکتور.
 */
export default function GlobalGlassToast({
  title,
  message,
  icon: IconComponent,
  onClose,
  exiting = false,
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const Icon = IconComponent || getEventConfig('DEFAULT').icon;

  return (
    <div
      className={`glass-toast${entered && !exiting ? ' is-open' : ''}${exiting ? ' is-exiting' : ''}`}
      role="status"
      aria-live="polite"
      dir="rtl"
    >
      <div className="glass-toast__card">
        <span className="glass-toast__icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.75} />
        </span>

        <div className="glass-toast__body">
          <p className="glass-toast__title font-meem">{title}</p>
          <p className="glass-toast__message font-meem">{message}</p>
        </div>

        <button
          type="button"
          className="glass-toast__action font-meem"
          onClick={onClose}
        >
          مشاهده
        </button>
      </div>
    </div>
  );
}
