import { ENTITY_TYPES, PERSON_TYPES } from './config';
import { formatRelativeTime } from './relativeTime';
import { listCompanyInteractions } from '../pooyesh/interactionFacade';
import { getSupplierCapabilityTags } from './supplierCapabilities';

export const VIEW_KEYS = {
  CUSTOMER_LEGAL: 'customer-legal',
  CUSTOMER_NATURAL: 'customer-natural',
  SUPPLIER_LEGAL: 'supplier-legal',
  SUPPLIER_NATURAL: 'supplier-natural',
};

const CUSTOMER_TIME_COLUMNS = [
  { key: 'contactAge', label: 'عمر مخاطب', sortable: true, filterable: false },
  { key: 'lastActivity', label: 'آخرین پویش', sortable: true, filterable: false },
];

const CUSTOMER_WARM = [
  { key: 'interactionValue', label: 'کل فروش', sortable: true, filterable: true },
  { key: 'orderPulse', label: 'نبض سفارشات', sortable: true, filterable: false },
];

const SUPPLIER_WARM = [
  { key: 'supplyVolume', label: 'حجم تامین', sortable: true, filterable: true },
  { key: 'openInquiries', label: 'استعلام‌های باز', sortable: true, filterable: false },
];

export function getViewKey(entityType, personType) {
  if (entityType === ENTITY_TYPES.CUSTOMER && personType === PERSON_TYPES.LEGAL) return VIEW_KEYS.CUSTOMER_LEGAL;
  if (entityType === ENTITY_TYPES.CUSTOMER && personType === PERSON_TYPES.NATURAL) return VIEW_KEYS.CUSTOMER_NATURAL;
  if (entityType === ENTITY_TYPES.SUPPLIER && personType === PERSON_TYPES.LEGAL) return VIEW_KEYS.SUPPLIER_LEGAL;
  return VIEW_KEYS.SUPPLIER_NATURAL;
}

export const TABLE_COLUMNS = {
  [VIEW_KEYS.CUSTOMER_LEGAL]: [
    { key: 'row', label: 'ردیف', sortable: false, filterable: false },
    { key: 'companyName', label: 'نام شرکت', sortable: true, filterable: true },
    { key: 'activityDomain', label: 'حوزه فعالیت', sortable: true, filterable: true },
    { key: 'assignee', label: 'شوالیه مرتبط', sortable: true, filterable: true },
    ...CUSTOMER_WARM,
    ...CUSTOMER_TIME_COLUMNS,
    { key: 'behavioralStatus', label: 'وضعیت', sortable: true, filterable: true },
  ],
  [VIEW_KEYS.CUSTOMER_NATURAL]: [
    { key: 'row', label: 'ردیف', sortable: false, filterable: false },
    { key: 'personName', label: 'نام شخص', sortable: true, filterable: true },
    { key: 'mobile', label: 'شماره موبایل', sortable: true, filterable: true },
    { key: 'activityDomain', label: 'حوزه فعالیت', sortable: true, filterable: true },
    { key: 'assignee', label: 'شوالیه مرتبط', sortable: true, filterable: true },
    ...CUSTOMER_WARM,
    ...CUSTOMER_TIME_COLUMNS,
    { key: 'behavioralStatus', label: 'وضعیت', sortable: true, filterable: true },
  ],
  [VIEW_KEYS.SUPPLIER_LEGAL]: [
    { key: 'row', label: 'ردیف', sortable: false, filterable: false },
    { key: 'companyName', label: 'نام شرکت', sortable: true, filterable: true },
    { key: 'ownerName', label: 'نام مدیر/مالک', sortable: true, filterable: true },
    { key: 'productGroup', label: 'گروه کالا', sortable: true, filterable: true },
    { key: 'productSubgroup', label: 'زیرمجموعه کالا', sortable: true, filterable: true },
    { key: 'supplierType', label: 'نوع تامین‌کننده', sortable: true, filterable: true },
    ...SUPPLIER_WARM,
  ],
  [VIEW_KEYS.SUPPLIER_NATURAL]: [
    { key: 'row', label: 'ردیف', sortable: false, filterable: false },
    { key: 'personName', label: 'نام شخص', sortable: true, filterable: true },
    { key: 'productGroup', label: 'گروه کالا', sortable: true, filterable: true },
    { key: 'productSubgroup', label: 'زیرمجموعه کالا', sortable: true, filterable: true },
    { key: 'supplierType', label: 'نوع تامین‌کننده', sortable: true, filterable: true },
    ...SUPPLIER_WARM,
  ],
};

function getAnalytics(contact) {
  const a = contact.analytics || {};
  const openOrders = a.openOrders ?? (contact.relatedOrders?.length || 0);
  return {
    interactionValue: a.interactionValue || '۰ تومان',
    openOrders,
    supplyVolume: a.supplyVolume || '۰ تومان',
    openInquiries: a.openInquiries ?? 0,
  };
}

export function getCellValue(contact, columnKey) {
  const analytics = getAnalytics(contact);

  switch (columnKey) {
    case 'row':
      return null;
    case 'companyName':
      return contact.companyName || '';
    case 'personName':
      return contact.personName || '';
    case 'province':
      return contact.province || '';
    case 'activityDomain':
      return contact.activityDomain || '';
    case 'ownerName':
      return contact.ownerName || '';
    case 'mobile':
      return contact.mobile || '';
    case 'productGroup':
      return getSupplierCapabilityTags(contact)
        .map((tag) => tag.legacyGroup || tag.label)
        .join('، ') || '';
    case 'productSubgroup':
      return getSupplierCapabilityTags(contact)
        .map((tag) => tag.label)
        .join('، ') || '';
    case 'supplierType':
      return contact.supplierType || '';
    case 'assignee':
      if (contact.entityType === ENTITY_TYPES.CUSTOMER) {
        return contact.assignee?.name || '';
      }
      return contact.assignee ? `${contact.assignee.name} (${contact.assignee.role})` : '';
    case 'interactionValue':
      return analytics.interactionValue;
    case 'orderPulse':
      return analytics.openOrders;
    case 'supplyVolume':
      return analytics.supplyVolume;
    case 'openInquiries':
      return analytics.openInquiries;
    case 'contactAge':
      return formatRelativeTime(contact.createdAt);
    case 'lastActivity':
      return formatRelativeTime(contact.lastActivityAt);
    case 'behavioralStatus':
      return contact.behavioralStatus || '';
    default:
      return '';
  }
}

export function getDisplayName(contact) {
  return contact.personType === PERSON_TYPES.LEGAL
    ? contact.companyName
    : contact.personName;
}

const OPEN_ORDER_STAGES = new Set(['مظنه', 'پیش‌کش', 'کاوش', 'عملیات']);

export function getOpenOrderItems(contact) {
  const fromData = (contact.relatedOrders || []).filter(
    (o) => !o.stage || OPEN_ORDER_STAGES.has(o.stage),
  );
  const targetCount = contact.analytics?.openOrders ?? fromData.length;
  if (!targetCount) return [];

  const items = fromData.slice(0, targetCount);
  const padded = [...items];
  while (padded.length < targetCount) {
    padded.push({ id: null });
  }
  return padded;
}

export function getLatestInteraction(contact) {
  const list = listCompanyInteractions(contact?.id);
  if (!list.length) return null;
  return [...list].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''), 'fa'))[0];
}

export function getActivityLink(contact) {
  const latest = getLatestInteraction(contact);
  if (!latest) return null;
  const activityId = latest.id || `contact-${contact.id}-latest`;
  return `/pooyesh?contact=${contact.id}&activity=${encodeURIComponent(activityId)}`;
}
