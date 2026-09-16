import { getEventConfig } from '../../config/notificationEvents';
import GlobalGlassToast from './GlobalGlassToast';
import './GlobalGlassToast.css';

/**
 * ظرف صف اعلان‌ها — toastها را عمودی روی هم می‌چیند.
 * Props از Provider می‌آید تا وابستگی دایره‌ای با Context نداشته باشیم.
 */
export default function NotificationContainer({ queue = [], onDismiss }) {
  if (!queue.length) return null;

  return (
    <div className="glass-toast-stack" aria-label="اعلان‌های سیستم">
      {queue.map((item) => {
        const config = getEventConfig(item.type);
        return (
          <GlobalGlassToast
            key={item.id}
            title={item.title}
            message={item.message}
            icon={config.icon}
            exiting={item.exiting}
            onClose={() => onDismiss?.(item.id)}
          />
        );
      })}
    </div>
  );
}
