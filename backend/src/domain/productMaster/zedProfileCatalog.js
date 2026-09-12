/**
 * Z-purlin (پروفیل زد) identity catalog.
 * Operator schema: height + thickness are required PRODUCT identity.
 * Length stays TRANSACTION (Type default 6 m) and is not stored on the Product.
 */

export const ZED_PROFILE_TYPE_NAME = 'پروفیل زد';

export const ZED_PROFILE_HEIGHTS = Object.freeze([160, 180, 200, 220]);

export const ZED_PROFILE_THICKNESSES = Object.freeze([2, 2.5, 3]);

export const ZED_PROFILE_MILL_LENGTH = 6;

export function zedProfileIdentityRows() {
  return ZED_PROFILE_THICKNESSES.flatMap((thickness) => (
    ZED_PROFILE_HEIGHTS.map((height) => Object.freeze({ height, thickness }))
  ));
}

export function zedProfileDisplayNameRule({ heightId, thicknessId, lengthId }) {
  return {
    separator: ' ',
    tokens: [
      { order: 0, sourceType: 'type', includeLabel: false },
      { order: 1, sourceType: 'attribute', attributeId: heightId, includeUnit: true, includeLabel: true },
      { order: 2, sourceType: 'attribute', attributeId: thicknessId, includeUnit: true, includeLabel: true },
      { order: 3, literalId: 'branch', sourceType: 'literal' },
      ...(lengthId
        ? [{ order: 4, sourceType: 'attribute', attributeId: lengthId, includeUnit: true, includeLabel: false }]
        : []),
    ],
  };
}

export default {
  ZED_PROFILE_TYPE_NAME,
  ZED_PROFILE_HEIGHTS,
  ZED_PROFILE_THICKNESSES,
  ZED_PROFILE_MILL_LENGTH,
  zedProfileIdentityRows,
  zedProfileDisplayNameRule,
};
