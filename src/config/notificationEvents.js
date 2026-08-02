import { Eye, Wallet, CheckCircle } from 'lucide-react';

/**
 * نگاشت نوع رویداد → پیکربندی UI اعلان.
 * موتور نوتیفیکیشن فقط از این فایل برای آیکون و مدت‌زمان استفاده می‌کند.
 */
export const EVENT_CONFIG = {
  DOCUMENT_OPENED: { icon: Eye, duration: 8000 },
  PAYMENT_RECEIVED: { icon: Wallet, duration: 8000 },
  ORDER_APPROVED: { icon: CheckCircle, duration: 8000 },
  DEFAULT: { icon: CheckCircle, duration: 5000 },
};

export function getEventConfig(type) {
  return EVENT_CONFIG[type] || EVENT_CONFIG.DEFAULT;
}
