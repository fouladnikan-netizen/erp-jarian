/**
 * Shared Zod helpers for JSONB / bag payloads.
 *
 * Prefer a named object schema with known keys.
 * Use `jsonRecord` only as a documented escape hatch when the bag is still
 * a fat evolving document (Order payload) or EAV-like values (attributes).
 *
 * Never introduce `z.record(z.any())` / `z.any()` on core write schemas.
 */
import { z } from 'zod';

export const jsonPrimitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const jsonValue = z.lazy(() =>
  z.union([jsonPrimitive, z.array(jsonValue), z.record(z.string(), jsonValue)]),
);

/** Escape hatch: string-keyed JSON object. Not a second domain model. */
export const jsonRecord = z.record(z.string(), jsonValue);

/** Product attribute cells: scalar or list of scalars — not arbitrary objects. */
export const attributeValueScalar = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string(), z.number()])),
]);

export const attributeValueRecord = z.record(z.string(), attributeValueScalar);

export const weightCoefficientRecord = z.record(
  z.string(),
  z.union([z.number(), z.string(), z.null()]),
);
