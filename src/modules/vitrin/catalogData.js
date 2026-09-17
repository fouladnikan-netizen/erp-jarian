import { formatProductCode } from './productCode';
import { formatProductDisplayText } from '../../domain/productMaster/productDisplayText';

/**
 * Frozen, static, synchronously-importable compatibility shim (DDL-24a).
 *
 * The real Product Master (taxonomy + Product/SKU) now lives in the backend
 * — Shirazeh owns `product_groups`/`product_categories`/`product_types`,
 * Vitrin owns `products` — served via `/api/v1/product-taxonomy` and
 * `/api/v1/products` (see `src/api/repositories/ProductTaxonomyRepository.js`
 * / `ProductRepository.js`). The current Vitrin UI reads that real API.
 *
 * This file stays exactly as it was, in the exact legacy shape, ONLY because
 * `src/modules/nabz/vitrinCategories.js` (frozen — Nabz must not be modified)
 * imports `initialGroups`/`initialProducts` via a top-level, synchronous ES
 * import. A synchronous import cannot `await` a real network fetch, so this
 * module cannot be turned into a real API-backed module without editing
 * Nabz. `src/modules/kanoon/supplierCapabilities.js` uses the same shape for
 * read-only capability-tag suggestions.
 *
 * Do NOT add new taxonomy/products here — new Product Master data lives only
 * in the real backend tables. Do NOT delete this file while Nabz's product
 * picker still imports it. See `Docs/architecture/product-master-nabz-future-contract.md`
 * and DDL-24(a) in `Docs/architecture/DOMAIN_DECISION_LOG.md`.
 */

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
  },
];

export const initialProducts = productSeed.map((p) => ({
  ...p,
  title: formatProductDisplayText(p.title),
  description: formatProductDisplayText(p.description),
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
