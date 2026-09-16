/**
 * Execution channel catalog — data-driven, not hardcoded in UI components.
 * Provider integrations are intentionally out of scope.
 */

import { CHANNEL_CATEGORY } from './campaign.constants';

/**
 * @typedef {object} ExecutionChannel
 * @property {string} id
 * @property {string} category  CHANNEL_CATEGORY
 * @property {string} label
 * @property {string} [hint]
 * @property {boolean} [integrationReady] always false for now
 */

/** @type {ExecutionChannel[]} */
export const EXECUTION_CHANNELS = Object.freeze([
  // Communication
  { id: 'SMS', category: CHANNEL_CATEGORY.COMMUNICATION, label: 'پیامک', hint: 'SMS', integrationReady: false },
  { id: 'WHATSAPP', category: CHANNEL_CATEGORY.COMMUNICATION, label: 'واتساپ', hint: 'WhatsApp', integrationReady: false },
  { id: 'TELEGRAM', category: CHANNEL_CATEGORY.COMMUNICATION, label: 'تلگرام', hint: 'Telegram', integrationReady: false },
  { id: 'BALE', category: CHANNEL_CATEGORY.COMMUNICATION, label: 'بله', hint: 'Bale', integrationReady: false },
  { id: 'RUBIKA', category: CHANNEL_CATEGORY.COMMUNICATION, label: 'روبیکا', hint: 'Rubika', integrationReady: false },
  { id: 'EMAIL', category: CHANNEL_CATEGORY.COMMUNICATION, label: 'ایمیل', hint: 'Email', integrationReady: false },
  // Digital ads (record only — mock adapters)
  { id: 'GOOGLE_ADS', category: CHANNEL_CATEGORY.DIGITAL, label: 'گوگل ادز', hint: 'Google Ads', integrationReady: false },
  { id: 'TELEGRAM_ADS', category: CHANNEL_CATEGORY.DIGITAL, label: 'تبلیغات تلگرام', hint: 'Telegram Ads', integrationReady: false },
  { id: 'BANNER', category: CHANNEL_CATEGORY.DIGITAL, label: 'بنر تبلیغاتی', hint: 'Banner', integrationReady: false },
  { id: 'BANNER_ADS', category: CHANNEL_CATEGORY.DIGITAL, label: 'بنر تبلیغاتی', hint: 'Banner Ads (legacy id)', integrationReady: false },
  // Physical
  { id: 'EXHIBITION', category: CHANNEL_CATEGORY.PHYSICAL, label: 'نمایشگاه', hint: 'Exhibition', integrationReady: false },
  { id: 'POST', category: CHANNEL_CATEGORY.PHYSICAL, label: 'پست', hint: 'Post', integrationReady: false },
  { id: 'DELIVERY', category: CHANNEL_CATEGORY.PHYSICAL, label: 'تحویل / ارسال', hint: 'Delivery', integrationReady: false },
  { id: 'COURIER', category: CHANNEL_CATEGORY.PHYSICAL, label: 'پیک', hint: 'Courier', integrationReady: false },
  { id: 'GIFT_DELIVERY', category: CHANNEL_CATEGORY.PHYSICAL, label: 'ارسال هدیه', hint: 'Gift Delivery', integrationReady: false },
]);

const BY_ID = Object.freeze(
  Object.fromEntries(EXECUTION_CHANNELS.map((ch) => [ch.id, ch])),
);

/** @param {string} [id] */
export function getExecutionChannel(id) {
  if (!id) return null;
  return BY_ID[String(id)] || null;
}

/** @param {string} [id] */
export function getExecutionChannelLabel(id) {
  return getExecutionChannel(id)?.label || '—';
}

/**
 * @param {string} [category]
 * @returns {ExecutionChannel[]}
 */
export function listExecutionChannels(category) {
  if (!category) return [...EXECUTION_CHANNELS];
  return EXECUTION_CHANNELS.filter((ch) => ch.category === category);
}
