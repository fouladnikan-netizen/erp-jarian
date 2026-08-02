/**
 * Config-driven registry of external integrations.
 * Icons are lucide name keys resolved in UI — keep this file free of React nodes.
 *
 * Future backend: GET /api/v1/integrations + encrypted credential vault.
 * Do not persist secrets here.
 */

export const INTEGRATION_CATEGORIES = {
  communication: { id: 'communication', label: 'ارتباطات' },
  ai: { id: 'ai', label: 'هوش مصنوعی' },
  verification: { id: 'verification', label: 'استعلام و اعتبارسنجی' },
};

/**
 * Mock health snapshot until monitoring API exists.
 * Secrets are never stored — only connection flags for UI.
 */
export const MOCK_INTEGRATION_HEALTH = {
  faraz_sms: { connected: true, lastCheckLabel: 'امروز ۱۰:۳۲' },
  whatsapp: { connected: true, lastCheckLabel: 'دیروز ۱۸:۰۵' },
  telegram: { connected: true, lastCheckLabel: 'امروز ۰۹:۱۰' },
  bale: { connected: false, lastCheckLabel: null },
  rubika: { connected: false, lastCheckLabel: null },
  deepseek_ai: { connected: true, lastCheckLabel: 'امروز ۰۸:۴۴' },
  linka: { connected: false, lastCheckLabel: null },
};

export const INTEGRATIONS_REGISTRY = [
  {
    id: 'faraz_sms',
    name: 'فراز SMS',
    category: 'communication',
    icon: 'MessageSquare',
    description: 'ارسال پیامک اطلاع‌رسانی و اعلان‌های عملیاتی',
    fields: [
      { key: 'apiKey', type: 'secret', label: 'کلید API' },
      { key: 'sender', type: 'text', label: 'شماره ارسال‌کننده' },
    ],
    supportsOAuth: false,
    supportsWebhooks: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    category: 'communication',
    icon: 'MessageCircle',
    description: 'پیام‌رسانی واتساپ سازمانی',
    fields: [
      { key: 'phoneNumberId', type: 'text', label: 'شناسه شماره' },
      { key: 'accessToken', type: 'secret', label: 'توکن دسترسی' },
    ],
    supportsOAuth: true,
    supportsWebhooks: true,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    category: 'communication',
    icon: 'Send',
    description: 'ربات تلگرام برای اعلان و تعامل',
    fields: [
      { key: 'botToken', type: 'secret', label: 'توکن ربات' },
      { key: 'chatId', type: 'text', label: 'شناسه چت پیش‌فرض' },
    ],
    supportsOAuth: false,
    supportsWebhooks: true,
  },
  {
    id: 'bale',
    name: 'بله',
    category: 'communication',
    icon: 'MessagesSquare',
    description: 'پیام‌رسان بله برای اطلاع‌رسانی داخلی',
    fields: [
      { key: 'botToken', type: 'secret', label: 'توکن ربات' },
      { key: 'channelId', type: 'text', label: 'شناسه کانال' },
    ],
    supportsOAuth: false,
    supportsWebhooks: true,
  },
  {
    id: 'rubika',
    name: 'روبیکا',
    category: 'communication',
    icon: 'Smartphone',
    description: 'اتصال روبیکا برای کمپین‌های ارتباطی',
    fields: [
      { key: 'apiKey', type: 'secret', label: 'کلید API' },
      { key: 'appId', type: 'text', label: 'شناسه اپلیکیشن' },
    ],
    supportsOAuth: false,
    supportsWebhooks: false,
  },
  {
    id: 'deepseek_ai',
    name: 'DeepSeek AI',
    category: 'ai',
    icon: 'Sparkles',
    description: 'سرویس هوش مصنوعی برای پیشنهاد و تحلیل متنی',
    fields: [
      { key: 'apiKey', type: 'secret', label: 'کلید API' },
      { key: 'model', type: 'text', label: 'نام مدل' },
    ],
    supportsOAuth: false,
    supportsWebhooks: false,
  },
  {
    id: 'linka',
    name: 'لینکا',
    category: 'verification',
    icon: 'BadgeCheck',
    description: 'استعلام مشخصات رسمی شرکت با شناسه ملی',
    fields: [
      { key: 'apiKey', type: 'secret', label: 'کلید API' },
      { key: 'endpoint', type: 'text', label: 'آدرس Endpoint' },
    ],
    supportsOAuth: false,
    supportsWebhooks: false,
    relatedConfigKey: 'linka',
  },
];

export function getIntegrationById(id) {
  return INTEGRATIONS_REGISTRY.find((item) => item.id === id) || null;
}

export function getCategoryLabel(categoryId) {
  return INTEGRATION_CATEGORIES[categoryId]?.label || categoryId;
}

export function buildIntegrationsHealthSummary(healthMap = MOCK_INTEGRATION_HEALTH) {
  const entries = Object.values(healthMap);
  const active = entries.filter((item) => item.connected).length;
  const failed = entries.filter((item) => item.connected === false && item.lastCheckLabel).length;
  const lastSuccess = entries
    .filter((item) => item.connected && item.lastCheckLabel)
    .map((item) => item.lastCheckLabel)[0] || '—';

  return {
    activeCount: active,
    failedCount: failed,
    lastSuccessfulCheck: lastSuccess,
  };
}
