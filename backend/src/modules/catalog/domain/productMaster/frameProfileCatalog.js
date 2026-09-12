/**
 * Door-frame profile (پروفیل چهارچوب) identity catalog.
 * Live Type only had thickness + a stub dimensions ENUM + TRANSACTION length.
 * Model is required PRODUCT identity. Mill bar length is stored on the Product
 * (PRODUCT) because this Type has two mill lengths (6 m and 6.6 m) and a
 * single TRANSACTION Type default cannot express both (DDL-55).
 */

export const FRAME_PROFILE_TYPE_NAME = 'پروفیل چهارچوب';
export const FRAME_PROFILE_MODEL_CODE = 'kind';

/** Seed-time latin codes → operator Persian ENUM values (display name looks up by stored value). */
export const FRAME_PROFILE_MODEL_ALIASES = Object.freeze({
  tee507: 'سپری 507',
  leaf508: 'لنگه دری 508',
  klaf509: 'کلافی 509',
  french: 'چهارچوب فرانسوی',
  simple: 'چهارچوب ساده',
  roman: 'چهارچوب رومی',
  mexican: 'چهارچوب مکزیکی',
});

export const FRAME_PROFILE_MODELS = Object.freeze([
  Object.freeze({
    value: 'سپری 507',
    labelFa: 'سپری 507',
    millLength: 6,
    thicknesses: Object.freeze([1.5, 2, 2.5]),
  }),
  Object.freeze({
    value: 'لنگه دری 508',
    labelFa: 'لنگه دری 508',
    millLength: 6,
    thicknesses: Object.freeze([1.5, 2, 2.5]),
  }),
  Object.freeze({
    value: 'کلافی 509',
    labelFa: 'کلافی 509',
    millLength: 6,
    thicknesses: Object.freeze([1.5, 2, 2.5]),
  }),
  Object.freeze({
    value: 'چهارچوب فرانسوی',
    labelFa: 'چهارچوب فرانسوی',
    millLength: 6.6,
    thicknesses: Object.freeze([2, 2.5]),
  }),
  Object.freeze({
    value: 'چهارچوب ساده',
    labelFa: 'چهارچوب ساده',
    millLength: 6.6,
    thicknesses: Object.freeze([2, 2.5]),
  }),
  Object.freeze({
    value: 'چهارچوب رومی',
    labelFa: 'چهارچوب رومی',
    millLength: 6.6,
    thicknesses: Object.freeze([2, 2.5]),
  }),
  Object.freeze({
    value: 'چهارچوب مکزیکی',
    labelFa: 'چهارچوب مکزیکی',
    millLength: 6.6,
    thicknesses: Object.freeze([2, 2.5]),
  }),
]);

export const FRAME_PROFILE_MODEL_OPTIONS = Object.freeze(
  FRAME_PROFILE_MODELS.map((item) => Object.freeze({
    value: item.value,
    labelFa: item.labelFa,
  })),
);

export function frameProfileIdentityRows() {
  return FRAME_PROFILE_MODELS.flatMap((model) => (
    model.thicknesses.map((thickness) => Object.freeze({
      model: model.value,
      thickness,
      millLength: model.millLength,
    }))
  ));
}

/**
 * Commercial names live on مدل (سپری 507 / چهارچوب رومی / …).
 * The Product Type title is «پروفیل چهارچوب»; putting sourceType `type` in the
 * rule prefixes every name with «پروفیل» even after مدل is edited.
 */
export function frameProfileDisplayNameRule({ modelId, thicknessId, lengthId }) {
  return {
    separator: ' ',
    tokens: [
      { order: 0, sourceType: 'attribute', attributeId: modelId, includeUnit: false, includeLabel: false },
      { order: 1, sourceType: 'attribute', attributeId: thicknessId, includeUnit: true, includeLabel: true },
      { order: 2, literalId: 'branch', sourceType: 'literal' },
      { order: 3, sourceType: 'attribute', attributeId: lengthId, includeUnit: true, includeLabel: false },
    ],
  };
}

export default {
  FRAME_PROFILE_TYPE_NAME,
  FRAME_PROFILE_MODEL_CODE,
  FRAME_PROFILE_MODEL_ALIASES,
  FRAME_PROFILE_MODELS,
  FRAME_PROFILE_MODEL_OPTIONS,
  frameProfileIdentityRows,
  frameProfileDisplayNameRule,
};
