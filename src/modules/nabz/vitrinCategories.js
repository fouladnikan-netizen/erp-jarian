import { initialGroups } from '../vitrin/catalogData';

/** هفت دستهٔ اصلی ویترین — مطابق چارچوب جریان */
export const MAIN_PRODUCT_CATEGORIES = [
  'میلگرد',
  'ورق',
  'لوله',
  'تیرآهن',
  'نبشی و ناودانی',
  'پروفیل',
  'مفتول',
];

const GROUP_ID_TO_NAME = Object.fromEntries(
  initialGroups.map((group) => [group.id, group.name]),
);

export function getProductCategoryName(product) {
  return GROUP_ID_TO_NAME[product.groupId] || null;
}

export function productMatchesCategory(product, category) {
  return getProductCategoryName(product) === category;
}
