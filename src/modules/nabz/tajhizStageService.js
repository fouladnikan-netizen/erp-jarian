import { CURRENT_USER } from './constants';
import { ORDER_TABS, STAGE_TAJHIZ_ID } from './config';
import { getCustomerById } from './customers';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import { OPERATIONAL_PHASES } from './phase2Config';
import { getOrderOperationalPhase } from './phase2Service';
import { formatAmountRial } from './orderCode';
import { calculateQuotingPreview, getTargetInquiry } from './quotingService';
import { getSupplierName } from './suppliers';
import { getTadarokLines } from './tadarokStageService';
import { TADAROK_LINE_STATUS } from './tadarokStageConfig';
import { getCarrierById } from './carriers';
import { getWarehouseById } from './warehouses';

export function isTajhizStageLive(order, operationalViewPhase) {
  return order.status === ORDER_TABS.SUCCESS
    && order.stageId === STAGE_TAJHIZ_ID
    && getOrderOperationalPhase(order) === OPERATIONAL_PHASES.TAJHIZ
    && operationalViewPhase === OPERATIONAL_PHASES.TAJHIZ;
}

function buildFallbackPurchaseRow(order, item, index, previewLine, target) {
  const warehouse = getWarehouseById('wh-tehran');
  return {
    rowNumber: index + 1,
    name: item.name || '—',
    description: item.description || '—',
    qty: Number(item.qty) || 0,
    unit: item.unit || 'تن',
    saleUnitPriceRial: previewLine?.saleUnitPrice || 0,
    supplyType: target?.supplyType || 'رسمی',
    supplierName: target ? getSupplierName(target.supplierId) : '—',
    purchaseUnitPriceRial: target?.unitPrice || 0,
    warehouseVoucherCode: `HV-${order.code.slice(-4)}-${index + 1}`,
    warehouseName: warehouse?.name || 'انبار مرکزی تهران',
    warehouseAddress: warehouse?.address || '—',
  };
}

function buildRowFromPurchaseLine(order, line, index, preview) {
  const po = line.purchaseOrder || {};
  const previewLine = preview.lines[line.sourceItemIndex];
  const warehouse = getWarehouseById(po.warehouseId);
  return {
    rowNumber: index + 1,
    name: line.name,
    description: line.description || '—',
    qty: line.qty,
    unit: line.unit,
    saleUnitPriceRial: previewLine?.saleUnitPrice || 0,
    supplyType: po.supplyType || '—',
    supplierName: getSupplierName(po.supplierId),
    purchaseUnitPriceRial: po.agreedUnitPriceRial || 0,
    warehouseVoucherCode: po.warehouseVoucherCode || '—',
    warehouseName: warehouse?.name || '—',
    warehouseAddress: po.warehouseAddress || warehouse?.address || '—',
  };
}

export function getFulfilledPurchaseRows(order) {
  const preview = calculateQuotingPreview(order);
  const issuedLines = getTadarokLines(order).filter(
    (line) => line.status === TADAROK_LINE_STATUS.PO_ISSUED,
  );

  if (issuedLines.length > 0) {
    return issuedLines.map((line, index) => buildRowFromPurchaseLine(order, line, index, preview));
  }

  return (order.items || []).map((item, index) => {
    const target = getTargetInquiry(item);
    return buildFallbackPurchaseRow(order, item, index, preview.lines[index], target);
  });
}

export function getTajhizExpertNotes(order) {
  return order.tajhizExpertNotes
    || order.parvaneDriverNotes
    || order.generalNotes
    || '';
}

export function getShippingRecipient(order) {
  const customer = getCustomerById(order.customerId);
  if (!customer) {
    return {
      name: order.customer || '—',
      nationalId: '—',
      phone: '—',
      postalCode: '—',
      address: '—',
    };
  }

  const primaryPerson = customer.relatedPersons?.[0];
  return {
    name: primaryPerson?.name || customer.companyName || customer.personName || order.customer,
    nationalId: customer.nationalId || '—',
    phone: primaryPerson?.mobile || customer.mobile || customer.officialSpecs?.phone || '—',
    postalCode: customer.officialSpecs?.postalCode || '—',
    address: customer.fullAddress || customer.officialSpecs?.address || '—',
  };
}

export function buildShippingDocumentViewModel(order, carrierId) {
  const carrier = getCarrierById(carrierId);
  const items = getFulfilledPurchaseRows(order).map((row) => ({
    rowNumber: row.rowNumber,
    name: row.name,
    description: row.description,
    qty: row.qty,
    unit: row.unit,
    warehouseName: row.warehouseName,
    warehouseAddress: row.warehouseAddress,
    warehouseVoucherCode: row.warehouseVoucherCode,
  }));

  return {
    orderCode: order.code,
    issueDate: order.tajhizShipping?.issuedAt?.split(' · ')[0] || getTodayJalali(),
    carrier: carrier || { name: '—', phone: '—', address: '—' },
    recipient: getShippingRecipient(order),
    items,
    expertNotes: getTajhizExpertNotes(order),
    voucherNumber: order.tajhizShipping?.voucherNumber
      || `BB-${order.code.slice(-6)}-${Date.now().toString().slice(-4)}`,
  };
}

export function issueShippingVoucher(order, carrierId) {
  if (!carrierId) {
    return { accepted: false, reason: 'باربری را انتخاب کنید.' };
  }

  const carrier = getCarrierById(carrierId);
  if (!carrier) {
    return { accepted: false, reason: 'باربری انتخاب‌شده معتبر نیست.' };
  }

  const viewModel = buildShippingDocumentViewModel(order, carrierId);
  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;

  return {
    accepted: true,
    viewModel,
    order: {
      ...order,
      tajhizShipping: {
        carrierId,
        voucherNumber: viewModel.voucherNumber,
        issuedAt: at,
        issuedBy: CURRENT_USER,
      },
      events: [
        ...(order.events || []),
        {
          id: Date.now(),
          type: 'shipping_voucher_issued',
          at,
          by: CURRENT_USER,
          summary: `صدور حواله باربری ${viewModel.voucherNumber} — ${carrier.name}`,
        },
      ],
    },
  };
}

export function formatTajhizPrice(amount) {
  if (!amount) return '—';
  return `${formatAmountRial(amount)} ریال`;
}
