/** انبارها — تا زمان اتصال به تنظیمات شیرازه */
const WAREHOUSES = [
  {
    id: 'wh-tehran',
    name: 'انبار مرکزی تهران',
    address: 'تهران، شهرک صنعتی، خیابان فولاد، پلاک ۱۲',
  },
  {
    id: 'wh-isfahan',
    name: 'انبار اصفهان',
    address: 'اصفهان، منطقه صنعتی محمودآباد، انبار شماره ۳',
  },
  {
    id: 'wh-customer',
    name: 'انبار مشتری',
    address: 'تحویل در محل — آدرس طبق قرارداد',
  },
];

export function listWarehouses() {
  return WAREHOUSES;
}

export function getWarehouseById(id) {
  return WAREHOUSES.find((wh) => wh.id === id) || null;
}

export function getWarehouseAddress(id) {
  return getWarehouseById(id)?.address || '';
}
