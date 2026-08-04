import {
  History,
  ShoppingCart,
  Target,
  Activity,
  Files,
  Wallet,
  Package,
  Search,
} from 'lucide-react';
import { ENTITY_TYPES } from './config';

/** Shared tabs for every company profile (customer + supplier). */
const SHARED_TAIL_TABS = [
  { id: 'interactions', label: 'تعاملات', Icon: Activity },
  { id: 'documents', label: 'اسناد و مکاتبات', Icon: Files },
  { id: 'financial', label: 'صورت‌حساب مالی', Icon: Wallet },
];

/** Customer operational tabs (Nabz sales / Ofogh). */
export const CUSTOMER_PROFILE_TABS = [
  { id: 'timeline', label: 'تعاملات و سوابق', Icon: History },
  { id: 'orders', label: 'سفارشات', Icon: ShoppingCart },
  { id: 'opportunities', label: 'فرصت‌ها', Icon: Target },
  ...SHARED_TAIL_TABS,
];

/** Supplier operational tabs (purchase + inquiry lenses). */
export const SUPPLIER_PROFILE_TABS = [
  { id: 'timeline', label: 'تعاملات و سوابق', Icon: History },
  { id: 'purchases', label: 'سفارشات خرید', Icon: Package },
  { id: 'inquiries', label: 'استعلام‌ها', Icon: Search },
  ...SHARED_TAIL_TABS,
];

/**
 * Modular tab controller — same profile shell, entity-specific operational tabs.
 * @param {string} entityType
 */
export function getCompanyProfileTabs(entityType) {
  return entityType === ENTITY_TYPES.SUPPLIER
    ? SUPPLIER_PROFILE_TABS
    : CUSTOMER_PROFILE_TABS;
}

const LEGACY_TAB_MAP = {
  base: 'timeline',
  specs: 'timeline',
  interactions: 'interactions',
  documents: 'documents',
  financial: 'financial',
  timeline: 'timeline',
  orders: 'orders',
  opportunities: 'opportunities',
  purchases: 'purchases',
  inquiries: 'inquiries',
};

/**
 * Resolve ?tab= for the active entity. Sales tabs map to supply tabs on supplier profiles.
 * @param {string|null} raw
 * @param {string} entityType
 */
export function resolveCompanyProfileTab(raw, entityType) {
  const tabs = getCompanyProfileTabs(entityType);
  const mapped = LEGACY_TAB_MAP[raw] || raw;

  if (entityType === ENTITY_TYPES.SUPPLIER) {
    if (mapped === 'orders') return 'purchases';
    if (mapped === 'opportunities') return 'inquiries';
  }

  if (tabs.some((tab) => tab.id === mapped)) return mapped;
  return 'timeline';
}
