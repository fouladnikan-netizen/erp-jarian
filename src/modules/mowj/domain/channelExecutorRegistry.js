/**
 * ChannelExecutorRegistry — ChannelType → ChannelExecutor (mock providers only).
 */

import { EXECUTION_CHANNELS, getExecutionChannel } from './channel.catalog';
import { createMockChannelExecutor } from './channelExecutor.contract';

const DEFAULT_CHANNEL_IDS = Object.freeze([
  'SMS',
  'EMAIL',
  'WHATSAPP',
  'TELEGRAM',
  'BALE',
  'RUBIKA',
  'GOOGLE_ADS',
  'TELEGRAM_ADS',
  'BANNER',
  'BANNER_ADS',
  'EXHIBITION',
  'POST',
  'DELIVERY',
  'COURIER',
  'GIFT_DELIVERY',
]);

/**
 * @param {Record<string, import('./channelExecutor.contract').ChannelExecutor>} [overrides]
 * @returns {{
 *   get: (channelType: string) => import('./channelExecutor.contract').ChannelExecutor|null,
 *   has: (channelType: string) => boolean,
 *   list: () => string[],
 *   resolve: (channelType: string) => { ok: boolean, executor?: object, error?: string },
 * }}
 */
export function createChannelExecutorRegistry(overrides = {}) {
  /** @type {Record<string, import('./channelExecutor.contract').ChannelExecutor>} */
  const map = {};

  DEFAULT_CHANNEL_IDS.forEach((id) => {
    map[id] = createMockChannelExecutor(id);
  });

  // Named aliases matching product wording
  map.SmsChannelExecutor = map.SMS;
  map.EmailChannelExecutor = map.EMAIL;
  map.WhatsappChannelExecutor = map.WHATSAPP;

  Object.entries(overrides || {}).forEach(([key, executor]) => {
    if (executor && typeof executor.execute === 'function') {
      map[String(key).toUpperCase()] = {
        channelType: executor.channelType || String(key).toUpperCase(),
        execute: executor.execute.bind(executor),
      };
    }
  });

  function get(channelType) {
    const raw = String(channelType || '');
    if (!raw) return null;
    return map[raw.toUpperCase()] || map[raw] || null;
  }

  function has(channelType) {
    return Boolean(get(channelType));
  }

  function list() {
    return Object.keys(map).filter((key) => !key.includes('ChannelExecutor'));
  }

  /**
   * Resolve executor for a channel — rejects unknown / unsupported.
   * @param {string} channelType
   */
  function resolve(channelType) {
    const key = String(channelType || '').toUpperCase();
    if (!key) {
      return { ok: false, error: 'کانال مشخص نشده است.' };
    }
    const catalog = getExecutionChannel(key);
    if (!catalog && !DEFAULT_CHANNEL_IDS.includes(key)) {
      return { ok: false, error: `کانال پشتیبانی‌نشده: ${key}` };
    }
    const executor = get(key);
    if (!executor) {
      return { ok: false, error: `Executor برای کانال ${key} ثبت نشده است.` };
    }
    return { ok: true, executor };
  }

  return Object.freeze({ get, has, list, resolve, __map: map });
}

export function createDefaultChannelExecutorRegistry() {
  return createChannelExecutorRegistry();
}

/** Catalog snapshot for UI / docs */
export function listRegisteredChannelCatalog() {
  return EXECUTION_CHANNELS.map((ch) => ({
    id: ch.id,
    category: ch.category,
    label: ch.label,
    integrationReady: false,
  }));
}
