import { CURRENT_USER } from './constants';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import { parseMoneyInput } from './orderCode';

function stamp() {
  return `${getTodayJalali()} · ${getNowTimeFa()}`;
}

const SAMPLE_SUPPLY_DOCS = [
  {
    id: 1,
    title: 'مجوز تأمین رسمی',
    fileName: 'parvane-tamin-1404.pdf',
    uploadedAt: '۱۴۰۴/۰۱/۰۹ · ۱۰:۳۰',
    uploadedBy: 'امیر صادقی',
    status: 'تأیید‌شده',
  },
  {
    id: 2,
    title: 'نامه معرفی به انبار',
    fileName: 'warehouse-intro.docx',
    uploadedAt: '۱۴۰۴/۰۱/۱۰ · ۱۴:۱۵',
    uploadedBy: 'فاطمه رحیمی',
    status: 'در انتظار بررسی',
  },
];

const SAMPLE_FREIGHT_RECORDS = [
  {
    id: 1,
    carrier: 'باربری سپهر تهران',
    plate: '۱۲ ب ۳۴۵ ایران ۶۶',
    driver: 'رضا کریمی',
    departedAt: '۱۴۰۴/۰۱/۱۱ · ۰۸:۰۰',
    destination: 'انبار مشتری — کرمان',
    status: 'در مسیر',
  },
  {
    id: 2,
    carrier: 'حمل قطار ریلی',
    plate: 'واگن ۴۸۲۱',
    driver: '—',
    departedAt: '۱۴۰۳/۱۲/۲۵ · ۱۶:۴۰',
    destination: 'ایستگاه اصفهان',
    status: 'تحویل‌شده',
  },
];

const SAMPLE_FINANCE_RECORDS = [
  {
    id: 1,
    type: 'پیش‌دریافت',
    amountRial: 1_200_000_000,
    method: 'حواله بانکی',
    at: '۱۴۰۴/۰۱/۰۸ · ۱۱:۲۰',
    reference: 'TRX-88421',
    status: 'ثبت‌شده',
  },
  {
    id: 2,
    type: 'تسویه نهایی',
    amountRial: 2_400_000_000,
    method: 'چک',
    at: '۱۴۰۳/۱۲/۲۸ · ۰۹:۴۵',
    reference: 'CHK-99210',
    status: 'در انتظار وصول',
  },
];

export function getOrderSupplyDocs(order) {
  if (order.operationalRecords?.supplyDocs?.length) {
    return order.operationalRecords.supplyDocs;
  }
  return SAMPLE_SUPPLY_DOCS;
}

export function getOrderFreightRecords(order) {
  if (order.operationalRecords?.freight?.length) {
    return order.operationalRecords.freight;
  }
  return SAMPLE_FREIGHT_RECORDS;
}

export function getOrderFinanceRecords(order) {
  if (order.operationalRecords?.finance?.length) {
    return order.operationalRecords.finance;
  }
  return SAMPLE_FINANCE_RECORDS;
}

export function appendSupplyDoc(order, { title, fileName }) {
  const entry = {
    id: Date.now(),
    title: title.trim(),
    fileName: fileName.trim() || 'سند-جدید.pdf',
    uploadedAt: stamp(),
    uploadedBy: CURRENT_USER,
    status: 'در انتظار بررسی',
  };
  return {
    ...order,
    operationalRecords: {
      ...order.operationalRecords,
      supplyDocs: [...getOrderSupplyDocs(order), entry],
    },
    events: [
      ...(order.events || []),
      {
        id: Date.now(),
        type: 'supply_doc_added',
        at: entry.uploadedAt,
        by: CURRENT_USER,
        summary: `ثبت سند تأمین: ${entry.title}`,
      },
    ],
  };
}

export function appendFreightRecord(order, { carrier, plate, destination }) {
  const entry = {
    id: Date.now(),
    carrier: carrier.trim(),
    plate: plate.trim(),
    driver: '—',
    departedAt: stamp(),
    destination: destination.trim(),
    status: 'برنامه‌ریزی‌شده',
  };
  return {
    ...order,
    operationalRecords: {
      ...order.operationalRecords,
      freight: [...getOrderFreightRecords(order), entry],
    },
    events: [
      ...(order.events || []),
      {
        id: Date.now(),
        type: 'freight_record_added',
        at: entry.departedAt,
        by: CURRENT_USER,
        summary: `ثبت باربری: ${entry.carrier}`,
      },
    ],
  };
}

export function appendFinanceRecord(order, { type, amountRial, method, reference }) {
  const entry = {
    id: Date.now(),
    type: type.trim(),
    amountRial: parseMoneyInput(amountRial) || 0,
    method: method.trim(),
    at: stamp(),
    reference: reference.trim(),
    status: 'ثبت‌شده',
  };
  return {
    ...order,
    operationalRecords: {
      ...order.operationalRecords,
      finance: [...getOrderFinanceRecords(order), entry],
    },
    events: [
      ...(order.events || []),
      {
        id: Date.now(),
        type: 'finance_record_added',
        at: entry.at,
        by: CURRENT_USER,
        summary: `ثبت سابقه مالی: ${entry.type}`,
      },
    ],
  };
}
