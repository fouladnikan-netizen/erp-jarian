/**
 * Contact use-cases — DDL-26 canonical Contact (Kanoon-owned).
 */
import { z } from 'zod';
import { withTransaction } from '../../../db/pool.js';
import { appError, fromZodError, notFoundError } from '../../../lib/errors.js';
import { newEntityId, writeAudit } from '../../../lib/ids.js';
import {
  normalizePersonName,
  normalizeMobile,
  normalizeEmail,
} from '../../../domain/identity/normalize.js';
import * as contactRepo from '../infrastructure/contactRepository.js';
import * as relationshipRepo from '../infrastructure/companyContactRelationshipRepository.js';
import * as companyRepo from '../infrastructure/companyRepository.js';
import {
  checkContactDuplicates,
  assertCreatePolicy,
} from './identityMatchingService.js';

const createSchema = z.object({
  fullName: z.string().trim().min(1),
  mobile: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable(),
  companyId: z.string().trim().optional().nullable(),
  roleTitle: z.string().trim().optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  confirmDuplicate: z.boolean().optional().default(false),
  payload: z.record(z.string(), z.any()).optional(),
});

const linkSchema = z.object({
  companyId: z.string().trim().min(1),
  contactId: z.string().trim().min(1),
  roleTitle: z.string().trim().optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
});

const updateContactSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  mobile: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable(),
  payload: z.record(z.string(), z.any()).optional(),
});

const updateRelationshipSchema = z.object({
  roleTitle: z.string().trim().optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export function buildContactFields(data) {
  const mobileNorm = data.mobile != null ? normalizeMobile(data.mobile) : null;
  const emailNorm = data.email != null ? normalizeEmail(data.email) : null;
  return {
    fullName: data.fullName,
    mobile: mobileNorm?.ok ? mobileNorm.mobile : (data.mobile || null),
    mobileNormalized: mobileNorm?.ok ? mobileNorm.normalized : null,
    email: emailNorm?.ok ? emailNorm.email : (data.email || null),
    emailNormalized: emailNorm?.ok ? emailNorm.normalized : null,
    fullNameNormalized: normalizePersonName(data.fullName),
    payload: data.payload || {},
  };
}

export async function listContactsByCompany(companyId) {
  if (!(await companyRepo.existsActive(companyId))) {
    throw notFoundError('شرکت یافت نشد.');
  }
  return relationshipRepo.findActiveByCompany(companyId);
}

export async function getContact(id) {
  const contact = await contactRepo.findById(id);
  if (!contact) throw notFoundError('مخاطب یافت نشد.');
  const relationships = await relationshipRepo.findActiveByContact(id);
  return { ...contact, relationships };
}

export async function createContact(body, actorUserId) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های مخاطب نامعتبر است.');

  const dup = await checkContactDuplicates(parsed.data, {
    actorUserId,
    audit: true,
    action: 'create_precheck',
  });
  assertCreatePolicy('contact', dup, { confirmDuplicate: parsed.data.confirmDuplicate });

  const fields = buildContactFields(parsed.data);
  let contactId = null;
  let linkedExisting = false;

  await withTransaction(async (client) => {
    let contact = null;
    if (fields.mobileNormalized) {
      contact = await contactRepo.findByMobileNormalizedForUpdate(fields.mobileNormalized, client);
    }

    if (contact) {
      contactId = contact.id;
      linkedExisting = true;
    } else {
      contactId = newEntityId('ct');
      await contactRepo.insert({ id: contactId, ...fields, actorUserId }, client);
      await writeAudit({
        actorUserId,
        action: 'contact.create',
        entityType: 'contact',
        entityId: contactId,
        detail: { fullName: fields.fullName },
      }, client);
    }

    if (parsed.data.companyId) {
      const existingLink = await relationshipRepo.findActiveLink(
        parsed.data.companyId,
        contactId,
        client,
      );
      if (!existingLink) {
        await relationshipRepo.insert({
          id: newEntityId('ccr'),
          companyId: parsed.data.companyId,
          contactId,
          roleTitle: parsed.data.roleTitle,
          isPrimary: parsed.data.isPrimary,
          actorUserId,
        }, client);
      }
    }
  });

  return { contact: await getContact(contactId), linkedExisting };
}

export async function linkContactToCompany(body, actorUserId) {
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های ارتباط نامعتبر است.');

  if (!(await companyRepo.existsActive(parsed.data.companyId))) {
    throw notFoundError('شرکت یافت نشد.');
  }
  if (!(await contactRepo.findById(parsed.data.contactId))) {
    throw notFoundError('مخاطب یافت نشد.');
  }

  const existing = await relationshipRepo.findActiveLink(
    parsed.data.companyId,
    parsed.data.contactId,
  );
  if (existing) {
    return { relationship: existing, created: false };
  }

  const relId = newEntityId('ccr');
  await withTransaction(async (client) => {
    await relationshipRepo.insert({
      id: relId,
      companyId: parsed.data.companyId,
      contactId: parsed.data.contactId,
      roleTitle: parsed.data.roleTitle,
      isPrimary: parsed.data.isPrimary,
      actorUserId,
    }, client);
    await writeAudit({
      actorUserId,
      action: 'company_contact.link',
      entityType: 'company_contact_relationship',
      entityId: relId,
      detail: parsed.data,
    }, client);
  });

  const relationships = await relationshipRepo.findActiveByCompany(parsed.data.companyId);
  return {
    relationship: relationships.find((r) => r.id === relId),
    created: true,
  };
}

/**
 * Resolve or create Contact + link to Company (used by lead conversion).
 */
export async function resolveContactForCompany({
  companyId,
  fullName,
  mobile,
  roleTitle = 'مخاطب اصلی',
  isPrimary = true,
  actorUserId,
}, client) {
  if (!fullName && !mobile) return null;

  const fields = buildContactFields({ fullName: fullName || '—', mobile });
  let contact = null;

  if (fields.mobileNormalized) {
    contact = await contactRepo.findByMobileNormalizedForUpdate(fields.mobileNormalized, client);
  }

  if (!contact) {
    const contactId = newEntityId('ct');
    await contactRepo.insert({ id: contactId, ...fields, actorUserId }, client);
    contact = await contactRepo.findById(contactId, client);
  }

  const existingLink = await relationshipRepo.findActiveLink(companyId, contact.id, client);
  if (!existingLink) {
    await relationshipRepo.insert({
      id: newEntityId('ccr'),
      companyId,
      contactId: contact.id,
      roleTitle,
      isPrimary,
      actorUserId,
    }, client);
  }

  return contact;
}

export async function updateContact(id, body, actorUserId) {
  const parsed = updateContactSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های مخاطب نامعتبر است.');

  const existing = await contactRepo.findById(id);
  if (!existing) throw notFoundError('مخاطب یافت نشد.');

  const merged = {
    fullName: parsed.data.fullName ?? existing.fullName,
    mobile: parsed.data.mobile !== undefined ? parsed.data.mobile : existing.mobile,
    email: parsed.data.email !== undefined ? parsed.data.email : existing.email,
    payload: { ...(existing.payload || {}), ...(parsed.data.payload || {}) },
  };
  const fields = buildContactFields(merged);

  await withTransaction(async (client) => {
    await contactRepo.update(id, {
      fullName: fields.fullName,
      mobile: fields.mobile,
      mobileNormalized: fields.mobileNormalized,
      email: fields.email,
      emailNormalized: fields.emailNormalized,
      fullNameNormalized: fields.fullNameNormalized,
      payload: merged.payload,
    }, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'contact.update',
      entityType: 'contact',
      entityId: id,
      detail: { fields: Object.keys(parsed.data) },
    }, client);
  });

  return getContact(id);
}

export async function updateRelationship(relationshipId, body, actorUserId) {
  const parsed = updateRelationshipSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های ارتباط نامعتبر است.');

  const rel = await relationshipRepo.findById(relationshipId);
  if (!rel || rel.endedAt) throw notFoundError('ارتباط مخاطب با شرکت یافت نشد.');

  await withTransaction(async (client) => {
    if (parsed.data.isPrimary === true) {
      await relationshipRepo.setPrimary(relationshipId, rel.companyId, actorUserId, client);
    }
    if (parsed.data.roleTitle !== undefined) {
      await relationshipRepo.update(
        relationshipId,
        { roleTitle: parsed.data.roleTitle },
        actorUserId,
        client,
      );
    }
    await writeAudit({
      actorUserId,
      action: 'company_contact.update',
      entityType: 'company_contact_relationship',
      entityId: relationshipId,
      detail: parsed.data,
    }, client);
  });

  const items = await relationshipRepo.findActiveByCompany(rel.companyId);
  return items.find((r) => r.id === relationshipId) || null;
}

export async function endRelationship(relationshipId, actorUserId) {
  const rel = await relationshipRepo.findById(relationshipId);
  if (!rel || rel.endedAt) throw notFoundError('ارتباط مخاطب با شرکت یافت نشد.');

  await withTransaction(async (client) => {
    await relationshipRepo.endRelationship(relationshipId, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'company_contact.end',
      entityType: 'company_contact_relationship',
      entityId: relationshipId,
      detail: { companyId: rel.companyId, contactId: rel.contactId },
    }, client);
  });

  return { ended: true, relationshipId };
}

export default {
  listContactsByCompany,
  getContact,
  createContact,
  linkContactToCompany,
  updateContact,
  updateRelationship,
  endRelationship,
  resolveContactForCompany,
};
