import { CURRENT_USER } from './constants';
import { getCustomerById } from './customers';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import { getDeliveryRecipientForShipping } from './deliveryInfoService';
import { calculateQuotingPreview } from './quotingService';
import { getSupplierName } from './suppliers';
import { getTadarokLines } from './tadarokStageService';
import { TADAROK_LINE_STATUS } from './tadarokStageConfig';
import { getCarrierById } from './carriers';
import { getWarehouseById } from './warehouses';
import { resolveAssigneeMobile } from './proformaService';
import { SHIPPING_FORM_NUMBER } from './shippingConfig';

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
    cargoDeliveryTime: po.cargoDeliveryTime || '',
  };
}

/** فقط اقلامی که سفارش خرید برایشان صادر شده (خرید شده) */
export function getFulfilledPurchaseRows(order) {
  const preview = calculateQuotingPreview(order);
  return getTadarokLines(order)
    .filter((line) => line.status === TADAROK_LINE_STATUS.PO_ISSUED)
    .map((line, index) => buildRowFromPurchaseLine(order, line, index, preview));
}

export function hasPurchasedItemsForShipping(order) {
  return getFulfilledPurchaseRows(order).length > 0;
}

/** یادداشت کارشناس برای حواله / سفارش ارسال (سازگار با فیلدهای قدیمی) */
export function getShippingExpertNotes(order) {
  return order.shippingExpertNotes
    || order.tajhizExpertNotes
    || order.parvaneDriverNotes
    || order.generalNotes
    || '';
}

export function getOrderShippingRecord(order) {
  return order?.shippingVoucher || order?.tajhizShipping || null;
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

  const primaryPerson = (customer.relatedPersons || []).find((p) => p.isPrimary)
    || customer.relatedPersons?.[0];
  return {
    companyName,
    name: primaryPerson?.fullName || primaryPerson?.name || companyName,
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
  const shipping = getOrderShippingRecord(order);

  return {
    orderCode: order.code,
    formNumber: SHIPPING_FORM_NUMBER,
    documentNumberLabel: 'شماره فرم:',
    documentNumber: SHIPPING_FORM_NUMBER,
    issueDate: shipping?.issuedAt?.split(' · ')[0] || getTodayJalali(),
    carrier,
    sender: {
      salesExpertName: order.assignee || '—',
      salesExpertMobile: resolveAssigneeMobile(order.assignee),
      salesOrderCode: order.code || '—',
      carrierName: carrier.name || '—',
    },
    recipient: getShippingRecipient(order),
    items,
    expertNotes: getShippingExpertNotes(order),
    voucherNumber: shipping?.voucherNumber
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
  const shippingVoucher = {
    carrierId,
    voucherNumber: viewModel.voucherNumber,
    issuedAt: at,
    issuedBy: CURRENT_USER,
    selectedRowKeys: keys,
    itemCount: viewModel.items.length,
  };

  return {
    accepted: true,
    viewModel,
    order: {
      ...order,
      shippingVoucher,
      // سازگاری با داده‌های قدیمی تا مهاجرت کامل
      tajhizShipping: shippingVoucher,
      events: [
        ...(order.events || []),
        {
          id: Date.now(),
          type: 'shipping_voucher_issued',
          at,
          by: CURRENT_USER,
          summary: `صدور سفارش ارسال ${viewModel.voucherNumber} — ${carrier.name} (${viewModel.items.length} قلم)`,
        },
      ],
    },
  };
}
