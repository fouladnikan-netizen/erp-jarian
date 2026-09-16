/**
 * Well-casing slot style (لوله جدار چاه). Catalog for seed only —
 * PostgreSQL is SoR after apply. Offer Variant: TRANSACTION + not required.
 */

export const WELL_CASING_TYPE_NAME = 'لوله جدار چاه';

export const SLOT_TYPE_ATTRIBUTE = Object.freeze({
  code: 'slot_type',
  skuCode: 'SLOT',
  nameFa: 'نوع شیار',
  dataType: 'ENUM',
  allowedValues: Object.freeze([
    Object.freeze({ value: 'mill_slot', labelFa: 'شیار دستگاهی (فرزکاری)' }),
    Object.freeze({ value: 'johnson_slot', labelFa: 'شیار کرکره‌ای (جانزون / ژاپنی)' }),
    Object.freeze({ value: 'torch_slot', labelFa: 'شیار دستی (هوا برش)' }),
  ]),
});

export const SLOT_TYPE_BINDING = Object.freeze({
  isRequired: false,
  valueScope: 'TRANSACTION',
  sortOrder: 40,
});
