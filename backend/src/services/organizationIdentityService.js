/**
 * Organization Identity use-cases — DDL-28 singleton (Shirazeh).
 */
import { z } from 'zod';
import { fromZodError, appError, notFoundError } from '../lib/errors.js';
import { writeAudit, newEntityId } from '../lib/ids.js';
import { withTransaction } from '../db/pool.js';
import * as orgIdentityRepo from '../repositories/organizationIdentityRepository.js';
import { validateLogoBytes } from '../domain/organizationIdentity/logoFile.js';
import {
  emptyToNull,
  normalizeIdentityCollections,
} from '../domain/organizationIdentity/collections.js';

export const EMPTY_ORGANIZATION_IDENTITY = Object.freeze({
  tradeName: '',
  legalName: '',
  nationalId: '',
  legalPersonType: '',
  registrationNumber: '',
  economicNumber: '',
  phones: [],
  addresses: [],
  bankAccounts: [],
  phone: '',
  email: '',
  website: '',
  fax: '',
  province: '',
  city: '',
  officialAddress: '',
  postalCode: '',
  bankName: '',
  bankAccountNumber: '',
  iban: '',
  logoFileId: null,
  logo: null,
  updatedAt: null,
  updatedBy: null,
});

const optionalText = z.string().trim().max(500).optional().nullable();

const putSchema = z.object({
  tradeName: z.string().trim().min(1, 'نام تجاری الزامی است.').max(200),
  legalName: z.string().trim().min(1, 'نام کامل حقوقی الزامی است.').max(300),
  nationalId: z.string().trim().min(1, 'شناسه ملی الزامی است.').max(32),
  registrationNumber: optionalText,
  economicNumber: optionalText,
  email: optionalText,
  website: optionalText,
  fax: optionalText,
});

function blankToNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

export async function getOrganizationIdentity() {
  const row = await orgIdentityRepo.get();
  return row || { ...EMPTY_ORGANIZATION_IDENTITY };
}

export async function putOrganizationIdentity(body, actorUserId) {
  const src = body && typeof body === 'object' ? body : {};
  const parsed = putSchema.safeParse({
    tradeName: src.tradeName,
    legalName: src.legalName,
    nationalId: src.nationalId,
    registrationNumber: blankToNull(src.registrationNumber),
    economicNumber: blankToNull(src.economicNumber),
    email: blankToNull(src.email),
    website: blankToNull(src.website),
    fax: blankToNull(src.fax),
  });
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های هویت سازمان نامعتبر است.');

  const collections = normalizeIdentityCollections(src);
  if (!collections.ok) throw appError('VALIDATION', collections.message, 400);

  const saved = await orgIdentityRepo.upsert({
    ...parsed.data,
    phone: emptyToNull(collections.primary.phone),
    province: emptyToNull(collections.primary.province),
    city: emptyToNull(collections.primary.city),
    officialAddress: emptyToNull(collections.primary.officialAddress),
    postalCode: emptyToNull(collections.primary.postalCode),
    bankName: emptyToNull(collections.primary.bankName),
    bankAccountNumber: emptyToNull(collections.primary.bankAccountNumber),
    iban: emptyToNull(collections.primary.iban),
    phones: collections.collections.phones,
    addresses: collections.collections.addresses,
    bankAccounts: collections.collections.bankAccounts,
  }, actorUserId);
  await writeAudit({
    actorUserId,
    action: 'organization_identity.upsert',
    entityType: 'organization_identity',
    entityId: orgIdentityRepo.ORG_IDENTITY_ID,
    detail: {
      tradeName: saved.tradeName,
      legalName: saved.legalName,
      nationalId: saved.nationalId,
    },
  });
  return saved;
}

const logoPutSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(100).optional().nullable(),
  dataBase64: z.string().min(1),
});

export async function getOrganizationLogo() {
  const logo = await orgIdentityRepo.getLogo();
  if (!logo) throw notFoundError('لوگوی سازمان ثبت نشده است.');
  return logo;
}

export async function putOrganizationLogo(body, actorUserId) {
  const parsed = logoPutSchema.safeParse(body && typeof body === 'object' ? body : {});
  if (!parsed.success) throw fromZodError(parsed, 'فایل لوگو نامعتبر است.');

  const identity = await orgIdentityRepo.get();
  if (!identity) {
    throw appError('IDENTITY_NOT_FOUND', 'ابتدا هویت سازمان را ذخیره کنید.', 409);
  }

  let bytes;
  try {
    bytes = Buffer.from(parsed.data.dataBase64, 'base64');
  } catch {
    throw appError('VALIDATION', 'فایل لوگو قابل خواندن نیست.', 400);
  }

  const check = validateLogoBytes({
    fileName: parsed.data.fileName,
    mimeType: parsed.data.mimeType,
    bytes,
  });
  if (!check.ok) throw appError('VALIDATION', check.message, 400);

  const logoId = newEntityId('orglogo');
  await withTransaction(async (client) => {
    const previousId = await orgIdentityRepo.readLogoFileId(client);
    await orgIdentityRepo.insertLogo({
      id: logoId,
      fileName: parsed.data.fileName,
      mimeType: check.mimeType,
      sizeBytes: check.sizeBytes,
      dataBase64: parsed.data.dataBase64,
      actorUserId,
    }, client);
    await orgIdentityRepo.pointLogo(logoId, actorUserId, client);
    if (previousId && previousId !== logoId) {
      await orgIdentityRepo.deleteLogo(previousId, client);
    }
  });

  await writeAudit({
    actorUserId,
    action: 'organization_identity.logo_replace',
    entityType: 'organization_identity',
    entityId: orgIdentityRepo.ORG_IDENTITY_ID,
    detail: { logoFileId: logoId, fileName: parsed.data.fileName, mimeType: check.mimeType },
  });

  return orgIdentityRepo.get();
}
