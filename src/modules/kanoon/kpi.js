import { BEHAVIORAL_STATUS, ENTITY_TYPES } from './config';
import { getCellValue } from './columns';

const INACTIVE_STATUSES = new Set(['silent', 'stagnant']);

export function computeKanoonKpis(contacts) {
  const total = contacts.length;
  const activeCustomers = contacts.filter(
    (c) => c.entityType === ENTITY_TYPES.CUSTOMER && !INACTIVE_STATUSES.has(c.behavioralStatus),
  ).length;
  const ambassadors = contacts.filter((c) => c.behavioralStatus === 'ambassador').length;
  const silentStagnant = contacts.filter((c) => INACTIVE_STATUSES.has(c.behavioralStatus)).length;

  return [
    { label: 'کل مخاطبین', value: total.toLocaleString('fa-IR'), variant: 'accent' },
    { label: 'مشتریان فعال', value: activeCustomers.toLocaleString('fa-IR') },
    { label: 'سفیران', value: ambassadors.toLocaleString('fa-IR') },
    { label: 'خاموش / راکد', value: silentStagnant.toLocaleString('fa-IR'), variant: 'danger' },
  ];
}

export function filterContacts(contacts, { entityType, personType, search, columnFilters }) {
  return contacts.filter((contact) => {
    if (contact.entityType !== entityType || contact.personType !== personType) return false;

    if (search) {
      const haystack = [
        contact.companyName,
        contact.personName,
        contact.nationalId,
        contact.mobile,
        contact.province,
        contact.activityDomain,
        contact.ownerName,
        contact.analytics?.interactionValue,
        contact.analytics?.supplyVolume,
        contact.assignee?.name,
        contact.assignee?.role,
        ...(contact.productGroups || []).flatMap((p) => [p.group, p.subgroup]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }

    for (const [key, value] of Object.entries(columnFilters)) {
      if (!value) continue;
      const cell = getFilterableCell(contact, key);
      const statusLabel = BEHAVIORAL_STATUS[cell]?.label || cell;
      if (!String(statusLabel).toLowerCase().includes(value.toLowerCase())) return false;
    }

    return true;
  });
}

function getFilterableCell(contact, key) {
  if (key === 'assignee') return getCellValue(contact, 'assignee');
  if (key === 'productGroup') {
    return (contact.productGroups || []).map((p) => p.group).join('، ');
  }
  if (key === 'productSubgroup') {
    return (contact.productGroups || []).map((p) => p.subgroup).join('، ');
  }
  if (['interactionValue', 'supplyVolume', 'contactAge', 'lastActivity'].includes(key)) {
    return getCellValue(contact, key);
  }
  return contact[key] ?? '';
}

function getSortValue(contact, sortKey, getCellValueFn) {
  if (sortKey === 'contactAge') return contact.createdAt || '';
  if (sortKey === 'lastActivity') return contact.lastActivityAt || '';
  if (sortKey === 'orderPulse') return contact.analytics?.openOrders ?? contact.relatedOrders?.length ?? 0;
  if (sortKey === 'openInquiries') return contact.analytics?.openInquiries ?? 0;
  return getCellValueFn(contact, sortKey);
}

export function sortContacts(contacts, sortKey, sortDir, getCellValueFn) {
  if (!sortKey || sortKey === 'row') return contacts;

  return [...contacts].sort((a, b) => {
    const aRaw = getSortValue(a, sortKey, getCellValueFn);
    const bRaw = getSortValue(b, sortKey, getCellValueFn);
    const aVal = typeof aRaw === 'number' ? aRaw : String(aRaw ?? '');
    const bVal = typeof bRaw === 'number' ? bRaw : String(bRaw ?? '');
    const cmp = typeof aVal === 'number'
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal), 'fa');
    return sortDir === 'asc' ? cmp : -cmp;
  });
}
