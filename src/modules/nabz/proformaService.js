import { PERSON_TYPES } from '../kanoon/config';
import { getCustomerById } from './customers';
import { calculateQuotingPreview } from './quotingService';
import { getTodayJalali, getNowTimeFa, toPersianDigits } from './dateUtils';
import { formatAmountRialWords } from './numberToPersianWords';
import { DEFAULT_PROFORMA_TERMS } from './proformaConfig';
import { CURRENT_USER } from './constants';

let proformaVersionIdCounter = 1;
let proformaEventIdCounter = 9000;

const ASSIGNEE_MOBILES = {
  'علی رضایی': '09121112233',
  'حسین کریمی': '09131234567',
  'سارا موسوی': '09354445566',
  'مریم احمدی': '09141234567',
  'امیر صادقی': '09151234567',
  'فاطمه رحیمی': '09161234567',
  'رضا نوری': '09171234567',
};

export function resolveCustomerRequester(order, customer) {
  if (order.requesterName) {
    return {
      name: order.requesterName,
      mobile: order.requesterMobile || '—',
    };
  }

  const related = (customer?.relatedPersons || []).find((person) => person.name);
  if (related) {
    return {
      name: related.name,
      mobile: related.mobile || '—',
    };
  }

  if (customer?.personType === PERSON_TYPES.NATURAL) {
    return {
      name: customer.personName || order.customer || '—',
      mobile: customer.mobile || '—',
    };
  }

  return { name: '—', mobile: '—' };
}

export function getProformaTerms(order) {
  if (order.proforma?.customTerms) {
    return order.proforma.terms || DEFAULT_PROFORMA_TERMS;
  }
  return DEFAULT_PROFORMA_TERMS;
}

export function isProformaTermsEditable(order) {
  return Boolean(order.proforma?.termsEditable);
}

export function resolveAssigneeMobile(assigneeName) {
  return ASSIGNEE_MOBILES[assigneeName] || '—';
}

export function formatProformaDocumentNumber(orderCode, revision = 1) {
  const base = toPersianDigits(orderCode || '—');
  if (!revision || revision <= 1) return base;
  return `${base} (بازنگری ${toPersianDigits(revision)})`;
}

export function getProformaVersions(order) {
  return order.proforma?.versions || [];
}

export function getLatestProformaVersion(order) {
  const versions = getProformaVersions(order);
  return versions.length ? versions[versions.length - 1] : null;
}

/** اثرانگشت محتوا برای تشخیص تغییر نسبت به آخرین نسخه بایگانی‌شده */
export function buildProformaFingerprint(order) {
  const preview = calculateQuotingPreview(order);
  const terms = getProformaTerms(order);
  return JSON.stringify({
    customerId: order.customerId,
    customer: order.customer,
    saleType: preview.saleType || order.saleType || 'رسمی',
    terms,
    quoting: order.quoting || null,
    subtotal: preview.subtotal,
    vatAmount: preview.vatAmount,
    orderTotal: preview.orderTotal,
    items: (order.items || []).map((item) => ({
      name: item.name,
      qty: item.qty,
      unit: item.unit,
      description: item.description,
      targetInquiryId: item.targetInquiryId,
      inquiries: (item.inquiries || []).map((inq) => ({
        id: inq.id,
        unitPrice: inq.unitPrice,
        supplyType: inq.supplyType,
        supplierId: inq.supplierId,
      })),
    })),
  });
}

export function buildProformaViewModel(order, options = {}) {
  const preview = calculateQuotingPreview(order);
  const customer = getCustomerById(order.customerId);
  const saleType = preview.saleType || order.saleType || 'رسمی';
  const isOfficial = saleType === 'رسمی';
  const revision = options.revision ?? order.proforma?.revision ?? 1;
  const documentNumber = options.documentNumber
    || formatProformaDocumentNumber(order.code, revision);

  const lines = (order.items || []).map((item, index) => {
    const line = preview.lines[index] || {};
    const productName = item.name || '—';
    const productNote = item.description || '';
    const description = productNote ? `${productName} — ${productNote}` : productName;
    return {
      row: index + 1,
      productName,
      productNote,
      description,
      qty: line.qty ?? item.qty ?? 0,
      unit: item.unit || '—',
      saleUnitPrice: line.saleUnitPrice || 0,
      lineTotal: line.lineTotal || 0,
    };
  });

  const requester = resolveCustomerRequester(order, customer);

  return {
    customerName: order.customer || '—',
    customerNationalId: customer?.nationalId || '—',
    orderCode: documentNumber,
    documentNumber,
    revision,
    orderDate: order.registeredDate || '—',
    issueDate: options.issueDate || getTodayJalali(),
    requesterName: requester.name,
    requesterMobile: requester.mobile,
    assigneeName: order.assignee || '—',
    assigneeMobile: resolveAssigneeMobile(order.assignee),
    saleType,
    isOfficial,
    salePriceLabel: isOfficial ? 'قیمت قبل از مالیات' : 'قیمت فروش',
    lines,
    subtotal: preview.subtotal,
    vatAmount: preview.vatAmount,
    grandTotal: preview.orderTotal,
    grandTotalWords: formatAmountRialWords(preview.orderTotal),
  };
}

/**
 * صدور پیش‌فاکتور:
 * - همیشه payload پیش‌نمایش را برمی‌گرداند
 * - اگر محتوا تغییر کرده (یا اولین صدور است): بازنگری + بایگانی در سوابق
 * - اگر تغییری نبوده: فقط همان نسخه آخر را برای نمایش برمی‌گرداند
 */
export function issueProforma(order) {
  const terms = getProformaTerms(order);
  const termsCustom = Boolean(order.proforma?.customTerms);
  const fingerprint = buildProformaFingerprint(order);
  const versions = getProformaVersions(order);
  const latest = versions[versions.length - 1] || null;
  const previousHash = latest?.contentHash || order.proforma?.contentHash || null;
  const isFirstIssue = !latest;
  const contentChanged = isFirstIssue || previousHash !== fingerprint;

  if (!contentChanged) {
    return {
      order,
      changed: false,
      version: latest,
      payload: {
        viewModel: latest.viewModel,
        terms: latest.terms,
        termsCustom: latest.termsCustom,
        orderId: order.id,
        versionId: latest.id,
      },
    };
  }

  const revision = (order.proforma?.revision || 0) + 1;
  const documentNumber = formatProformaDocumentNumber(order.code, revision);
  const issuedAt = `${getTodayJalali()} · ${getNowTimeFa()}`;
  const issueDate = getTodayJalali();
  const viewModel = buildProformaViewModel(order, {
    revision,
    documentNumber,
    issueDate,
  });

  const version = {
    id: `pf-v-${proformaVersionIdCounter++}`,
    revision,
    documentNumber,
    contentHash: fingerprint,
    issuedAt,
    issuedBy: CURRENT_USER,
    viewModel,
    terms,
    termsCustom,
  };

  const nextOrder = {
    ...order,
    proforma: {
      termsEditable: false,
      customTerms: termsCustom,
      terms,
      ...(order.proforma || {}),
      revision,
      contentHash: fingerprint,
      lastIssuedAt: issuedAt,
      versions: [...versions, version],
    },
    events: [
      ...(order.events || []),
      {
        id: proformaEventIdCounter++,
        type: 'proforma_issued',
        at: issuedAt,
        by: CURRENT_USER,
        summary: revision <= 1
          ? `صدور پیش‌فاکتور ${documentNumber}`
          : `بازنگری پیش‌فاکتور — نسخه ${documentNumber}`,
        proformaVersionId: version.id,
        revision,
        documentNumber,
      },
    ],
  };

  return {
    order: nextOrder,
    changed: true,
    version,
    payload: {
      viewModel,
      terms,
      termsCustom,
      orderId: order.id,
      versionId: version.id,
    },
  };
}

export function updateOrderProforma(order, patch) {
  const proforma = {
    termsEditable: false,
    customTerms: false,
    terms: DEFAULT_PROFORMA_TERMS,
    ...(order.proforma || {}),
    ...patch,
  };

  if (patch.terms != null) {
    proforma.customTerms = patch.terms !== DEFAULT_PROFORMA_TERMS;
    proforma.terms = patch.terms;
  }

  return { ...order, proforma };
}

export function toggleProformaTermsEdit(order, enabled) {
  return updateOrderProforma(order, {
    termsEditable: enabled,
    terms: enabled ? getProformaTerms(order) : getProformaTerms(order),
  });
}
