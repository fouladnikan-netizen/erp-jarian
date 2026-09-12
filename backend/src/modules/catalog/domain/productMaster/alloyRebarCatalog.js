/**
 * Alloy rebar (میلگرد آلیاژی) identity catalog.
 * Operator rule: only grade is Product identity (required PRODUCT ENUM).
 * Size is not identity and is not stored on the Product.
 */

export const ALLOY_REBAR_TYPE_NAME = 'میلگرد آلیاژی';
export const ALLOY_REBAR_GROUP_NAME = 'مقاطع فولادی';

export const ALLOY_REBAR_GRADES = Object.freeze([
  '1.5714',
  '1.7131',
  'Ck15',
  'Ck45',
  'Ck60',
  'Ck75',
  'Mo40',
  'ST52-3',
  'VCN150',
  'VCN200',
  '1.251',
  'ST37-2',
  '1.2344',
]);

export function alloyRebarIdentityRows() {
  return ALLOY_REBAR_GRADES.map((grade) => Object.freeze({ grade }));
}

export default {
  ALLOY_REBAR_TYPE_NAME,
  ALLOY_REBAR_GROUP_NAME,
  ALLOY_REBAR_GRADES,
  alloyRebarIdentityRows,
};
