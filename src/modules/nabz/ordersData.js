import { ORDER_TABS } from './config';
import { formatOrderCode } from './orderCode';

function o({
  id,
  yy,
  mm,
  dd,
  serial,
  customerId,
  customer,
  assignee,
  amountRial,
  stageId,
  status,
  registeredDate,
  registeredTime,
  items,
  failReason,
  orderType = 'خرید',
  saleType = 'رسمی',
  generalNotes = '',
  gatewayDecision,
  parvaneDriverNotes,
  quoting,
  tadarokLines,
  tajhizExpertNotes,
  qcInspections,
  inquiryCompletedAt,
  quotingCompletedAt,
}) {
  const orderItems = items || [];
  return {
    id,
    code: formatOrderCode({ yy, mm, dd, serial }),
    customerId,
    customer,
    assignee,
    orderType,
    saleType,
    generalNotes,
    itemCount: orderItems.length,
    amountRial,
    stageId,
    status,
    registeredDate,
    registeredTime,
    items: orderItems,
    failReason,
    isPriced: true,
    events: [],
    ...(inquiryCompletedAt ? { inquiryCompletedAt } : {}),
    ...(quotingCompletedAt ? { quotingCompletedAt } : {}),
    ...(gatewayDecision ? { gatewayDecision } : {}),
    ...(parvaneDriverNotes ? { parvaneDriverNotes } : {}),
    ...(quoting ? { quoting } : {}),
    ...(tadarokLines ? { tadarokLines } : {}),
    ...(tajhizExpertNotes ? { tajhizExpertNotes } : {}),
    ...(qcInspections ? { qcInspections } : {}),
  };
}

/** سفارش تستی ۱۲آیتمی در مرحله پیش‌کش — برای بررسی پیش‌نمایش پیش‌فاکتور */
const TEST_PROFORMA_12_ITEMS = [
  { name: 'میلگرد ۱۲', qty: 12, description: 'آجدار A3 — شاخه ۱۲ متری', unit: 'تن', price: 41_500_000 },
  { name: 'میلگرد ۱۴', qty: 8, description: 'آجدار A3', unit: 'تن', price: 42_200_000 },
  { name: 'میلگرد ۱۶', qty: 6, description: 'آجدار A3', unit: 'تن', price: 43_000_000 },
  { name: 'میلگرد ۱۸', qty: 4, description: 'آجدار A3', unit: 'تن', price: 44_800_000 },
  { name: 'تیرآهن IPE ۱۴۰', qty: 3, description: 'ذوب‌آهن', unit: 'تن', price: 51_000_000 },
  { name: 'تیرآهن IPE ۱۶۰', qty: 2.5, description: 'ذوب‌آهن', unit: 'تن', price: 52_500_000 },
  { name: 'ورق سیاه ۶mm', qty: 5, description: 'ابعاد ۶×۱۵۰۰', unit: 'تن', price: 38_750_000 },
  { name: 'ورق سیاه ۸mm', qty: 4, description: 'ابعاد ۸×۱۵۰۰', unit: 'تن', price: 39_200_000 },
  { name: 'ورق گالوانیزه ۲mm', qty: 2, description: 'A653', unit: 'تن', price: 55_000_000 },
  { name: 'نبشی ۵', qty: 3, description: 'استاندارد ۵۰×۵', unit: 'تن', price: 46_500_000 },
  { name: 'نبشی ۶', qty: 2, description: 'استاندارد ۶۰×۶', unit: 'تن', price: 47_800_000 },
  { name: 'لوله ۸ اینچ', qty: 1.5, description: 'مانیسمان — رده ۴۰', unit: 'تن', price: 68_000_000 },
].map((row, index) => {
  const inquiryId = 17001 + index;
  return {
    name: row.name,
    qty: row.qty,
    description: row.description,
    unit: row.unit,
    targetInquiryId: inquiryId,
    inquiries: [{
      id: inquiryId,
      supplyType: 'رسمی',
      supplierId: index % 2 === 0 ? 5 : 6,
      unitPrice: row.price,
      status: 'finalized',
      registeredAt: '۱۴۰۴/۰۱/۱۴ · ۰۹:۳۰',
      registeredBy: 'حسین کریمی',
      notes: '',
    }],
  };
});

const TEST_PROFORMA_12_AMOUNT = TEST_PROFORMA_12_ITEMS.reduce((sum, item) => {
  const price = item.inquiries[0].unitPrice;
  return sum + Math.round(price * 1.05 * item.qty);
}, 0);

const TEST_RAHESPAR_WAREHOUSES = ['wh-tehran', 'wh-isfahan', 'wh-tehran', 'wh-isfahan'];

/** خطوط تدارک خریداری‌شده برای تست رهسپار با ۱۲ قلم */
const TEST_RAHESPAR_TADAROK_LINES = TEST_PROFORMA_12_ITEMS.map((item, index) => {
  const warehouseId = TEST_RAHESPAR_WAREHOUSES[index % TEST_RAHESPAR_WAREHOUSES.length];
  const supplierId = item.inquiries[0].supplierId;
  const unitPrice = item.inquiries[0].unitPrice;
  const voucher = `WH-1404-17${String(index + 1).padStart(2, '0')}`;
  return {
    id: `tl-17-${index}`,
    sourceItemIndex: index,
    splitParentId: null,
    name: item.name,
    description: item.description || '',
    qty: item.qty,
    unit: item.unit,
    estimatedUnitPriceRial: Math.round(unitPrice * 1.05),
    status: 'po_issued',
    purchaseOrder: {
      supplierId,
      supplyType: 'رسمی',
      purchaseQty: item.qty,
      agreedUnitPriceRial: unitPrice,
      warehouseVoucherCode: voucher,
      warehouseId,
      warehouseAddress: warehouseId === 'wh-isfahan'
        ? 'اصفهان، منطقه صنعتی محمودآباد، انبار شماره ۳'
        : 'تهران، شهرک صنعتی، خیابان فولاد، پلاک ۱۲',
      poNumber: `HV-011499-${index + 1}`,
      issuedAt: '۱۴۰۴/۰۱/۱۴ · ۱۱:۳۰',
      issuedBy: 'حسین کریمی',
      paymentTerms: { type: 'prepayment', prepaymentDate: '۱۴۰۴/۰۱/۱۵', prepaymentAmountRial: '' },
      cargoDeliveryTime: '۱۴۰۴/۰۱/۲۰',
      importantNotes: '',
      discrepancyNotes: '',
    },
  };
});

export const initialOrders = [
  o({
    id: 17,
    yy: 5,
    mm: 1,
    dd: 14,
    serial: 99,
    customerId: 2,
    customer: 'صنایع فلزی کرمان',
    assignee: 'حسین کریمی',
    amountRial: TEST_PROFORMA_12_AMOUNT,
    stageId: 7,
    status: ORDER_TABS.SUCCESS,
    registeredDate: '۱۴۰۴/۰۱/۱۴',
    registeredTime: '۱۰:۰۰',
    orderType: 'خرید',
    saleType: 'رسمی',
    generalNotes: 'سفارش تستی ۱۲ آیتمی در مرحله رهسپار — برای تست بارگیری چندقلم.',
    inquiryCompletedAt: '۱۴۰۴/۰۱/۱۴ · ۰۹:۴۵',
    quotingCompletedAt: '۱۴۰۴/۰۱/۱۴ · ۰۹:۵۵',
    gatewayDecision: { outcome: 'success', paymentType: 'پیش‌پرداخت' },
    quoting: { marginMode: 'order_fixed_percent', orderMarginValue: '5', lineMargins: {} },
    items: TEST_PROFORMA_12_ITEMS,
    tadarokLines: TEST_RAHESPAR_TADAROK_LINES,
  }),
  o({ id: 1, yy: 5, mm: 1, dd: 12, serial: 1, customerId: 1, customer: 'فولاد پارس', assignee: 'علی رضایی', itemCount: 2, amountRial: 4_850_000_000, stageId: 1, status: ORDER_TABS.CURRENT, registeredDate: '۱۴۰۴/۰۱/۱۲', registeredTime: '۰۹:۱۵', orderType: 'فوری', requesterName: 'رضا محمدی', requesterMobile: '09121234567', generalNotes: 'نیاز به تحویل فوری در انبار تهران — تائید کیفیت الزامی است. مشتری تأکید کرده بار قبل از ظهر روز چهارشنبه تخلیه شود.', items: [{ name: 'میلگرد ۱۴', qty: 2, description: 'آجدار', unit: 'تن' }, { name: 'ورق ۸mm', qty: 1, description: 'سیاه', unit: 'تن' }] }),
  o({ id: 2, yy: 5, mm: 1, dd: 11, serial: 2, customerId: 2, customer: 'صنایع فلزی کرمان', assignee: 'حسین کریمی', itemCount: 2, amountRial: 2_120_000_000, stageId: 2, status: ORDER_TABS.CURRENT, registeredDate: '۱۴۰۴/۰۱/۱۱', registeredTime: '۱۱:۴۰', inquiryCompletedAt: '۱۴۰۴/۰۱/۱۱ · ۱۱:۳۰', quoting: { marginMode: 'order_fixed_percent', orderMarginValue: '5', lineMargins: {} }, items: [{ name: 'تیرآهن ۱۶', qty: 2, description: 'IPE 160', unit: 'تن', targetInquiryId: 201, inquiries: [{ id: 201, supplyType: 'رسمی', supplierId: 5, unitPrice: 52_000_000, status: 'finalized', registeredAt: '۱۴۰۴/۰۱/۱۱ · ۱۰:۰۰', registeredBy: 'حسین کریمی', notes: '' }, { id: 202, supplyType: 'غیررسمی', supplierId: 6, unitPrice: 50_500_000, status: 'finalized', registeredAt: '۱۴۰۴/۰۱/۱۱ · ۱۰:۳۰', registeredBy: 'حسین کریمی', notes: '' }] }, { name: 'نبشی ۵', qty: 1, description: 'استاندارد', unit: 'تن', targetInquiryId: 203, inquiries: [{ id: 203, supplyType: 'رسمی', supplierId: 5, unitPrice: 48_000_000, status: 'finalized', registeredAt: '۱۴۰۴/۰۱/۱۱ · ۱۰:۴۵', registeredBy: 'حسین کریمی', notes: '' }] }] }),
  o({ id: 3, yy: 5, mm: 1, dd: 10, serial: 3, customerId: 8, customer: 'بازرگانی آذر', assignee: 'سارا موسوی', itemCount: 1, amountRial: 1_950_000_000, stageId: 1, status: ORDER_TABS.CURRENT, registeredDate: '۱۴۰۴/۰۱/۱۰', registeredTime: '۱۴:۰۵', requesterName: 'مینا کریمی', requesterMobile: '09199876543', generalNotes: 'توضیحات مهم تستی: مشتری خواستار استعلام رسمی و غیررسمی هم‌زمان است. ترجیح تحویل درب کارخانه و پرداخت طی چک ۳۰ روزه. لطفاً قبل از تکمیل کاوش با کارشناس هماهنگ شود.', items: [{ name: 'نبشی ۵', qty: 1, description: 'استاندارد ۶۰×۶', unit: 'تن' }] }),
  o({ id: 4, yy: 5, mm: 1, dd: 9, serial: 4, customerId: 3, customer: 'علی رضایی', assignee: 'مریم احمدی', itemCount: 2, amountRial: 1_200_000_000, stageId: 1, status: ORDER_TABS.CURRENT, registeredDate: '۱۴۰۴/۰۱/۰۹', registeredTime: '۰۸:۳۰', items: [{ name: 'ورق ۶mm', qty: 2 }] }),
  o({ id: 5, yy: 5, mm: 1, dd: 8, serial: 5, customerId: 6, customer: 'فولاد مبارکه', assignee: 'امیر صادقی', itemCount: 4, amountRial: 3_600_000_000, stageId: 3, status: ORDER_TABS.CURRENT, registeredDate: '۱۴۰۴/۰۱/۰۸', registeredTime: '۱۶:۲۰', items: [{ name: 'لوله ۸ اینچ', qty: 4 }] }),
  o({ id: 6, yy: 5, mm: 1, dd: 7, serial: 6, customerId: 5, customer: 'ذوب آهن اصفهان', assignee: 'فاطمه رحیمی', itemCount: 2, amountRial: 5_100_000_000, stageId: 4, status: ORDER_TABS.SUCCESS, registeredDate: '۱۴۰۴/۰۱/۰۷', registeredTime: '۱۰:۰۰', gatewayDecision: { outcome: 'success', paymentType: 'پیش‌پرداخت' }, items: [{ name: 'ورق گالوانیزه', qty: 2, description: 'ضخامت ۲mm — A653', unit: 'تن', targetInquiryId: 601, inquiries: [{ id: 601, supplyType: 'رسمی', supplierId: 5, unitPrice: 55_000_000, status: 'finalized', registeredAt: '۱۴۰۴/۰۱/۰۶ · ۱۴:۰۰', registeredBy: 'فاطمه رحیمی', notes: '' }] }, { name: 'میلگرد ۱۴', qty: 1, description: 'آجدار A3', unit: 'تن', targetInquiryId: 602, inquiries: [{ id: 602, supplyType: 'رسمی', supplierId: 6, unitPrice: 48_000_000, status: 'finalized', registeredAt: '۱۴۰۴/۰۱/۰۶ · ۱۵:۰۰', registeredBy: 'فاطمه رحیمی', notes: '' }] }] }),
  o({ id: 7, yy: 5, mm: 1, dd: 6, serial: 7, customerId: 1, customer: 'فولاد پارس', assignee: 'علی رضایی', itemCount: 3, amountRial: 3_400_000_000, stageId: 7, status: ORDER_TABS.SUCCESS, registeredDate: '۱۴۰۴/۰۱/۰۶', registeredTime: '۱۳:۴۵', tajhizExpertNotes: 'کنترل کیفیت در محل انبار تهران — هماهنگی با آقای رضایی', quoting: { marginMode: 'order_fixed_percent', orderMarginValue: '5', lineMargins: {} }, items: [{ name: 'میلگرد ۱۸', qty: 3, description: 'آجدار A3', unit: 'تن', targetInquiryId: 701, inquiries: [{ id: 701, supplyType: 'رسمی', supplierId: 5, unitPrice: 44_000_000, status: 'finalized', registeredAt: '۱۴۰۴/۰۱/۰۵ · ۱۰:۰۰', registeredBy: 'علی رضایی', notes: '' }] }], tadarokLines: [{ id: 'tl-7-0', sourceItemIndex: 0, splitParentId: null, name: 'میلگرد ۱۸', description: 'آجدار A3', qty: 3, unit: 'تن', estimatedUnitPriceRial: 50_600_000, status: 'po_issued', purchaseOrder: { supplierId: 5, supplyType: 'رسمی', purchaseQty: 3, agreedUnitPriceRial: 46_000_000, warehouseVoucherCode: 'WH-1404-701', warehouseId: 'wh-tehran', warehouseAddress: 'تهران، شهرک صنعتی، خیابان فولاد، پلاک ۱۲', cargoDeliveryTime: '۱۴۰۴/۰۱/۱۰', poNumber: 'HV-010607-1', issuedAt: '۱۴۰۴/۰۱/۰۶ · ۱۲:۰۰', issuedBy: 'علی رضایی' } }], qcInspections: { 'WH-1404-701': { rowKey: 'WH-1404-701', itemLabel: 'میلگرد ۱۸', itemDescription: 'میلگرد ۱۸ — آجدار A3', qty: 3, unit: 'تن', inspectorName: 'رضا بازرگان', inspectDate: '۱۴۰۴/۰۱/۰۶', inspectTime: '۱۴:۲۰', thickness: '۱۸ میلی‌متر', dimensions: '۱۲ متر شاخه', visualHealth: 'slight-yellow', manufacturerBrand: 'ذوب آهن اصفهان', notes: 'سطح کمی زرد ولی بدون پوسیدگی؛ قابل پذیرش.', attachmentName: 'qc-milgerd18.jpg', itemStatus: 'conditional', savedAt: '2025-03-26T10:50:00.000Z' } } }),
  o({ id: 8, yy: 5, mm: 1, dd: 5, serial: 8, customerId: 8, customer: 'بازرگانی آذر', assignee: 'سارا موسوی', itemCount: 1, amountRial: 980_000_000, stageId: 7, status: ORDER_TABS.SUCCESS, registeredDate: '۱۴۰۴/۰۱/۰۵', registeredTime: '۰۹:۵۰', items: [{ name: 'پروفیل Z', qty: 1 }] }),
  o({ id: 9, yy: 4, mm: 12, dd: 28, serial: 12, customerId: 1, customer: 'فولاد پارس', assignee: 'علی رضایی', itemCount: 2, amountRial: 2_750_000_000, stageId: 8, status: ORDER_TABS.SUCCESS, registeredDate: '۱۴۰۳/۱۲/۲۸', registeredTime: '۱۵:۱۰', items: [{ name: 'ورق ۸mm', qty: 2 }] }),
  o({ id: 10, yy: 4, mm: 12, dd: 20, serial: 8, customerId: 5, customer: 'ذوب آهن اصفهان', assignee: 'فاطمه رحیمی', itemCount: 5, amountRial: 6_200_000_000, stageId: 8, status: ORDER_TABS.SUCCESS, registeredDate: '۱۴۰۳/۱۲/۲۰', registeredTime: '۱۱:۳۰', items: [{ name: 'میلگرد ۱۶', qty: 5 }] }),
  o({ id: 11, yy: 4, mm: 12, dd: 15, serial: 5, customerId: 6, customer: 'فولاد مبارکه', assignee: 'امیر صادقی', itemCount: 3, amountRial: 4_100_000_000, stageId: 8, status: ORDER_TABS.SUCCESS, registeredDate: '۱۴۰۳/۱۲/۱۵', registeredTime: '۰۸:۰۰', items: [{ name: 'تیرآهن IPE ۱۴۰', qty: 3 }] }),
  o({ id: 12, yy: 4, mm: 12, dd: 10, serial: 3, customerId: 2, customer: 'صنایع فلزی کرمان', assignee: 'حسین کریمی', itemCount: 6, amountRial: 8_400_000_000, stageId: 7, status: ORDER_TABS.SUCCESS, registeredDate: '۱۴۰۳/۱۲/۱۰', registeredTime: '۱۴:۲۵', items: [{ name: 'لوله مانیسمان', qty: 6 }] }),
  o({ id: 13, yy: 4, mm: 12, dd: 5, serial: 1, customerId: 8, customer: 'بازرگانی آذر', assignee: 'سارا موسوی', itemCount: 2, amountRial: 1_450_000_000, stageId: 5, status: ORDER_TABS.SUCCESS, registeredDate: '۱۴۰۳/۱۲/۰۵', registeredTime: '۱۰:۱۵', parvaneDriverNotes: 'اولویت تحویل در انبار تهران', gatewayDecision: { outcome: 'success', paymentType: 'پیش‌پرداخت' }, quoting: { marginMode: 'order_fixed_percent', orderMarginValue: '4', lineMargins: {} }, items: [{ name: 'نبشی ۶', qty: 3, description: 'استاندارد ۶۰×۶', unit: 'تن', targetInquiryId: 1301, inquiries: [{ id: 1301, supplyType: 'رسمی', supplierId: 5, unitPrice: 42_000_000, status: 'finalized', registeredAt: '۱۴۰۳/۱۲/۰۴ · ۱۱:۰۰', registeredBy: 'سارا موسوی', notes: '' }] }, { name: 'ورق ۸mm', qty: 1, description: 'سیاه', unit: 'تن', targetInquiryId: 1302, inquiries: [{ id: 1302, supplyType: 'رسمی', supplierId: 6, unitPrice: 38_500_000, status: 'finalized', registeredAt: '۱۴۰۳/۱۲/۰۴ · ۱۲:۰۰', registeredBy: 'سارا موسوی', notes: '' }] }] }),
  o({ id: 14, yy: 4, mm: 11, dd: 20, serial: 4, customerId: 3, customer: 'علی رضایی', assignee: 'مریم احمدی', itemCount: 2, amountRial: 2_100_000_000, stageId: 2, status: ORDER_TABS.FAILED, registeredDate: '۱۴۰۳/۱۱/۲۰', registeredTime: '۱۲:۰۰', failReason: 'انصراف مشتری', items: [{ name: 'ورق سیاه ۱۰mm', qty: 2 }] }),
  o({ id: 15, yy: 4, mm: 11, dd: 15, serial: 2, customerId: 1, customer: 'فولاد پارس', assignee: 'علی رضایی', itemCount: 1, amountRial: 1_800_000_000, stageId: 1, status: ORDER_TABS.FAILED, registeredDate: '۱۴۰۳/۱۱/۱۵', registeredTime: '۰۹:۲۰', failReason: 'عدم تأمین', items: [{ name: 'میلگرد ۱۲', qty: 1 }] }),
  o({ id: 16, yy: 4, mm: 11, dd: 8, serial: 1, customerId: 4, customer: 'مریم احمدی', assignee: 'رضا نوری', itemCount: 1, amountRial: 950_000_000, stageId: 3, status: ORDER_TABS.FAILED, registeredDate: '۱۴۰۳/۱۱/۰۸', registeredTime: '۱۶:۴۰', failReason: 'توقف مذاکره', items: [{ name: 'تیرآهن ۱۲', qty: 1 }] }),
];
