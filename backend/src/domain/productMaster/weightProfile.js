/**
 * Weight Calculation Profile validation (DDL-24e). Backend-authoritative
 * metadata shape check only — no Nabz transaction-weight computation here
 * (future Nabz rule: ACTUAL transaction weight overrides theoretical weight,
 * documented in Docs/architecture/product-master-nabz-future-contract.md, not implemented).
 */
import { z } from 'zod';
import { validationError } from '../../lib/errors.js';

const coefficientSchemas = {
  FIXED: z.object({
    weightPerUnit: z.number().positive(),
    uomCode: z.string().min(1).optional(),
  }),
  PER_LENGTH: z.object({
    weightPerMeter: z.number().positive(),
  }),
  DIMENSIONAL: z.object({
    densityKgPerM3: z.number().positive().optional(),
    formula: z.enum(['THICKNESS_WIDTH_LENGTH_DENSITY', 'CUSTOM']).default('THICKNESS_WIDTH_LENGTH_DENSITY'),
  }),
  MANUAL_ACTUAL: z.object({}).passthrough(),
};

export const WEIGHT_PROFILE_TYPES = Object.keys(coefficientSchemas);

export function validateWeightProfile(type, coefficients) {
  const schema = coefficientSchemas[type];
  if (!schema) {
    throw validationError('نوع پروفایل وزن نامعتبر است.', { type });
  }
  const parsed = schema.safeParse(coefficients || {});
  if (!parsed.success) {
    throw validationError('ضرایب پروفایل وزن با نوع انتخاب‌شده همخوانی ندارد.', parsed.error.flatten());
  }
  return parsed.data;
}
