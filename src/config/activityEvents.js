import { Eye, CheckCircle, FileText } from 'lucide-react';

/**
 * پیکربندی UI رویدادهای تاریخی (Layer 4).
 * مستقل از notificationEvents — بدون duration.
 */
export const ACTIVITY_CONFIG = {
  DOCUMENT_OPENED: { icon: Eye, title: 'مشاهده سند', category: 'customer' },
  ORDER_APPROVED: { icon: CheckCircle, title: 'تایید سفارش', category: 'workflow' },
  NOTE_ADDED: { icon: FileText, title: 'یادداشت جدید', category: 'internal' },
  DEFAULT: { icon: FileText, title: 'رویداد سیستمی', category: 'system' },
};

export function getActivityConfig(eventType) {
  return ACTIVITY_CONFIG[eventType] || ACTIVITY_CONFIG.DEFAULT;
}
