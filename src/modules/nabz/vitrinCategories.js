import { initialGroups, initialProducts } from '../vitrin/catalogData';

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

const SUBGROUP_LOOKUP = new Map(
  initialGroups.flatMap((group) => group.subgroups.map((sub) => [
    `${group.id}:${sub.id}`,
    sub.name,
  ])),
);

export function getProductCategoryName(product) {
  return GROUP_ID_TO_NAME[product.groupId] || null;
}

export function getProductSubcategoryName(product) {
  return SUBGROUP_LOOKUP.get(`${product.groupId}:${product.subgroupId}`) || null;
}

export function productMatchesCategory(product, category) {
  return getProductCategoryName(product) === category;
}

export function listSubcategoriesForMain(mainCategory) {
  const group = initialGroups.find((item) => item.name === mainCategory);
  return group?.subgroups.map((sub) => sub.name) || [];
}

export function productMatchesSubcategory(product, mainCategory, subCategory) {
  if (!productMatchesCategory(product, mainCategory)) return false;
  if (!subCategory) return true;
  return getProductSubcategoryName(product) === subCategory;
}

export function filterPickerProducts({ mainCategory, subCategory, query }) {
  const q = (query || '').trim().toLowerCase();
  return initialProducts
    .filter((product) => product.isActive !== false)
    .filter((product) => {
      if (q) return true;
      return productMatchesSubcategory(product, mainCategory, subCategory);
    })
    .filter((product) => {
      if (!q) return true;
      const haystack = [product.title, product.description, product.unit, getProductSubcategoryName(product)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
}
