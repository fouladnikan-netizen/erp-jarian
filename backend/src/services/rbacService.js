/**
 * Role administration + permission matrix use-cases.
 * Canonical permission codes stay colon-form (DDL-36). Role CRUD is DDL-35.
 */
import { z } from 'zod';
import { withTransaction } from '../db/pool.js';
import { appError, fromZodError, validationError, AppError } from '../lib/errors.js';
import { writeAudit } from '../lib/ids.js';
import { ADMIN_ROLE_CODE } from '../repositories/userRepository.js';
import * as rbacRepo from '../repositories/rbacRepository.js';
import { resolveCanonicalPermissionCodes } from '../domain/rbac/permissionCatalog.js';
import { normalizeRoleLabelFa } from '../domain/rbac/normalizeRoleLabel.js';

const USERS_ADMIN_PERMISSION = 'users:admin';
const ROLE_CODE_RE = /^[a-z][a-z0-9_]{0,47}$/;

const replaceSchema = z.object({
  permissions: z.array(z.string().trim().min(1)).default([]),
});

const createRoleSchema = z.object({
  code: z.preprocess(
    (value) => {
      if (value == null) return undefined;
      const trimmed = String(value).trim().toLowerCase();
      return trimmed === '' ? undefined : trimmed;
    },
    z.string().regex(ROLE_CODE_RE, 'کد نقش نامعتبر است.').optional(),
  ),
  labelFa: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default(''),
  isActive: z.boolean().optional().default(true),
});

const patchRoleSchema = z.object({
  labelFa: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

function uniqueCodes(codes) {
  return [...new Set(codes.map((code) => String(code).trim()).filter(Boolean))];
}

function isUniqueRoleCodeViolation(err) {
  if (err?.code !== '23505') return false;
  if (isUniqueRoleNameViolation(err)) return false;
  const constraint = String(err.constraint || '');
  const detail = String(err.detail || '');
  return constraint.includes('roles') || detail.includes('code');
}

function isUniqueRoleNameViolation(err) {
  if (err?.code !== '23505') return false;
  const constraint = String(err.constraint || '');
  const detail = String(err.detail || '');
  return constraint.includes('label_fa_normalized') || detail.includes('label_fa_normalized');
}

function roleNameConflict(existing, attemptedLabel) {
  const label = String(attemptedLabel || existing?.labelFa || '').trim();
  const isActive = existing ? existing.isActive !== false : true;
  const message = isActive
    ? `نقش «${label}» قبلاً وجود دارد.`
    : 'نقشی با این نام قبلاً ایجاد شده و در حال حاضر غیرفعال است.';
  return appError('ROLE_NAME_ALREADY_EXISTS', message, 409, {
    existingRoleCode: existing?.code || null,
    existingRoleIsActive: existing ? existing.isActive !== false : null,
  });
}

function usagePayload(role) {
  const count = role?.activeUserCount || 0;
  if (count <= 0) return null;
  return {
    code: 'ROLE_IN_USE',
    activeUserCount: count,
    message: `این نقش به ${count} کاربر فعال اختصاص دارد.`,
  };
}

export async function listPermissions() {
  return rbacRepo.listPermissions();
}

export async function listRoles() {
  return rbacRepo.listRoles();
}

export async function getRole(roleCode) {
  const role = await rbacRepo.findRole(roleCode);
  if (!role) {
    throw appError('ROLE_NOT_FOUND', 'نقش یافت نشد.', 404);
  }
  return role;
}

export async function createRole(body, actorUserId) {
  const parsed = createRoleSchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های نقش نامعتبر است.');

  const normalizedLabel = normalizeRoleLabelFa(parsed.data.labelFa);
  if (!normalizedLabel) {
    throw validationError('نام نقش الزامی است.');
  }

  try {
    const role = await withTransaction(async (client) => {
      await rbacRepo.acquireRoleLabelLock(normalizedLabel, client);
      const duplicate = await rbacRepo.findRoleByNormalizedLabel(normalizedLabel, {}, client);
      if (duplicate) {
        throw roleNameConflict(duplicate, parsed.data.labelFa);
      }

      let code = parsed.data.code;
      if (code) {
        const existing = await rbacRepo.findRole(code, client);
        if (existing) {
          throw appError('ROLE_EXISTS', 'این کد نقش قبلاً ثبت شده است.', 409);
        }
      } else {
        await rbacRepo.acquireGeneratedRoleCodeLock(client);
        code = await rbacRepo.allocateNextGeneratedRoleCode(client);
      }

      const created = await rbacRepo.insertRole({
        code,
        labelFa: parsed.data.labelFa,
        description: parsed.data.description || '',
        isActive: parsed.data.isActive !== false,
      }, client);
      await writeAudit({
        actorUserId,
        action: 'role.create',
        entityType: 'role',
        entityId: created.code,
        detail: {
          labelFa: created.labelFa,
          isActive: created.isActive,
          generated: !parsed.data.code,
        },
      }, client);
      return created;
    });
    return role;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (isUniqueRoleNameViolation(err)) {
      const existing = await rbacRepo.findRoleByNormalizedLabel(normalizedLabel);
      throw roleNameConflict(existing, parsed.data.labelFa);
    }
    if (isUniqueRoleCodeViolation(err)) {
      throw appError('ROLE_EXISTS', 'این کد نقش قبلاً ثبت شده است.', 409);
    }
    throw err;
  }
}

export async function updateRole(roleCode, body, actorUserId) {
  if (body?.code != null && String(body.code).trim() !== String(roleCode)) {
    throw validationError('کد نقش پس از ایجاد قابل تغییر نیست.');
  }

  const parsed = patchRoleSchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های نقش نامعتبر است.');
  const patch = parsed.data;
  if (Object.keys(patch).length === 0) {
    throw validationError('هیچ فیلدی برای به‌روزرسانی ارسال نشده است.');
  }

  const existing = await rbacRepo.findRole(roleCode);
  if (!existing) {
    throw appError('ROLE_NOT_FOUND', 'نقش یافت نشد.', 404);
  }

  try {
    const role = await withTransaction(async (client) => {
      if (patch.labelFa !== undefined) {
        const normalizedLabel = normalizeRoleLabelFa(patch.labelFa);
        if (!normalizedLabel) {
          throw validationError('نام نقش الزامی است.');
        }
        await rbacRepo.acquireRoleLabelLock(normalizedLabel, client);
        const duplicate = await rbacRepo.findRoleByNormalizedLabel(normalizedLabel, {
          excludeCode: existing.code,
        }, client);
        if (duplicate) {
          throw roleNameConflict(duplicate, patch.labelFa);
        }
      }

      const updated = await rbacRepo.updateRole(existing.code, {
        labelFa: patch.labelFa,
        description: patch.description,
        isActive: patch.isActive,
      }, client);

    const fields = [];
    if (patch.labelFa !== undefined && patch.labelFa !== existing.labelFa) fields.push('labelFa');
    if (patch.description !== undefined && patch.description !== existing.description) {
      fields.push('description');
    }
    if (patch.isActive !== undefined && patch.isActive !== existing.isActive) {
      fields.push('isActive');
      await writeAudit({
        actorUserId,
        action: patch.isActive ? 'role.activate' : 'role.deactivate',
        entityType: 'role',
        entityId: existing.code,
        detail: {
          previous: existing.isActive,
          next: patch.isActive,
          activeUserCount: existing.activeUserCount,
        },
      }, client);
    }
    if (fields.length) {
      await writeAudit({
        actorUserId,
        action: 'role.update',
        entityType: 'role',
        entityId: existing.code,
        detail: { fields },
      }, client);
    }
    return updated;
    });

    return {
      role,
      usage: usagePayload(role),
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (isUniqueRoleNameViolation(err) && patch.labelFa !== undefined) {
      const duplicate = await rbacRepo.findRoleByNormalizedLabel(
        normalizeRoleLabelFa(patch.labelFa),
        { excludeCode: existing.code },
      );
      throw roleNameConflict(duplicate, patch.labelFa);
    }
    throw err;
  }
}

export async function listRoleUsers(roleCode) {
  const role = await rbacRepo.findRole(roleCode);
  if (!role) {
    throw appError('ROLE_NOT_FOUND', 'نقش یافت نشد.', 404);
  }
  return rbacRepo.listRoleUsers(role.code);
}

export async function listRolePermissions(roleCode) {
  const role = await rbacRepo.findRole(roleCode);
  if (!role) {
    throw appError('ROLE_NOT_FOUND', 'نقش یافت نشد.', 404);
  }
  return rbacRepo.listRolePermissionCodes(role.code);
}

export async function replaceRolePermissions(roleCode, body, actorUserId) {
  const parsed = replaceSchema.safeParse(body || {});
  if (!parsed.success) throw fromZodError(parsed, 'فهرست دسترسی نامعتبر است.');

  const role = await rbacRepo.findRole(roleCode);
  if (!role) {
    throw appError('ROLE_NOT_FOUND', 'نقش یافت نشد.', 404);
  }

  const { resolved: next, missing: unknown } = resolveCanonicalPermissionCodes(
    uniqueCodes(parsed.data.permissions),
  );
  if (unknown.length) {
    throw appError('PERMISSION_NOT_FOUND', 'کد دسترسی نامعتبر است.', 400, { missing: unknown });
  }
  const found = await rbacRepo.findExistingPermissionCodes(next);
  if (found.length !== next.length) {
    const missing = next.filter((code) => !found.includes(code));
    throw appError('PERMISSION_NOT_FOUND', 'کد دسترسی نامعتبر است.', 400, { missing });
  }

  if (role.code === ADMIN_ROLE_CODE && !next.includes(USERS_ADMIN_PERMISSION)) {
    throw appError(
      'ADMIN_PERMISSION_REQUIRED',
      'نقش مدیر باید دسترسی مدیریت کاربران را حفظ کند.',
      409,
    );
  }

  return withTransaction(async (client) => {
    const previous = await rbacRepo.listRolePermissionCodes(role.code, client);
    await rbacRepo.replaceRolePermissions(role.code, next, client);
    await writeAudit({
      actorUserId,
      action: 'role.permissions.update',
      entityType: 'role',
      entityId: role.code,
      detail: { previous, next },
    }, client);
    return rbacRepo.listRolePermissionCodes(role.code, client);
  });
}
