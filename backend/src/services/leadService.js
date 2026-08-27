import { z } from 'zod';
import { withTransaction } from '../db/pool.js';
import { appError, fromZodError, notFoundError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import * as leadRepo from '../repositories/leadRepository.js';
import * as companyRepo from '../repositories/companyRepository.js';
import { resolveCompanyIdentity } from '../ports/companyIdentityResolver.port.js';
import { normalizeNationalId } from '../domain/companyIdentity/normalizeNationalId.js';
import { buildLegalPayloadFromIdentity } from '../domain/companyIdentity/linkaLegalFields.js';
import { userMessageForCode } from '../integrations/linka/linkaErrors.js';
import { CUSTOMER_LIFECYCLE } from '../domain/customerLifecycle/lifecycleKeys.js';
import { recomputeCustomerLifecycle } from './customerLifecycleService.js';
import {
  ensurePersonalPipeline,
} from './leadPipelineService.js';

export const LEAD_STATUSES = Object.freeze({
  NEW: 'NEW',
  QUALIFYING: 'QUALIFYING',
  CONVERTED: 'CONVERTED',
  REJECTED: 'REJECTED',
});

/** Allowed transitions for PATCH …/status (CONVERTED only via convert). */
const STATUS_TRANSITIONS = Object.freeze({
  NEW: ['QUALIFYING', 'REJECTED'],
  QUALIFYING: ['REJECTED'],
  CONVERTED: [],
  REJECTED: [],
});

const createSchema = z.object({
  companyName: z.string().trim().min(1),
  personName: z.string().trim().optional().nullable(),
  mobile: z.string().trim().optional().nullable(),
  leadSource: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  activityDomain: z.string().trim().optional().nullable(),
  payload: z.record(z.string(), z.any()).optional(),
});

const updateSchema = createSchema.partial();

const statusSchema = z.object({
  status: z.enum(['NEW', 'QUALIFYING', 'CONVERTED', 'REJECTED']),
});

const convertSchema = z.object({
  nationalId: z.string().trim().min(1),
});

function assertConvertible(lead) {
  if (!lead) {
    throw appError('LEAD_NOT_FOUND', 'سرنخ یافت نشد.', 404);
  }
  if (lead.status === LEAD_STATUSES.CONVERTED) {
    throw appError('LEAD_ALREADY_CONVERTED', 'این سرنخ قبلاً تبدیل شده است.', 409, {
      companyId: lead.convertedCompanyId,
    });
  }
  if (lead.status === LEAD_STATUSES.REJECTED) {
    throw appError('INVALID_LEAD_STATUS', 'سرنخ ردشده قابل تبدیل نیست.', 400, {
      status: lead.status,
    });
  }
  if (lead.status !== LEAD_STATUSES.NEW && lead.status !== LEAD_STATUSES.QUALIFYING) {
    throw appError('INVALID_LEAD_STATUS', 'وضعیت سرنخ برای تبدیل مجاز نیست.', 400, {
      status: lead.status,
    });
  }
}

function assertStatusTransition(from, to) {
  if (to === LEAD_STATUSES.CONVERTED) {
    throw appError(
      'INVALID_LEAD_STATUS',
      'تبدیل به CONVERTED فقط از طریق endpoint تبدیل مجاز است.',
      400,
      { from, to },
    );
  }
  const allowed = STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw appError('INVALID_LEAD_STATUS', 'تغییر وضعیت مجاز نیست.', 400, { from, to });
  }
}

function normalizeCreateBody(data) {
  const description = data.description ?? data.notes ?? null;
  return {
    companyName: data.companyName,
    personName: data.personName ?? null,
    mobile: data.mobile ?? null,
    leadSource: data.leadSource ?? null,
    description,
    activityDomain: data.activityDomain ?? null,
    payload: data.payload || {},
  };
}

export async function listLeads(filters = {}) {
  return leadRepo.list(filters);
}

export async function getLead(id, options = {}) {
  const lead = await leadRepo.findById(id, options);
  if (!lead) {
    throw appError('LEAD_NOT_FOUND', 'سرنخ یافت نشد.', 404);
  }
  return lead;
}

export async function createLead(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw fromZodError(parsed, 'داده‌های سرنخ نامعتبر است.');
  }

  const data = normalizeCreateBody(parsed.data);
  const id = newEntityId('lead');

  // Ensure personal pipeline before create so first stage exists
  const { stages } = await ensurePersonalPipeline(actorUserId);
  const firstStageId = stages[0]?.id || null;

  await withTransaction(async (client) => {
    await leadRepo.create({
      ...data,
      id,
      status: LEAD_STATUSES.NEW,
      pipelineStageId: firstStageId,
      actorUserId,
    }, client);
    await writeAudit({
      actorUserId,
      action: 'lead.create',
      entityType: 'raw_lead',
      entityId: id,
      detail: { companyName: data.companyName, pipelineStageId: firstStageId },
    }, client);
  });

  return getLead(id);
}

export async function updateLead(id, body, actorUserId) {
  const existing = await leadRepo.findById(id);
  if (!existing) {
    throw appError('LEAD_NOT_FOUND', 'سرنخ یافت نشد.', 404);
  }
  if (existing.status === LEAD_STATUSES.CONVERTED) {
    throw appError('LEAD_ALREADY_CONVERTED', 'سرنخ تبدیل‌شده قابل ویرایش نیست.', 409);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw fromZodError(parsed, 'داده‌های سرنخ نامعتبر است.');
  }

  const patch = { ...parsed.data };
  if (patch.notes != null && patch.description == null) {
    patch.description = patch.notes;
  }
  delete patch.notes;

  await withTransaction(async (client) => {
    await leadRepo.update(id, patch, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'lead.update',
      entityType: 'raw_lead',
      entityId: id,
    }, client);
  });

  return getLead(id);
}

export async function changeLeadStatus(id, body, actorUserId) {
  const existing = await leadRepo.findById(id);
  if (!existing) {
    throw appError('LEAD_NOT_FOUND', 'سرنخ یافت نشد.', 404);
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    throw fromZodError(parsed, 'وضعیت نامعتبر است.');
  }

  const next = parsed.data.status;
  assertStatusTransition(existing.status, next);

  await withTransaction(async (client) => {
    await leadRepo.updateStatus(id, next, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'lead.status_change',
      entityType: 'raw_lead',
      entityId: id,
      detail: { from: existing.status, to: next },
    }, client);
  });

  return getLead(id);
}

export async function archiveLead(id, actorUserId, body = {}) {
  const existing = await leadRepo.findById(id);
  if (!existing) {
    throw appError('LEAD_NOT_FOUND', 'سرنخ یافت نشد.', 404);
  }

  const reason = String(body.reason || body.archiveReason || '').trim();
  if (!reason) {
    throw appError(
      'ARCHIVE_REASON_REQUIRED',
      'دلیل بایگانی الزامی است.',
      400,
    );
  }

  await withTransaction(async (client) => {
    await leadRepo.archive(id, actorUserId, { reason }, client);
    await writeAudit({
      actorUserId,
      action: 'LEAD_ARCHIVED',
      entityType: 'raw_lead',
      entityId: id,
      detail: { reason, previousStatus: existing.status },
    }, client);
  });

  return { id, archived: true, reason };
}

/**
 * Duplicate-detection foundation: search Companies by name (not Lead data).
 */
export async function findCompanyMatches(q, options = {}) {
  return leadRepo.findPotentialCompanyMatches(q, options);
}

/**
 * Atomic Lead → Company conversion.
 * Identity resolution runs outside DB TX; existing Company by nationalId skips provider call.
 * @param {{ leadId: string, nationalId: string, actorId: string, requestId?: string|null }} input
 * @param {{ identityResolver?: typeof resolveCompanyIdentity }} [deps] test injection
 */
export async function convertLeadToCompany(input, deps = {}) {
  const leadId = input.leadId;
  const actorUserId = input.actorId;
  const parsed = convertSchema.safeParse({ nationalId: input.nationalId });
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

  const lead = await leadRepo.findById(leadId);
  assertConvertible(lead);

  const nationalId = normalized.nationalId;
  const existingPre = await companyRepo.findByNationalId(nationalId);

  let suggestedName = lead.companyName;
  /** @type {import('../domain/companyIdentity/companyIdentityDto.js').CompanyIdentityDto|null} */
  let resolvedIdentity = null;
  if (!existingPre) {
    const resolve = deps.identityResolver || resolveCompanyIdentity;
    const identity = await resolve({
      nationalId,
      companyName: lead.companyName,
      requestId: input.requestId || null,
    });
    if (!identity?.ok) {
      throw appError(
        identity?.errorCode || 'COMPANY_RESOLUTION_FAILED',
        identity?.error || userMessageForCode(identity?.errorCode),
        422,
        identity?.details,
      );
    }
    suggestedName = identity.suggestedName || lead.companyName;
    resolvedIdentity = identity.identity || null;
  }

  let companyId = null;
  let conversionMode = 'link_existing';

  await withTransaction(async (client) => {
    const leadLocked = await leadRepo.findById(leadId, {}, client);
    assertConvertible(leadLocked);

    const existingCompany = await companyRepo.findByNationalId(nationalId, client);

    if (existingCompany) {
      companyId = existingCompany.id;
      conversionMode = 'link_existing';

      const companyPayload = {
        ...(existingCompany.payload || {}),
        interactions: [
          ...((leadLocked.payload?.interactions) || []),
          ...((existingCompany.payload?.interactions) || []),
        ],
        convertedFromLeadId: leadLocked.id,
      };
      const patch = { payload: companyPayload };
      if (!existingCompany.lifecycleStage
        && String(existingCompany.entityType || '').toUpperCase() !== 'SUPPLIER') {
        patch.lifecycleStage = CUSTOMER_LIFECYCLE.COLD_LEAD;
        patch.engagementStatus = 'normal';
      }
      await companyRepo.update(companyId, patch, actorUserId, client);
    } else {
      conversionMode = 'create_new';
      companyId = newEntityId('co');
      const legal = buildLegalPayloadFromIdentity(resolvedIdentity);
      const payload = {
        ...(leadLocked.payload || {}),
        interactions: leadLocked.payload?.interactions || [],
        leadSource: leadLocked.leadSource,
        convertedFromLeadId: leadLocked.id,
        notes: leadLocked.description,
        crmActivityDomain: leadLocked.activityDomain || null,
        officialSpecs: legal.officialSpecs,
        governance: legal.governance,
        linkaIdentity: legal.linkaIdentity,
        personType: 'legal',
        recordType: 'CUSTOMER',
      };

      await companyRepo.insert({
        id: companyId,
        name: suggestedName || leadLocked.companyName,
        entityType: 'CUSTOMER',
        nationalId,
        province: resolvedIdentity?.province || null,
        activityDomain: leadLocked.activityDomain || null,
        phone: leadLocked.mobile,
        lifecycleStage: CUSTOMER_LIFECYCLE.COLD_LEAD,
        engagementStatus: 'normal',
        assigneeName: leadLocked.payload?.assignee?.name || null,
        assigneeRole: leadLocked.payload?.assignee?.role || null,
        payload,
        actorUserId,
      }, client);

      if (leadLocked.personName) {
        await companyRepo.insertPerson({
          id: newEntityId('cp'),
          companyId,
          fullName: leadLocked.personName,
          mobile: leadLocked.mobile,
          roleTitle: 'مخاطب اصلی',
          payload: { isPrimary: true },
        }, client);
      }
    }

    await leadRepo.markConverted(leadId, { companyId, actorUserId }, client);

    await writeAudit({
      actorUserId,
      action: 'lead.convert',
      entityType: 'raw_lead',
      entityId: leadId,
      detail: {
        leadId,
        companyId,
        actorId: actorUserId,
        conversionMode,
        nationalId,
        identityProviderSkipped: Boolean(existingPre),
      },
    }, client);
  });

  await recomputeCustomerLifecycle(companyId, {
    actorUserId,
    trigger: 'lead_convert',
  });

  const [convertedLead, company] = await Promise.all([
    getLead(leadId),
    companyRepo.findById(companyId),
  ]);

  return {
    lead: convertedLead,
    company,
    companyId,
    conversionMode,
  };
}

export default {
  listLeads,
  getLead,
  createLead,
  updateLead,
  changeLeadStatus,
  archiveLead,
  findCompanyMatches,
  convertLeadToCompany,
  LEAD_STATUSES,
};
