import { getStageLabel } from '../../modules/nabz/config';
import { orderDeepLinkPath } from '../../components/navigation/entityMentions';
import { listCompanyInteractions } from '../../modules/pooyesh/interactionFacade';
import { ENTITY_TYPES } from '../../modules/kanoon/config';
import {
  listSupplierInquiries,
  listSupplierPurchaseOrders,
} from '../../modules/kanoon/supplierSupplyBinding';

/**
 * Company profile timeline — cross-domain read projection (not a domain SoR).
 *
 * Ownership of underlying events remains with source domains:
 * - Pooyesh → soft interactions (via interactionFacade)
 * - Nabz → orders, payments/proforma embedded on orders
 * - Kanoon supplierSupplyBinding → supplier inquiry / PO lenses over Nabz
 * - Finance / Gahshomar → future ledger & correspondence adapters
 *
 * Temporary fallback: `Company.relatedOrders` seed rows when a live Nabz order
 * is not present. Future SSOT: Nabz Orders only.
 *
 * Used by Customer Profile "سوابق و وقایع" tab. Does not own or write domain state.
 */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function toAsciiDigits(value) {
  return String(value || '').replace(/[۰-۹]/g, (ch) => String(FA_DIGITS.indexOf(ch)));
}

/** Sort key: higher = newer. Supports ISO and Jalali YYYY/MM/DD. */
export function timelineSortKey(value) {
  if (!value) return 0;
  const raw = toAsciiDigits(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : 0;
  }
  const match = raw.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!match) return 0;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || !m || !d) return 0;
  return y * 10_000 + m * 100 + d;
}

function formatDisplayDate(value) {
  if (!value) return '—';
  if (/^\d{4}-/.test(String(value))) {
    return new Date(value).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
  return String(value).split('·')[0].trim() || String(value);
}

function formatRialAmount(amount) {
  if (amount == null || amount === '') return '';
  if (typeof amount === 'string' && /[۰-۹]/.test(amount)) return `${amount} ریال`;
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(num)) return String(amount);
  return `${Math.abs(num).toLocaleString('fa-IR')} ریال`;
}

function interactionKind(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'call' || t.includes('تماس') || t.includes('پیگیری')) return 'followup';
  return 'followup';
}

function interactionTitle(type) {
  const map = {
    call: 'تماس پیگیری',
    message: 'پیام / ایمیل',
    meeting: 'جلسه',
    catalog: 'ارسال کاتالوگ',
    note: 'یادداشت',
    task: 'وظیفه',
    پیگیری: 'پیگیری تلفنی',
    'جلسه حضوری': 'جلسه حضوری',
    فروش: 'تعامل فروش',
  };
  return map[type] || type || 'پیگیری';
}

function getOrderPayments(order) {
  const saranjam = order?.saranjam?.customerPayments;
  if (Array.isArray(saranjam) && saranjam.length) return saranjam;
  if (!Array.isArray(order?.crmActivities) || !order.crmActivities.length) return [];
  return order.crmActivities
    .filter((a) => a?.type === 'payment' && a.payment)
    .map((a) => ({
      id: `crm-pay-${a.id}`,
      date: a.payment.date,
      amountRial: Number(a.payment.amountRial) || 0,
      note: a.body || 'دریافت وجه',
    }))
    .filter((p) => p.amountRial > 0 && p.date);
}

function getProformaEvents(order) {
  const versions = order?.proforma?.versions;
  if (Array.isArray(versions) && versions.length) {
    return versions.map((version, index) => ({
      id: version.id || `pf-${order.code}-${index}`,
      date: version.issuedAt || version.createdAt || version.date || null,
      documentNumber: version.documentNumber || version.number || '',
      label: version.documentNumber
        ? `صدور پیش‌فاکتور ${version.documentNumber}`
        : 'صدور پیش‌فاکتور',
    }));
  }
  const events = (order?.events || []).filter(
    (e) => e?.type === 'proforma_issued' || e?.type === 'proforma_updated',
  );
  return events.map((e, index) => ({
    id: e.id || `pfe-${order.code}-${index}`,
    date: e.at || e.date || null,
    documentNumber: e.documentNumber || '',
    label: e.message || (e.type === 'proforma_updated' ? 'به‌روزرسانی پیش‌فاکتور' : 'صدور پیش‌فاکتور'),
  }));
}

/**
 * @returns {Array<{
 *   id: string,
 *   kind: 'order' | 'followup' | 'payment' | 'invoice',
 *   title: string,
 *   body: string,
 *   dateLabel: string,
 *   sortKey: number,
 *   meta?: string,
 *   orderCode?: string,
 *   links?: Array<{ label: string, path: string, kind?: string }>,
 * }>}
 */
export function buildCompanyTimelineEvents(contact, orders = []) {
  if (!contact) return [];
  const events = [];
  const companyId = String(contact.id);

  const orderLink = (code) => {
    const path = orderDeepLinkPath(code);
    if (!path || !code) return [];
    return [{ label: String(code), path, kind: 'order' }];
  };

  for (const item of listCompanyInteractions(contact.id)) {
    events.push({
      id: `ix-${item.id}`,
      kind: interactionKind(item.type),
      title: interactionTitle(item.type),
      body: item.note || item.summary || '—',
      dateLabel: formatDisplayDate(item.date),
      sortKey: timelineSortKey(item.date),
      meta: item.operator || null,
      links: [],
    });
  }

  const liveOrders = (orders || []).filter((order) => String(order.customerId) === companyId);
  const liveCodes = new Set(liveOrders.map((o) => o.code));

  if (contact.entityType === ENTITY_TYPES.SUPPLIER) {
    for (const row of listSupplierInquiries(companyId, orders)) {
      events.push({
        id: `sup-inq-${row.id}`,
        kind: 'followup',
        title: 'استعلام تامین',
        body: `${row.productName}${row.description ? ` — ${row.description}` : ''} · سفارش ${row.orderCode}`,
        dateLabel: formatDisplayDate(row.date),
        sortKey: timelineSortKey(row.date),
        meta: row.unitPriceLabel,
        orderCode: row.orderCode,
        links: orderLink(row.orderCode),
      });
    }
    for (const row of listSupplierPurchaseOrders(companyId, orders)) {
      events.push({
        id: `sup-po-${row.id}`,
        kind: 'order',
        title: 'سفارش خرید',
        body: `${row.productName}${row.description ? ` — ${row.description}` : ''} · سفارش ${row.orderCode}`,
        dateLabel: formatDisplayDate(row.date),
        sortKey: timelineSortKey(row.date),
        meta: row.unitPriceLabel,
        orderCode: row.orderCode,
        links: orderLink(row.orderCode),
      });
    }
  } else {
    for (const order of liveOrders) {
      const date = order.registeredDate || order.createdAt || null;
      const links = orderLink(order.code);
      events.push({
        id: `ord-${order.id || order.code}`,
        kind: 'order',
        title: 'ثبت سفارش',
        body: `${order.code}${order.stageId ? ` — ${getStageLabel(order.stageId)}` : ''}`,
        dateLabel: formatDisplayDate(date),
        sortKey: timelineSortKey(date),
        meta: order.amountRial != null ? formatRialAmount(order.amountRial) : null,
        orderCode: order.code,
        links,
      });

      for (const pay of getOrderPayments(order)) {
        events.push({
          id: `pay-${order.code}-${pay.id}`,
          kind: 'payment',
          title: 'دریافت وجه',
          body: pay.note || `پرداخت مرتبط با سفارش ${order.code}`,
          dateLabel: formatDisplayDate(pay.date),
          sortKey: timelineSortKey(pay.date),
          meta: formatRialAmount(pay.amountRial),
          orderCode: order.code,
          links,
        });
      }

      for (const pf of getProformaEvents(order)) {
        events.push({
          id: `inv-${order.code}-${pf.id}`,
          kind: 'invoice',
          title: 'صدور صورتحساب / پیش‌فاکتور',
          body: pf.label || `سفارش ${order.code}`,
          dateLabel: formatDisplayDate(pf.date),
          sortKey: timelineSortKey(pf.date),
          meta: pf.documentNumber ? String(pf.documentNumber) : order.code,
          orderCode: order.code,
          links,
        });
      }
    }

    for (const order of contact.relatedOrders || []) {
      if (liveCodes.has(order.id)) continue;
      const links = orderLink(order.id);
      events.push({
        id: `seed-ord-${order.id}`,
        kind: 'order',
        title: 'ثبت سفارش',
        body: `${order.id}${order.title ? ` — ${order.title}` : ''}`,
        dateLabel: formatDisplayDate(order.registeredAt),
        sortKey: timelineSortKey(order.registeredAt),
        meta: order.amount ? formatRialAmount(order.amount) : null,
        orderCode: order.id,
        links,
      });
    }
  }

  return events.sort((a, b) => b.sortKey - a.sortKey || String(b.id).localeCompare(String(a.id)));
}
