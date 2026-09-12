/**
 * Steel mesh / wire-netting identity catalog.
 * Four mill Types under مفتول: جوشی، حصاری، مرغی، مش ساختمانی.
 * Operator schema: mesh_size (چشمه، سانتی‌متر) + size (قطر مفتول / سایز میلگرد، میل)
 * are required PRODUCT identity. Height stays off identity.
 */

export const STEEL_MESH_GROUP_NAME = 'مقاطع فولادی';
export const STEEL_MESH_CATEGORY_NAME = 'مفتول و محصولات مفتولی';

export const STEEL_MESH_TYPES = Object.freeze([
  Object.freeze({
    name: 'توری جوشی',
    nameLatin: 'Welded Wire Mesh',
    skuCode: 'WM',
    legacyNames: Object.freeze(['توری فولادی']),
    openingsCm: Object.freeze([5, 7.5, 10]),
    wireMm: Object.freeze([2, 2.5, 3, 4]),
  }),
  Object.freeze({
    name: 'توری حصاری',
    nameLatin: 'Fence Mesh',
    skuCode: 'FN',
    legacyNames: Object.freeze([]),
    openingsCm: Object.freeze([5, 6, 7]),
    wireMm: Object.freeze([2, 2.5, 3]),
  }),
  Object.freeze({
    name: 'توری مرغی',
    nameLatin: 'Hexagonal Mesh',
    skuCode: 'HX',
    legacyNames: Object.freeze([]),
    openingsCm: Object.freeze([1.3, 1.9, 2.5]),
    wireMm: Object.freeze([0.7, 0.9]),
  }),
  Object.freeze({
    name: 'مش جوشی ساختمانی',
    nameLatin: 'Reinforcing Mesh',
    skuCode: 'RM',
    legacyNames: Object.freeze([]),
    openingsCm: Object.freeze([10, 15, 20]),
    wireMm: Object.freeze([6, 8, 10]),
  }),
]);

export function steelMeshIdentityRows(typeSpec) {
  return typeSpec.openingsCm.flatMap((meshSize) => (
    typeSpec.wireMm.map((size) => Object.freeze({ meshSize, size }))
  ));
}

export function steelMeshDisplayNameRule({ meshSizeId, sizeId }) {
  return {
    separator: ' ',
    tokens: [
      { sourceType: 'type', includeLabel: false },
      { sourceType: 'attribute', attributeId: meshSizeId, includeLabel: true, includeUnit: false },
      { sourceType: 'attribute', attributeId: sizeId, includeLabel: true, includeUnit: true },
    ],
  };
}

export default {
  STEEL_MESH_GROUP_NAME,
  STEEL_MESH_CATEGORY_NAME,
  STEEL_MESH_TYPES,
  steelMeshIdentityRows,
  steelMeshDisplayNameRule,
};
