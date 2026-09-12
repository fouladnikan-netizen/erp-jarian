import { z } from 'zod';
import { withTransaction } from '../../../db/pool.js';
import { appError, fromZodError, notFoundError } from '../../../lib/errors.js';
import { jsonRecord } from '../../shared/schemas/jsonRecord.js';
import { newEntityId, writeAudit } from '../../../lib/ids.js';
import * as companyRepo from '../infrastructure/companyRepository.js';
import * as relationshipRepo from '../infrastructure/companyContactRelationshipRepository.js';
import { normalizeNationalId } from '../domain/companyIdentity/normalizeNationalId.js';
import { userMessageForCode } from '../../../integrations/linka/linkaErrors.js';
import { buildLegalPayloadFromIdentity } from '../domain/companyIdentity/linkaLegalFields.js';
import { enrichCompanyFromLinka } from './companyEnrichmentService.js';
import { recomputeCustomerLifecycle } from './customerLifecycleService.js';
import {
  checkCompanyDuplicates,
  assertCreatePolicy,
} from './identityMatchingService.js';
import { attachPersonsFromCompanyCreate } from './contactOrchestration.js';
import {
  CUSTOMER_LIFECYCLE,
  normalizeLifecycleKey,
} from '../domain/customerLifecycle/lifecycleKeys.js';

const createSchema = z.object({
  name: z.string().trim().min(1),
  entityType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).default('CUSTOMER'),
  nationalId: z.string().trim().optional().nullable(),
  province: z.string().trim().optional().nullable(),
  activityDomain: z.string().trim().optional().nullable(),
  lifecycleStage: z.string().trim().optional().nullable(),
  engagementStatus: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  assigneeName: z.string().trim().optional().nullable(),
  assigneeRole: z.string().trim().optional().nullable(),
  payload: z.object({
    linkaIdentity: jsonRecord.optional(),
  }).passthrough().optional(),
  relatedPersons: z.array(z.object({
    id: z.string().optional(),
    fullName: z.string().optional(),
    name: z.string().optional(),
    role: z.string().optional(),
    jobPosition: z.string().optional(),
    mobile: z.string().optional(),
    phone: z.string().optional(),
  }).passthrough()).optional(),
  confirmDuplicate: z.boolean().optional().default(false),
});

/** Strip shadow Contact/interaction fields from Company writes (DDL-26). */
function stripShadowCompanyFields(data) {
  const relatedPersons = [
    ...(Array.isArray(data.relatedPersons) ? data.relatedPersons : []),
    ...(Array.isArray(data.payload?.relatedPersons) ? data.payload.relatedPersons : []),
  ];
  const next = { ...data };
  delete next.relatedPersons;
  if (next.payload && typeof next.payload === 'object') {
    const { relatedPersons: _rp, interactions: _ix, ...cleanPayload } = next.payload;
    next.payload = cleanPayload;
  }
  return { data: next, relatedPersons };
}

const updateSchema = createSchema.partial();

const fromIdentitySchema = z.object({
  nationalId: z.string().trim().min(1),
  entityType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).default('CUSTOMER'),
  activityDomain: z.string().trim().optional().nullable(),
});

/**
 * Persist Linka-verified fields that have no dedicated Company column.
 * @deprecated Prefer buildLegalPayloadFromIdentity for create-from-identity flows.
 */
export function buildLinkaIdentityPayload(identity) {
  const { linkaIdentity } = buildLegalPayloadFromIdentity(identity);
  return linkaIdentity ? { linkaIdentity } : {};
}

export async function listCompanies(filters = {}) {
  return companyRepo.findMany(filters);
}

export async function getCompany(id, options = {}) {
  const company = await companyRepo.findById(id, options);
  if (!company) {
    throw notFoundError('شرکت یافت نشد.');
  }
  const [persons, canonicalContacts] = await Promise.all([
    companyRepo.findPersonsByCompanyId(id),
    relationshipRepo.findActiveByCompany(id).catch(() => []),
  ]);
  return {
    ...company,
    persons,
    canonicalContacts: canonicalContacts.map((r) => ({
      relationshipId: r.id,
      isPrimary: r.isPrimary,
      roleTitle: r.roleTitle,
      contact: r.contact,
    })),
  };
}

export async function createCompany(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw fromZodError(parsed, 'داده‌های شرکت نامعتبر است.');
  }

  const data = { ...parsed.data };
  const confirmDuplicate = data.confirmDuplicate;
  delete data.confirmDuplicate;
  const { data: companyData, relatedPersons } = stripShadowCompanyFields(data);

  if (companyData.nationalId) {
    const normalized = normalizeNationalId(companyData.nationalId);
    if (!normalized.ok) {
      throw appError('COMPANY_IDENTITY_INVALID_NATIONAL_ID', normalized.error, 422);
    }
    companyData.nationalId = normalized.nationalId;
    const dup = await checkCompanyDuplicates(
      { nationalId: companyData.nationalId, name: companyData.name },
      { actorUserId, audit: true, action: 'company_create_precheck' },
    );
    assertCreatePolicy('company', dup, { confirmDuplicate });
  }

  const entityType = String(companyData.entityType || 'CUSTOMER').toUpperCase();
  // Customers enter lifecycle at نوپدید; suppliers never get customer lifecycle stages.
  if (entityType === 'CUSTOMER' || entityType === 'BOTH') {
    companyData.lifecycleStage = normalizeLifecycleKey(companyData.lifecycleStage)
      || CUSTOMER_LIFECYCLE.COLD_LEAD;
    companyData.engagementStatus = companyData.engagementStatus || 'normal';
  } else if (entityType === 'SUPPLIER') {
    companyData.lifecycleStage = null;
    companyData.engagementStatus = 'normal';
  }
  const id = newEntityId('co');

  await withTransaction(async (client) => {
    if (companyData.nationalId) {
      const existing = await companyRepo.findByNationalIdForUpdate(companyData.nationalId, client);
      if (existing) {
        throw appError(
          'IDENTITY_DUPLICATE_EXACT',
          'رکورد تکراری با شناسه یکسان یافت شد — ایجاد مجاز نیست.',
          409,
          { existingId: existing.id },
        );
      }
    }
    try {
      await companyRepo.insert({ ...companyData, id, actorUserId }, client);
    } catch (err) {
      if (err?.code === '23505') {
        throw appError(
          'IDENTITY_DUPLICATE_EXACT',
          'رکورد تکراری با شناسه یکسان یافت شد — ایجاد مجاز نیست.',
          409,
        );
      }
      throw err;
    }

    if (relatedPersons.length > 0) {
      await attachPersonsFromCompanyCreate(id, relatedPersons, actorUserId, client);
    }

    await writeAudit({
      actorUserId,
      action: 'company.create',
      entityType: 'company',
      entityId: id,
      detail: { name: companyData.name, contactCount: relatedPersons.length },
    }, client);
  });

  return getCompany(id);
}

/**
 * Kanoon create via national ID → CompanyIdentityResolver (Linka) → PostgreSQL.
 * Existing Company by nationalId skips Linka and returns that row (no duplicate).
 *
 * @param {{ nationalId: string, entityType?: string, requestId?: string|null }} input
 * @param {string} actorUserId
 * @param {{ identityResolver?: typeof resolveCompanyIdentity }} [deps]
 * @returns {Promise<{ company: object, created: boolean, mode: 'existing'|'create_new' }>}
 */
export async function createCompanyFromIdentity(input, actorUserId, deps = {}) {
  const parsed = fromIdentitySchema.safeParse({
    nationalId: input.nationalId,
    entityType: input.entityType,
    activityDomain: input.activityDomain,
  });
  if (!parsed.success) {
    throw fromZodError(parsed, 'شناسه ملی الزامی است.');
  }

  const normalized = normalizeNationalId(parsed.data.nationalId);
  if (!normalized.ok) {
    throw appError(
      'COMPANY_IDENTITY_INVALID_NATIONAL_ID',
      normalized.error,
      422,
      { nationalId: normalized.nationalId },
    );
  }

  const nationalId = normalized.nationalId;
  const entityType = parsed.data.entityType || 'CUSTOMER';
  const activityDomain = String(parsed.data.activityDomain || input.activityDomain || '').trim() || null;

  if (entityType === 'CUSTOMER' && !activityDomain) {
    throw appError(
      'VALIDATION',
      'حوزه فعالیت الزامی است.',
      422,
      { field: 'activityDomain' },
    );
  }

  const existingPre = await companyRepo.findByNationalId(nationalId);
  if (existingPre) {
    const company = await getCompany(existingPre.id);
    return { company, created: false, mode: 'existing' };
  }

  const resolve = deps.identityResolver || resolveCompanyIdentity;
  const identityResult = await resolve({
    nationalId,
    requestId: input.requestId || null,
  });
  if (!identityResult?.ok) {
    throw appError(
      identityResult?.errorCode || 'COMPANY_RESOLUTION_FAILED',
      identityResult?.error || userMessageForCode(identityResult?.errorCode),
      422,
      identityResult?.details,
    );
  }

  const identity = identityResult.identity || {
    nationalId: identityResult.nationalId,
    name: identityResult.suggestedName,
  };
  if (!identity?.name) {
    throw appError(
      'COMPANY_IDENTITY_INVALID_RESPONSE',
      'نام شرکت در پاسخ استعلام یافت نشد.',
      422,
    );
  }

  let companyId = null;
  let created = false;
  let mode = 'create_new';

  await withTransaction(async (client) => {
    const existing = await companyRepo.findByNationalIdForUpdate(nationalId, client);
    if (existing) {
      companyId = existing.id;
      mode = 'existing';
      created = false;
      return;
    }

    companyId = newEntityId('co');
    created = true;
    mode = 'create_new';

    const legal = buildLegalPayloadFromIdentity(identity);

    await companyRepo.insert({
      id: companyId,
      name: identity.name,
      entityType,
      nationalId,
      province: identity.province || null,
      activityDomain,
      lifecycleStage: entityType === 'SUPPLIER' ? null : CUSTOMER_LIFECYCLE.COLD_LEAD,
      engagementStatus: 'normal',
      phone: null,
      assigneeName: null,
      assigneeRole: null,
      payload: {
        recordType: entityType === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER',
        personType: 'legal',
        crmActivityDomain: activityDomain,
        officialSpecs: legal.officialSpecs,
        governance: legal.governance,
        linkaIdentity: legal.linkaIdentity,
      },
      actorUserId,
    }, client);

    await writeAudit({
      actorUserId,
      action: 'company.create_from_identity',
      entityType: 'company',
      entityId: companyId,
      detail: {
        nationalId,
        entityType,
        mode,
        name: identity.name,
      },
    }, client);
  });

  const company = await getCompany(companyId);

  // Phase 2 enrichment after create — non-blocking for create success if partial
  if (created && companyId) {
    try {
      const enriched = await enrichCompanyFromLinka(
        { companyId, nationalId, requestId: input.requestId || null },
        actorUserId,
        deps,
      );
      return {
        company: enriched.company,
        created,
        mode,
        enrichment: {
          sections: enriched.sections,
          sectionErrors: enriched.sectionErrors,
          complete: enriched.complete,
          message: enriched.message,
        },
      };
    } catch {
      return {
        company,
        created,
        mode,
        enrichment: {
          sections: { base: 'skipped', persons: 'failed', gazette: 'failed' },
          sectionErrors: {
            base: null,
            persons: 'غنی‌سازی اشخاص پس از ایجاد ناموفق بود.',
            gazette: 'غنی‌سازی روزنامه رسمی پس از ایجاد ناموفق بود.',
          },
          complete: false,
          message: 'شرکت ایجاد شد؛ غنی‌سازی فاز ۲ کامل نشد.',
        },
      };
    }
  }

  return { company, created, mode };
}

export { enrichCompanyFromLinka };

export async function updateCompany(id, body, actorUserId) {
  const existing = await companyRepo.findById(id);
  if (!existing) {
    throw notFoundError('شرکت یافت نشد.');
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw fromZodError(parsed, 'داده‌های شرکت نامعتبر است.');
  }

  const data = { ...parsed.data };
  // Customer Lifecycle is system-controlled — clients cannot PATCH stage/engagement.
  if (data.lifecycleStage != null) {
    const next = normalizeLifecycleKey(data.lifecycleStage) || data.lifecycleStage;
    const prev = normalizeLifecycleKey(existing.lifecycleStage) || existing.lifecycleStage;
    if (next !== prev) {
      throw appError(
        'LIFECYCLE_SYSTEM_CONTROLLED',
        'مرحله چرخه مشتری فقط با رویدادهای سیستم (تبدیل، فعالیت، سفارش) تغییر می‌کند.',
        400,
        { previous: prev, attempted: next },
      );
    }
    delete data.lifecycleStage;
  }
  if (data.engagementStatus != null
    && data.engagementStatus !== (existing.engagementStatus || 'normal')) {
    throw appError(
      'ENGAGEMENT_SYSTEM_CONTROLLED',
      'وضعیت تعامل مشتری فقط با قوانین سیستم تغییر می‌کند.',
      400,
      { previous: existing.engagementStatus, attempted: data.engagementStatus },
    );
  }
  delete data.engagementStatus;

  const { data: companyData } = stripShadowCompanyFields(data);

  await withTransaction(async (client) => {
    await companyRepo.update(id, companyData, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'company.update',
      entityType: 'company',
      entityId: id,
    }, client);
  });

  return getCompany(id);
}

/**
 * Recompute lifecycle + engagement from activities/orders (event projection).
 * Optional `asOf` supports deterministic Forgotten/Shadow evaluation in tests.
 */
export async function recomputeCompanyLifecycle(id, body, actorUserId) {
  if (!(await companyRepo.existsActive(id))) {
    throw notFoundError('شرکت یافت نشد.');
  }
  const asOf = body?.asOf ? new Date(body.asOf) : new Date();
  if (Number.isNaN(asOf.getTime())) {
    throw appError('VALIDATION', 'asOf نامعتبر است.', 400);
  }
  const result = await recomputeCustomerLifecycle(id, {
    actorUserId,
    trigger: body?.trigger || 'api_recompute',
    now: asOf,
  });
  const company = await getCompany(id);
  return { ...result, company };
}

/** Soft-delete (archive) — never hard DELETE */
export async function archiveCompany(id, actorUserId) {
  if (!(await companyRepo.existsActive(id))) {
    throw notFoundError('شرکت یافت نشد.');
  }

  await withTransaction(async (client) => {
    await companyRepo.softDelete(id, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'company.archive',
      entityType: 'company',
      entityId: id,
    }, client);
  });

  return { id, archived: true };
}

