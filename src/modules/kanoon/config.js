/**
 * Kanoon domain constants (not managed via Shirazeh settings UI).
 */
export {
  CUSTOMER_ACTIVITY_DOMAINS,
  SUPPLIER_TYPES,
  SUPPLIER_PRODUCT_GROUPS,
} from '../../config/registry';

/** Party types — canonical source: domain/party (re-exported for existing imports). */
export { ENTITY_TYPES, PERSON_TYPES } from '../../domain/party/party.constants.js';

export const BEHAVIORAL_STATUS = {
  ambassador: { label: 'سفیر', tag: 'ambassador' },
  active: { label: 'فعال', tag: 'active' },
  radar: { label: 'رصدگر', tag: 'radar' },
  hesitant: { label: 'مردد', tag: 'hesitant' },
  trial: { label: 'تجربه‌گر', tag: 'trial' },
  silent: { label: 'خاموش', tag: 'silent' },
  stagnant: { label: 'راکد', tag: 'silent' },
};

export const IRAN_PROVINCES = [
  'تهران', 'اصفهان', 'فارس', 'خراسان رضوی', 'آذربایجان شرقی', 'خوزستان',
  'مازندران', 'کرمان', 'آذربایجان غربی', 'گیلان', 'هرمزگان', 'البرز',
];

/** New customers always start as رصدگر */
export const DEFAULT_CUSTOMER_STATUS = 'radar';

export const ASSIGNEE_ROLES = {
  customer: 'شوالیه',
  supplier: 'کاشف',
};
