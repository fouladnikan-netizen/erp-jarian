/**
 * ERP audience port — builds company projections from Kanoon + contracts.
 * Read-only; no Mowj ownership of customer/order/finance data.
 */

import { ENTITY_TYPES } from '../../../domain/party/party.constants';
import { useContactsStore } from '../../../stores/useContactsStore';
import { getDisplayName } from '../../kanoon/columns';
import { listOrders } from '../../nabz/ordersFacade';
import { getCustomerFinancialSummary } from '../../finance/customerFinancialProjection';
import { listCompanyInteractions } from '../../pooyesh/interactionFacade';
import {
  CONTACT_PERSON_RELATION_TYPES,
  CONTACT_PERSON_STATUSES,
  getContactPersonJobLabel,
} from '../../../components/contactPerson/contactPersonRoles';

function resolveRelationTypeLabel(value) {
  if (!value) return null;
  const match = CONTACT_PERSON_RELATION_TYPES.find(
    (item) => item.id === value || item.label === value,
  );
  return match?.label || String(value);
}

function resolvePersonStatus(person) {
  if (person.status) {
    const match = CONTACT_PERSON_STATUSES.find(
      (item) => item.id === person.status || item.label === person.status,
    );
    return match?.id || String(person.status);
  }
  return person.isActive === false ? 'inactive' : 'active';
}

function daysSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

function collectOrdersByCustomer(orders) {
  /** @type {Map<string, object[]>} */
  const map = new Map();
  (orders || []).forEach((order) => {
    const cid = String(order.customerId || '');
    if (!cid) return;
    if (!map.has(cid)) map.set(cid, []);
    map.get(cid).push(order);
  });
  return map;
}

function buildOrderStats(companyOrders = []) {
  let totalPurchaseAmount = 0;
  let totalPurchaseWeight = 0;
  let firstPurchaseAt = null;
  let lastPurchaseAt = null;
  let latestDeliveryAt = null;
  let maxOrderAmount = 0;
  let maxOrderWeight = 0;
  let openOrderCount = 0;
  const purchasedProducts = new Set();
  const purchasedBrands = new Set();
  const suppliers = new Set();
  const orderStatuses = new Set();
  const orderRegisteredDates = [];

  companyOrders.forEach((order) => {
    const amount = Number(order.amountRial ?? order.totalAmount ?? 0);
    if (Number.isFinite(amount)) {
      totalPurchaseAmount += amount;
      maxOrderAmount = Math.max(maxOrderAmount, amount);
    }
    const weight = Number(order.totalWeight ?? order.weight ?? 0);
    if (Number.isFinite(weight)) {
      totalPurchaseWeight += weight;
      maxOrderWeight = Math.max(maxOrderWeight, weight);
    }
    const registered = order.registeredDate || order.createdAt || null;
    if (registered) {
      orderRegisteredDates.push(String(registered));
      if (!firstPurchaseAt || String(registered) < String(firstPurchaseAt)) firstPurchaseAt = registered;
      if (!lastPurchaseAt || String(registered) > String(lastPurchaseAt)) lastPurchaseAt = registered;
    }
    const delivery = order.deliveryDate || order.deliveredAt || null;
    if (delivery && (!latestDeliveryAt || String(delivery) > String(latestDeliveryAt))) {
      latestDeliveryAt = delivery;
    }
    if (order.status) orderStatuses.add(String(order.status));
    if (order.tab) orderStatuses.add(String(order.tab));
    const stage = Number(order.stageId);
    // treat non-terminal as open when stageId present and < success-ish threshold
    if (Number.isFinite(stage) && stage > 0 && stage < 90) openOrderCount += 1;
    else if (String(order.status || '').toLowerCase() === 'current') openOrderCount += 1;

    (Array.isArray(order.items) ? order.items : []).forEach((item) => {
      const name = item.name || item.productName || item.title;
      if (name) purchasedProducts.add(String(name));
      if (item.brand) purchasedBrands.add(String(item.brand));
      if (item.supplierName) suppliers.add(String(item.supplierName));
    });
    if (order.supplierName) suppliers.add(String(order.supplierName));
  });

  const statusList = [...orderStatuses];
  const hasSuccessfulOrder = statusList.some((s) => (
    /success|موفق|delivered|done/i.test(String(s))
  ));
  const hasFailedOrder = statusList.some((s) => (
    /fail|ناموفق|cancel|rejected/i.test(String(s))
  ));

  return {
    orderCount: companyOrders.length,
    totalPurchaseAmount,
    totalPurchaseWeight,
    firstPurchaseAt,
    lastPurchaseAt,
    orderRegisteredDates,
    purchasedProducts: [...purchasedProducts],
    purchasedBrands: [...purchasedBrands],
    orderStatuses: statusList,
    latestDeliveryAt,
    suppliers: [...suppliers],
    maxOrderAmount,
    maxOrderWeight,
    openOrderCount,
    hasOpenOrder: openOrderCount > 0,
    hasSuccessfulOrder,
    hasFailedOrder,
  };
}

function buildActivityStats(companyId) {
  try {
    const rows = listCompanyInteractions(companyId) || [];
    let lastActivityAt = null;
    let lastContactAt = null;
    rows.forEach((row) => {
      const at = row.occurredAt || row.createdAt || row.date || null;
      if (at && (!lastActivityAt || String(at) > String(lastActivityAt))) lastActivityAt = at;
      const type = String(row.type || row.kind || '').toLowerCase();
      if ((type.includes('call') || type.includes('تماس') || type.includes('contact')) && at) {
        if (!lastContactAt || String(at) > String(lastContactAt)) lastContactAt = at;
      }
    });
    return {
      activityCount: rows.length,
      lastActivityAt,
      lastContactAt: lastContactAt || lastActivityAt,
    };
  } catch {
    return { activityCount: 0, lastActivityAt: null, lastContactAt: null };
  }
}

function buildFinanceStats(contact) {
  try {
    const summary = getCustomerFinancialSummary(contact) || {};
    const balance = Number(summary.balanceRial ?? contact.accountBalanceRial ?? 0);
    return {
      accountBalance: Number.isFinite(balance) ? balance : 0,
      isDebtor: balance < 0,
      isCreditor: balance > 0,
      debtAmount: balance < 0 ? Math.abs(balance) : 0,
      hasOverdue: Boolean(summary.hasOverdue || contact.financial?.hasOverdue),
    };
  } catch {
    const balance = Number(contact.accountBalanceRial ?? contact.financial?.accountBalanceRial ?? 0);
    return {
      accountBalance: Number.isFinite(balance) ? balance : 0,
      isDebtor: balance < 0,
      isCreditor: balance > 0,
      debtAmount: balance < 0 ? Math.abs(balance) : 0,
      hasOverdue: false,
    };
  }
}

function toCompanyProjection(contact, orderMap) {
  const id = String(contact.id);
  const createdAt = contact.createdAt || contact.created_at || null;
  const orders = orderMap.get(id) || [];
  const orderStats = buildOrderStats(orders);
  const activity = buildActivityStats(id);
  const finance = buildFinanceStats(contact);

  const assignee = contact.assignee || null;
  const relatedKnight = typeof assignee === 'string'
    ? assignee
    : (assignee?.name || contact.assigneeName || contact.relatedKnight || null);

  return {
    companyId: id,
    contactId: id,
    province: contact.province || null,
    city: contact.city || contact.province || null,
    activityDomain: contact.activityDomain || null,
    personType: contact.personType || null,
    registeredCapital: contact.registeredCapital != null
      ? Number(contact.registeredCapital)
      : (contact.capital != null ? Number(contact.capital) : null),
    behavioralStatus: contact.behavioralStatus || contact.status || null,
    createdAt,
    companyAgeDays: daysSince(createdAt),
    leadSource: contact.leadSource || contact.source || null,
    relatedKnight: relatedKnight ? String(relatedKnight) : null,
    relationshipStatus: contact.relationshipStatus || contact.behavioralStatus || null,
    displayName: getDisplayName(contact) || null,
    ...activity,
    ...orderStats,
    ...finance,
  };
}

function toPersonProjection(companyProjection, person) {
  const personId = String(person.id);
  const rawPosition = person.jobPosition || person.role || null;
  const positionLabel = rawPosition
    ? (getContactPersonJobLabel(rawPosition) === '—' ? String(rawPosition) : getContactPersonJobLabel(rawPosition))
    : null;
  const relationRaw = person.relationType || person.relationshipType || rawPosition || null;
  return {
    ...companyProjection,
    personId,
    contactPersonId: personId,
    contactId: personId,
    personGender: person.gender || null,
    personPosition: positionLabel,
    personRelationType: resolveRelationTypeLabel(relationRaw),
    personStatus: resolvePersonStatus(person),
    displayName: person.fullName || person.name || null,
    mobile: person.mobile || null,
  };
}

/**
 * @returns {import('../domain/audience.ports').AudienceDataPort}
 */
export function createErpAudiencePort() {
  function listCompanies() {
    const contacts = useContactsStore.getState().contacts || [];
    const orders = listOrders();
    const orderMap = collectOrdersByCustomer(orders);
    return contacts
      .filter((contact) => {
        const entity = contact.entityType || contact.type;
        // Kanoon companies / customers — exclude pure suppliers from acquisition audiences by default
        return !entity || entity === ENTITY_TYPES.CUSTOMER || entity === 'customer';
      })
      .map((contact) => toCompanyProjection(contact, orderMap));
  }

  function listRelatedPersons() {
    const contacts = useContactsStore.getState().contacts || [];
    const companies = listCompanies();
    const byCompanyId = new Map(contacts.map((c) => [String(c.id), c]));
    /** @type {import('../domain/audience.ports').PersonAudienceProjection[]} */
    const rows = [];
    companies.forEach((company) => {
      const raw = byCompanyId.get(String(company.companyId));
      const persons = Array.isArray(raw?.relatedPersons) ? raw.relatedPersons : [];
      persons.forEach((person) => {
        rows.push(toPersonProjection(company, person));
      });
    });
    return rows;
  }

  return {
    listCompanies,
    listRelatedPersons,
    // legacy shims for older callers
    listContacts: () => listCompanies().map((row) => ({
      contactId: row.contactId,
      companyId: row.companyId,
      city: row.city,
      province: row.province,
      industry: row.activityDomain,
      activityDomain: row.activityDomain,
      lifecycleStage: row.behavioralStatus,
      leadSource: row.leadSource,
      displayName: row.displayName,
    })),
    listLeads: () => [],
    listOrders: () => listOrders().map((order) => ({
      orderId: String(order.id),
      customerId: String(order.customerId),
      stageId: order.stageId != null ? Number(order.stageId) : null,
      status: order.status || null,
      registeredDate: order.registeredDate || null,
      totalAmount: order.amountRial != null ? Number(order.amountRial) : null,
      amountRial: order.amountRial != null ? Number(order.amountRial) : null,
      items: Array.isArray(order.items) ? order.items : [],
    })),
  };
}
