/** شرکت‌های باربری — تا زمان اتصال به تنظیمات کانون */
const CARRIERS = [
  {
    id: 'cr-sepehr',
    name: 'باربری سپهر تهران',
    phone: '021-44556677',
    address: 'تهران، شهرک صنعتی، بلوار باربری',
  },
  {
    id: 'cr-rail',
    name: 'حمل قطار ریلی',
    phone: '021-33445566',
    address: 'تهران، ایستگاه راه‌آهن',
  },
  {
    id: 'cr-niro',
    name: 'باربری نیروی شرق',
    phone: '031-33221100',
    address: 'اصفهان، جاده ذوب‌آهن',
  },
];

export function listCarriers() {
  return CARRIERS;
}

export function getCarrierById(id) {
  return CARRIERS.find((carrier) => carrier.id === id) || null;
}
