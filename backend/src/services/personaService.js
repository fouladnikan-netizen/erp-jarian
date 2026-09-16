/**
 * Persona Definitions use-cases (DDL-42 / DDL-44).
 * Create allocates persona_N and may bind Roles. Persona 1—N Roles; Role 1—1 Persona.
 * Persona does not grant permissions and is not assigned to User.
 */
import { z } from 'zod';
import { withTransaction } from '../db/pool.js';
import { appError, fromZodError, validationError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import { normalizePersonaCode, normalizePersonaLabel } from '../domain/persona/normalize.js';
import * as personaRepo from '../repositories/personaRepository.js';
import * as rbacRepo from '../repositories/rbacRepository.js';

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  roleCode: z.string().trim().min(1),
  domain: z.string().trim().max(80).optional().default(''),
  isActive: z.boolean().optional().default(true),
});

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  domain: z.string().trim().max(80).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'empty patch' });

const roleBodySchema = z.object({
  roleCode: z.string().trim().min(1),
});

function isUniqueCodeViolation(err) {
  if (err?.code !== '23505') return false;
  const constraint = String(err.constraint || '');
  const detail = String(err.detail || '');
  return constraint.includes('personas_code') || detail.includes('(code)');
}

function isUniqueRoleLinkViolation(err) {
  if (err?.code !== '23505') return false;
  const constraint = String(err.constraint || '');
  const detail = String(err.detail || '');
  return constraint.includes('persona_role_links') || detail.includes('(role_code)');
}

async function assertRoleAvailable(roleCode, { excludePersonaCode } = {}, client = null) {
  const role = await rbacRepo.findRole(roleCode, client);
  if (!role) {
    throw appError('ROLE_NOT_FOUND', 'نقش انتخاب‌شده یافت نشد.', 404);
  }
  if (role.isActive === false) {
    throw appError('ROLE_INACTIVE', 'فقط نقش فعال را می‌توان به هویت وصل کرد.', 409);
  }
  const taken = await personaRepo.findByRoleCode(role.code, client);
  if (taken && taken.code !== excludePersonaCode) {
    throw appError(
      'ROLE_ALREADY_HAS_PERSONA',
      `نقش «${role.labelFa}» قبلاً به هویت «${taken.name}» وصل شده است.`,
      409,
      { roleCode: role.code, personaCode: taken.code },
    );
  }
  return role;
}

export async function listPersonas({ includeInactive = true } = {}) {
  return personaRepo.list({ includeInactive });
}

export async function getPersona(code) {
  const normalized = normalizePersonaCode(code);
  const row = await personaRepo.findByCode(normalized);
  if (!row) throw appError('PERSONA_NOT_FOUND', 'پرسونا یافت نشد.', 404);
  return row;
}

export async function listRoleOptions() {
  const [roles, links] = await Promise.all([
    rbacRepo.listRoles(),
    personaRepo.listAllLinks(),
  ]);
  const byRole = new Map(
    links.map((row) => [row.role_code, {
      code: row.persona_code,
      name: row.persona_name,
    }]),
  );
  return roles.map((role) => ({
    code: role.code,
    labelFa: role.labelFa,
    isActive: role.isActive,
    persona: byRole.get(role.code) || null,
  }));
}

export async function createPersona(body, actorUserId) {
  if (body?.code != null && String(body.code).trim() !== '') {
    throw validationError('کد هویت توسط سیستم ساخته می‌شود.');
  }
  const parsed = createSchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های هویت نامعتبر است.');

  const name = normalizePersonaLabel(parsed.data.name);
  if (!name) throw validationError('نام هویت الزامی است.');
  const domain = normalizePersonaLabel(parsed.data.domain || '');
  const roleCode = String(parsed.data.roleCode || '').trim();

  try {
    return await withTransaction(async (client) => {
      const role = await assertRoleAvailable(roleCode, {}, client);
      await personaRepo.acquireGeneratedCodeLock(client);
      const code = await personaRepo.allocateNextGeneratedCode(client);
      const row = await personaRepo.create({
        id: newEntityId('prs'),
        code,
        name,
        domain,
        isActive: parsed.data.isActive !== false,
      }, client);
      await personaRepo.insertRoleLink({ personaCode: row.code, roleCode: role.code }, client);
      await writeAudit({
        actorUserId,
        action: 'persona.create',
        entityType: 'persona',
        entityId: row.id,
        detail: { code: row.code, name: row.name, roleCode: role.code },
      }, client);
      return personaRepo.findByCode(row.code, client);
    });
  } catch (err) {
    if (isUniqueCodeViolation(err)) {
      throw appError('PERSONA_EXISTS', 'این کد پرسونا قبلاً ثبت شده است.', 409);
    }
    if (isUniqueRoleLinkViolation(err)) {
      throw appError('ROLE_ALREADY_HAS_PERSONA', 'این نقش قبلاً به یک هویت وصل شده است.', 409);
    }
    throw err;
  }
}

export async function updatePersona(code, body, actorUserId) {
  const existing = await getPersona(code);

  if (body && Object.prototype.hasOwnProperty.call(body, 'code')) {
    const attempted = normalizePersonaCode(body.code);
    if (attempted && attempted !== existing.code) {
      throw validationError('کد پرسونا پس از ایجاد قابل تغییر نیست.');
    }
  }
  if (body && (Object.prototype.hasOwnProperty.call(body, 'roleCode')
    || Object.prototype.hasOwnProperty.call(body, 'roles'))) {
    throw validationError('برای اتصال نقش از مسیر اختصاص نقش استفاده کنید.');
  }

  const parsed = patchSchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های پرسونا نامعتبر است.');

  const patch = {};
  if (parsed.data.name !== undefined) {
    const name = normalizePersonaLabel(parsed.data.name);
    if (!name) throw validationError('نام پرسونا الزامی است.');
    patch.name = name;
  }
  if (parsed.data.domain !== undefined) {
    patch.domain = normalizePersonaLabel(parsed.data.domain);
  }
  if (parsed.data.isActive !== undefined) {
    patch.isActive = parsed.data.isActive;
  }

  const updated = await personaRepo.update(existing.code, patch);
  const fields = [];
  if (patch.name !== undefined && patch.name !== existing.name) fields.push('name');
  if (patch.domain !== undefined && patch.domain !== existing.domain) fields.push('domain');
  if (patch.isActive !== undefined && patch.isActive !== existing.isActive) {
    fields.push('isActive');
    await writeAudit({
      actorUserId,
      action: patch.isActive ? 'persona.activate' : 'persona.deactivate',
      entityType: 'persona',
      entityId: existing.id,
      detail: { code: existing.code, previous: existing.isActive, next: patch.isActive },
    });
  }
  if (fields.length) {
    await writeAudit({
      actorUserId,
      action: 'persona.update',
      entityType: 'persona',
      entityId: existing.id,
      detail: { code: existing.code, fields },
    });
  }
  return updated;
}

export async function attachRole(code, body, actorUserId) {
  const existing = await getPersona(code);
  const parsed = roleBodySchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'نقش نامعتبر است.');

  try {
    return await withTransaction(async (client) => {
      const role = await assertRoleAvailable(parsed.data.roleCode, { excludePersonaCode: existing.code }, client);
      const already = (existing.roles || []).some((item) => item.code === role.code);
      if (!already) {
        await personaRepo.insertRoleLink({ personaCode: existing.code, roleCode: role.code }, client);
        await writeAudit({
          actorUserId,
          action: 'persona.role.attach',
          entityType: 'persona',
          entityId: existing.id,
          detail: { code: existing.code, roleCode: role.code },
        }, client);
      }
      return personaRepo.findByCode(existing.code, client);
    });
  } catch (err) {
    if (isUniqueRoleLinkViolation(err)) {
      throw appError('ROLE_ALREADY_HAS_PERSONA', 'این نقش قبلاً به یک هویت وصل شده است.', 409);
    }
    throw err;
  }
}

export async function detachRole(code, roleCode, actorUserId) {
  const existing = await getPersona(code);
  const normalizedRole = String(roleCode || '').trim();
  if (!normalizedRole) throw validationError('نقش نامعتبر است.');

  const removed = await personaRepo.deleteRoleLink({
    personaCode: existing.code,
    roleCode: normalizedRole,
  });
  if (!removed) {
    throw appError('ROLE_LINK_NOT_FOUND', 'این نقش به این هویت وصل نیست.', 404);
  }
  await writeAudit({
    actorUserId,
    action: 'persona.role.detach',
    entityType: 'persona',
    entityId: existing.id,
    detail: { code: existing.code, roleCode: normalizedRole },
  });
  return getPersona(existing.code);
}

export async function activatePersona(code, actorUserId) {
  return updatePersona(code, { isActive: true }, actorUserId);
}

export async function deactivatePersona(code, actorUserId) {
  return updatePersona(code, { isActive: false }, actorUserId);
}

export default {
  listPersonas,
  getPersona,
  listRoleOptions,
  createPersona,
  updatePersona,
  attachRole,
  detachRole,
  activatePersona,
  deactivatePersona,
};
