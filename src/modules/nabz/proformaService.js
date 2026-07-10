import { PERSON_TYPES } from '../kanoon/config';
import { getCustomerById } from './customers';
import { calculateQuotingPreview } from './quotingService';
import { getTodayJalali } from './dateUtils';
import { formatAmountRialWords } from './numberToPersianWords';
import { DEFAULT_PROFORMA_TERMS } from './proformaConfig';

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

export function buildProformaViewModel(order) {
  const preview = calculateQuotingPreview(order);
  const customer = getCustomerById(order.customerId);
  const saleType = preview.saleType || order.saleType || 'رسمی';
  const isOfficial = saleType === 'رسمی';

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
    orderCode: order.code,
    orderDate: order.registeredDate || '—',
    issueDate: getTodayJalali(),
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
