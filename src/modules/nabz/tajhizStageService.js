import { CURRENT_USER } from './constants';
import { ORDER_TABS, STAGE_TAJHIZ_ID } from './config';
import { getCustomerById } from './customers';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import { getDeliveryRecipientForShipping } from './deliveryInfoService';
import { OPERATIONAL_PHASES } from './phase2Config';
import { getOrderOperationalPhase } from './phase2Service';
import { formatAmountRial } from './orderCode';
import { calculateQuotingPreview, getTargetInquiry } from './quotingService';
import { getSupplierName } from './suppliers';
import { getTadarokLines } from './tadarokStageService';
import { TADAROK_LINE_STATUS } from './tadarokStageConfig';
import { getCarrierById } from './carriers';
import { getWarehouseById } from './warehouses';
import { resolveAssigneeMobile } from './proformaService';
import { SHIPPING_FORM_NUMBER } from './tajhizStageConfig';

export function isTajhizStageLive(order, operationalViewPhase) {
  return order.status === ORDER_TABS.SUCCESS
    && order.stageId === STAGE_TAJHIZ_ID
    && getOrderOperationalPhase(order) === OPERATIONAL_PHASES.TAJHIZ
    && operationalViewPhase === OPERATIONAL_PHASES.TAJHIZ;
}

function buildFallbackPurchaseRow(order, item, index, previewLine, target) {
  const warehouse = getWarehouseById('wh-tehran');
  const shippingRowKey = `item-${index}`;
  return {
    id: shippingRowKey,
    shippingRowKey,
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
  const shippingRowKey = line.id || `line-${index}`;
  return {
    id: shippingRowKey,
    shippingRowKey,
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
  const companyName = customer?.companyName
    || customer?.personName
    || order.customer
    || '—';

  const fromDelivery = getDeliveryRecipientForShipping(order);
  if (fromDelivery) {
    return {
      companyName: fromDelivery.companyName || companyName,
      name: fromDelivery.name,
      nationalId: fromDelivery.nationalId,
      phone: fromDelivery.phone,
      postalCode: fromDelivery.postalCode,
      address: fromDelivery.address,
      shippingNotes: fromDelivery.shippingNotes,
    };
  }

  if (!customer) {
    return {
      companyName: order.customer || '—',
      name: order.customer || '—',
      nationalId: '—',
      phone: '—',
      postalCode: '—',
      address: '—',
    };
  }

  const primaryPerson = customer.relatedPersons?.[0];
  return {
    companyName,
    name: primaryPerson?.name || companyName,
    nationalId: customer.nationalId || '—',
    phone: primaryPerson?.mobile || customer.mobile || customer.officialSpecs?.phone || '—',
    postalCode: customer.officialSpecs?.postalCode || '—',
    address: customer.fullAddress || customer.officialSpecs?.address || '—',
  };
}

export function buildShippingDocumentViewModel(order, carrierId, selectedRowKeys = null) {
  const allRows = getFulfilledPurchaseRows(order);
  const selectedSet = Array.isArray(selectedRowKeys) && selectedRowKeys.length > 0
    ? new Set(selectedRowKeys)
    : null;
  const sourceRows = selectedSet
    ? allRows.filter((row) => selectedSet.has(row.shippingRowKey))
    : allRows;

  const items = sourceRows.map((row, index) => ({
    rowNumber: index + 1,
    name: row.name,
    description: row.description,
    qty: row.qty,
    unit: row.unit,
    warehouseName: row.warehouseName,
    warehouseAddress: row.warehouseAddress,
    warehouseVoucherCode: row.warehouseVoucherCode,
    shippingRowKey: row.shippingRowKey,
  }));

  const carrier = getCarrierById(carrierId) || { name: '—', phone: '—', address: '—' };

  return {
    orderCode: order.code,
    formNumber: SHIPPING_FORM_NUMBER,
    documentNumberLabel: 'شماره فرم:',
    documentNumber: SHIPPING_FORM_NUMBER,
    issueDate: order.tajhizShipping?.issuedAt?.split(' · ')[0] || getTodayJalali(),
    carrier,
    sender: {
      salesExpertName: order.assignee || '—',
      salesExpertMobile: resolveAssigneeMobile(order.assignee),
      salesOrderCode: order.code || '—',
      carrierName: carrier.name || '—',
    },
    recipient: getShippingRecipient(order),
    items,
    expertNotes: getTajhizExpertNotes(order),
    voucherNumber: order.tajhizShipping?.voucherNumber
      || `BB-${order.code.slice(-6)}-${Date.now().toString().slice(-4)}`,
    selectedRowKeys: items.map((row) => row.shippingRowKey),
  };
}

export function issueShippingVoucher(order, carrierId, selectedRowKeys = null) {
  if (!carrierId) {
    return { accepted: false, reason: 'باربری را انتخاب کنید.' };
  }

  const carrier = getCarrierById(carrierId);
  if (!carrier) {
    return { accepted: false, reason: 'باربری انتخاب‌شده معتبر نیست.' };
  }

  const keys = Array.isArray(selectedRowKeys)
    ? selectedRowKeys.filter(Boolean)
    : [];
  if (keys.length === 0) {
    return { accepted: false, reason: 'حداقل یک ردیف کالا را برای باربری انتخاب کنید.' };
  }

  const viewModel = buildShippingDocumentViewModel(order, carrierId, keys);
  if (viewModel.items.length === 0) {
    return { accepted: false, reason: 'ردیفی برای صدور حواله یافت نشد.' };
  }

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
        selectedRowKeys: keys,
        itemCount: viewModel.items.length,
      },
      events: [
        ...(order.events || []),
        {
          id: Date.now(),
          type: 'shipping_voucher_issued',
          at,
          by: CURRENT_USER,
          summary: `صدور حواله باربری ${viewModel.voucherNumber} — ${carrier.name} (${viewModel.items.length} قلم)`,
        },
      ],
    },
  };
}

export function formatTajhizPrice(amount) {
  if (!amount) return '—';
  return `${formatAmountRial(amount)} ریال`;
}
