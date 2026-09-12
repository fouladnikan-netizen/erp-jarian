/**
 * Channel (ناودانی) identity catalog.
 * Operator schema: size + kind are required PRODUCT identity.
 * Kind subset is معمولی / سبک / هم وزن اروپا (not latin plain/light/europe).
 * معمولی is stored as identity but omitted from the display name.
 * Length stays TRANSACTION (Type default 6 m) and is not stored on the Product.
 */

export const CHANNEL_TYPE_NAME = 'ناودانی';

export const CHANNEL_KINDS = Object.freeze(['معمولی', 'سبک', 'هم وزن اروپا']);

export const CHANNEL_SIZES = Object.freeze([6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);

export function channelIdentityRows() {
  return CHANNEL_KINDS.flatMap((kind) => (
    CHANNEL_SIZES.map((size) => Object.freeze({ kind, size }))
  ));
}

export default {
  CHANNEL_TYPE_NAME,
  CHANNEL_KINDS,
  CHANNEL_SIZES,
  channelIdentityRows,
};
