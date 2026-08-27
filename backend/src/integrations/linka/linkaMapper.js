/**
 * Anti-corruption mapper: Linka CompanyBaseInfo envelope → CompanyIdentityDto.
 * Contract verified 2026-08-27.
 */
import { z } from 'zod';
import { identitySuccess, identityFailure } from '../../domain/companyIdentity/companyIdentityDto.js';
import { COMPANY_IDENTITY_ERRORS } from './linkaErrors.js';

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();

export const linkaCompanyDataSchema = z.object({
  nationalCode: z.union([z.string(), z.number()]),
  name: z.string().min(1),
  registerNumber: nullableString,
  registerDate: nullableString,
  companyTypeId: nullableNumber,
  companyTypeDescription: nullableString,
  companyRegistrationUnitId: nullableNumber,
  companyRegistrationUnitDescription: nullableString,
  bourseSymbol: nullableString,
  companyStateId: nullableNumber,
  companyStateDescription: nullableString,
  tagTypeId: nullableNumber,
  tagTypeDescription: nullableString,
  totalStock: nullableNumber,
  companySizeId: nullableNumber,
  companySizeDescription: nullableString,
  breakupDate: nullableString,
  provinceId: nullableNumber,
  provinceTitle: nullableString,
  cityId: nullableNumber,
  cityTitle: nullableString,
  address: nullableString,
  postalCode: nullableString,
  lat: nullableNumber,
  long: nullableNumber,
  activityDescription: nullableString,
  signatureAuthority: nullableString,
  economicCode: nullableString,
  companyRegistrationOrganId: nullableNumber,
  companyRegistrationOrganDescription: nullableString,
}).passthrough();

export const linkaEnvelopeSchema = z.object({
  success: z.boolean(),
  errors: z.array(z.object({
    code: z.union([z.number(), z.string()]).optional(),
    message: z.string().optional(),
  }).passthrough()).optional().nullable(),
  data: linkaCompanyDataSchema.nullable().optional(),
});

/**
 * @param {unknown} raw — full Linka envelope { success, errors, data }
 * @param {{ nationalId: string, companyName?: string|null }} context
 */
export function mapLinkaResponse(raw, context) {
  const envelope = linkaEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    return identityFailure(
      COMPANY_IDENTITY_ERRORS.INVALID_RESPONSE,
      'پاسخ سرویس استعلام نامعتبر بود.',
      { issues: envelope.error.flatten() },
    );
  }

  if (envelope.data.success !== true || !envelope.data.data) {
    const first = envelope.data.errors?.[0];
    return identityFailure(
      COMPANY_IDENTITY_ERRORS.NOT_FOUND,
      'شرکتی با این شناسه ملی در سرویس اطلاعات شرکت‌ها پیدا نشد.',
      { providerCode: first?.code ?? null },
    );
  }

  const data = envelope.data.data;
  const nationalId = String(data.nationalCode ?? context.nationalId ?? '').replace(/\D/g, '');
  const name = String(data.name || context.companyName || '').trim();

  if (!nationalId || nationalId.length !== 11) {
    return identityFailure(
      COMPANY_IDENTITY_ERRORS.INVALID_RESPONSE,
      'شناسه ملی در پاسخ سرویس یافت نشد.',
    );
  }
  if (!name) {
    return identityFailure(
      COMPANY_IDENTITY_ERRORS.INVALID_RESPONSE,
      'نام شرکت در پاسخ سرویس یافت نشد.',
    );
  }

  return identitySuccess({
    nationalId,
    name,
    registrationNumber: data.registerNumber != null ? String(data.registerNumber) : null,
    registrationDate: data.registerDate != null ? String(data.registerDate) : null,
    companyType: data.companyTypeDescription != null ? String(data.companyTypeDescription) : null,
    companyTypeProviderId: data.companyTypeId ?? null,
    legalStatus: data.companyStateDescription != null ? String(data.companyStateDescription) : null,
    registeredCapital: data.totalStock ?? null,
    province: data.provinceTitle != null ? String(data.provinceTitle) : null,
    city: data.cityTitle != null ? String(data.cityTitle) : null,
    address: data.address != null ? String(data.address) : null,
    postalCode: data.postalCode != null ? String(data.postalCode) : null,
    activityDomain: data.activityDescription != null ? String(data.activityDescription) : null,
    signatureAuthority: data.signatureAuthority != null ? String(data.signatureAuthority) : null,
    economicCode: data.economicCode != null ? String(data.economicCode) : null,
    rawProviderReference: 'LINKA',
    providerMeta: {
      companyRegistrationUnitId: data.companyRegistrationUnitId ?? null,
      companyRegistrationUnitDescription: data.companyRegistrationUnitDescription ?? null,
      companyRegistrationOrganId: data.companyRegistrationOrganId ?? null,
      companyRegistrationOrganDescription: data.companyRegistrationOrganDescription ?? null,
      tagTypeId: data.tagTypeId ?? null,
      tagTypeDescription: data.tagTypeDescription ?? null,
      companyStateId: data.companyStateId ?? null,
      companySizeId: data.companySizeId ?? null,
      companySizeDescription: data.companySizeDescription ?? null,
      bourseSymbol: data.bourseSymbol ?? null,
      breakupDate: data.breakupDate ?? null,
      lat: data.lat ?? null,
      long: data.long ?? null,
      provinceId: data.provinceId ?? null,
      cityId: data.cityId ?? null,
    },
  });
}

export default {
  mapLinkaResponse,
  linkaEnvelopeSchema,
  linkaCompanyDataSchema,
  /** @deprecated use linkaEnvelopeSchema / linkaCompanyDataSchema */
  linkaRawResponseSchema: linkaCompanyDataSchema,
};
