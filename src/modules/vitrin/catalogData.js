import { formatProductCode } from './productCode';

export const initialGroups = [
  {
    id: 1,
    name: 'میلگرد',
    subgroups: [
      { id: 1, name: 'میلگرد آجدار' },
      { id: 2, name: 'میلگرد ساده' },
    ],
  },
  {
    id: 2,
    name: 'ورق',
    subgroups: [
      { id: 1, name: 'ورق سیاه' },
      { id: 2, name: 'ورق گالوانیزه' },
    ],
  },
  {
    id: 3,
    name: 'لوله',
    subgroups: [
      { id: 1, name: 'لوله مانیسمان' },
      { id: 2, name: 'لوله درزدار' },
    ],
  },
  {
    id: 4,
    name: 'تیرآهن',
    subgroups: [{ id: 1, name: 'تیرآهن IPE' }],
  },
];

const productSeed = [
  {
    id: 1,
    groupId: 1,
    subgroupId: 1,
    serial: 1,
    title: 'میلگرد آجدار سایز ۱۴',
    description: 'میلگرد آجدار A3 سایز ۱۴ برای سازه‌های بتنی',
    unit: 'تن',
    isActive: true,
    specs: {
      size: 'Φ14',
      thickness: '—',
      unitWeight: '۱.۲۱ کیلوگرم بر متر',
      standards: ['DIN', 'ISIRI'],
    },
    relatedOrders: [
      { id: 'JR050112001', customer: 'فولاد پارس', stage: 'مظنه', registeredAt: '۱۴۰۴/۰۱/۱۲' },
      { id: 'JR050111002', customer: 'صنایع فلزی کرمان', stage: 'پیش‌کش', registeredAt: '۱۴۰۴/۰۱/۱۱' },
    ],
  },
  {
    id: 2,
    groupId: 1,
    subgroupId: 1,
    serial: 2,
    title: 'میلگرد آجدار سایز ۱۶',
    description: 'میلگرد آجدار A3 سایز ۱۶',
    unit: 'تن',
    isActive: true,
    specs: {
      size: 'Φ16',
      thickness: '—',
      unitWeight: '۱.۵۸ کیلوگرم بر متر',
      standards: ['ASTM', 'ISIRI'],
    },
    relatedOrders: [{ id: 'JR041120004', customer: 'بازرگانی آذر', stage: 'کاوش', registeredAt: '۱۴۰۳/۱۱/۲۰' }],
  },
  {
    id: 3,
    groupId: 2,
    subgroupId: 1,
    serial: 1,
    title: 'ورق سیاه ۶ میلی‌متر',
    description: 'ورق سیاه ST37 ضخامت ۶mm',
    unit: 'تن',
    isActive: true,
    specs: {
      size: '۲۰۰۰×۱۰۰۰',
      thickness: '۶ mm',
      unitWeight: '۴۷.۱ کیلوگرم بر متر مربع',
      standards: ['DIN', 'ASTM'],
    },
    relatedOrders: [
      { id: 'JR050109004', customer: 'علی رضایی', stage: 'پیش‌کش', registeredAt: '۱۴۰۴/۰۱/۰۸' },
    ],
  },
  {
    id: 4,
    groupId: 2,
    subgroupId: 2,
    serial: 1,
    title: 'ورق گالوانیزه ۲ میلی‌متر',
    description: 'ورق گالوانیزه روغنی ضخامت ۲mm',
    unit: 'تن',
    isActive: true,
    specs: {
      size: '۲۵۰۰×۱۲۵۰',
      thickness: '۲ mm',
      unitWeight: '۱۵.۷ کیلوگرم بر متر مربع',
      standards: ['EN'],
    },
    relatedOrders: [],
  },
  {
    id: 5,
    groupId: 3,
    subgroupId: 1,
    serial: 1,
    title: 'لوله مانیسمان ۸ اینچ',
    description: 'لوله مانیسمان بدون درز Schedule 40',
    unit: 'متر',
    isActive: true,
    specs: {
      size: '۸ اینچ',
      thickness: '۸.۱۸ mm',
      unitWeight: '۵۰.۵ کیلوگرم بر متر',
      standards: ['ASTM A106'],
    },
    relatedOrders: [{ id: 'JR041220008', customer: 'ذوب آهن اصفهان', stage: 'سرانجام', registeredAt: '۱۴۰۳/۱۲/۲۰' }],
  },
  {
    id: 6,
    groupId: 4,
    subgroupId: 1,
    serial: 1,
    title: 'تیرآهن IPE ۱۶۰',
    description: 'تیرآهن IPE سایز ۱۶۰',
    unit: 'شاخه',
    isActive: false,
    specs: {
      size: 'IPE160',
      thickness: '—',
      unitWeight: '۱۵.۸ کیلوگرم بر متر',
      standards: ['EN', 'DIN'],
    },
    relatedOrders: [],
  },
];

export const initialProducts = productSeed.map((p) => ({
  ...p,
  code: formatProductCode(p.groupId, p.subgroupId, p.serial),
}));

/** Suppliers from Kanoon with matching product groups (test cross-module data). */
export const relatedSuppliersByGroup = {
  میلگرد: [
    { name: 'ذوب آهن اصفهان', type: 'تولیدکننده', assignee: 'فاطمه رحیمی' },
    { name: 'فولاد مبارکه', type: 'تولیدکننده', assignee: 'امیر صادقی' },
  ],
  ورق: [
    { name: 'فولاد مبارکه', type: 'تولیدکننده', assignee: 'امیر صادقی' },
    { name: 'ذوب آهن اصفهان', type: 'تولیدکننده', assignee: 'فاطمه رحیمی' },
  ],
  لوله: [{ name: 'سارا موسوی', type: 'واسطه‌گر', assignee: 'سارا موسوی' }],
  تیرآهن: [],
};
