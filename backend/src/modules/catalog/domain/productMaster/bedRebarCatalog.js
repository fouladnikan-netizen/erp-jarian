/**
 * Bed joint reinforcement (میلگرد بستر) identity catalog.
 * Operator schema: kind + bed_width (ENUM) + wire size are required PRODUCT identity.
 * Length is TRANSACTION and is not listed here.
 *
 * Kind values are the Type's bound ENUM (do not invent codes).
 * Bed width is a closed 3-option ENUM (`bed_width` / عرض بستر), not DECIMAL `width`.
 * Wire size in mm (`size`).
 */

export const BED_REBAR_TYPE_NAME = 'میلگرد بستر';
export const BED_REBAR_GROUP_NAME = 'مقاطع فولادی';

export const BED_REBAR_KINDS = Object.freeze([
  'خرپایی',
  'نردبانی',
]);

export const BED_REBAR_WIDTH_OPTIONS = Object.freeze([
  Object.freeze({ value: '5.5', labelFa: '۵٫۵ سانتی‌متر' }),
  Object.freeze({ value: '11', labelFa: '۱۱ سانتی‌متر' }),
  Object.freeze({ value: '15', labelFa: '۱۵ سانتی‌متر' }),
]);

export const BED_REBAR_WIDTH_VALUES = Object.freeze(
  BED_REBAR_WIDTH_OPTIONS.map((option) => option.value),
);

export const BED_REBAR_SIZES_MM = Object.freeze([4, 4.5]);

export function bedRebarIdentityRows() {
  return BED_REBAR_KINDS.flatMap((kind) => (
    BED_REBAR_WIDTH_VALUES.flatMap((bedWidth) => (
      BED_REBAR_SIZES_MM.map((size) => Object.freeze({ kind, bedWidth, size }))
    ))
  ));
}

export default {
  BED_REBAR_TYPE_NAME,
  BED_REBAR_GROUP_NAME,
  BED_REBAR_KINDS,
  BED_REBAR_WIDTH_OPTIONS,
  BED_REBAR_WIDTH_VALUES,
  BED_REBAR_SIZES_MM,
  bedRebarIdentityRows,
};
