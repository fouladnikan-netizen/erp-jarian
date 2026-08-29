/**
 * User administration use-cases (Shirazeh) — DDL-27A.
 * Canonical identity is backend `users`. Passwords are hashed with bcryptjs.
 * Last-active-admin is enforced transactionally (role-based, not username).
 */
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { withTransaction } from '../db/pool.js';
import { appError, fromZodError, validationError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import * as userRepo from '../repositories/userRepository.js';
import { ADMIN_ROLE_CODE } from '../repositories/userRepository.js';

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

const rolesSchema = z.array(z.string().trim().min(1)).min(1);

const createSchema = z.object({
  username: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(1).max(120),
  password: z.string().min(MIN_PASSWORD_LENGTH),
  roles: rolesSchema,
  isActive: z.boolean().optional().default(true),
});

const patchSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  roles: rolesSchema.optional(),
});

const passwordSchema = z.object({
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

function uniqueRoles(roles) {
  return [...new Set(roles.map((c) => String(c).trim()).filter(Boolean))];
}

function isUsernameUniqueViolation(err) {
  if (err?.code !== '23505') return false;
  const constraint = String(err.constraint || '');
  const detail = String(err.detail || '');
  return constraint.includes('username') || detail.includes('username');
}

function lastAdminError() {
  return appError(
    'LAST_ACTIVE_ADMIN_REQUIRED',
    'سامانه باید حداقل یک کاربر فعال با نقش مدیر داشته باشد.',
    409,
  );
}

async function assertRolesExist(roleCodes, client = null) {
  const found = await userRepo.findExistingRoleCodes(roleCodes, client);
  if (found.length !== roleCodes.length) {
    const missing = roleCodes.filter((c) => !found.includes(c));
    throw appError('ROLE_NOT_FOUND', 'نقش انتخاب‌شده معتبر نیست.', 400, { missing });
  }
}

function wouldRemainActiveAdmin({ currentlyActiveAdmin, nextActiveAdmin, activeAdminCount }) {
  let remaining = activeAdminCount;
  if (currentlyActiveAdmin) remaining -= 1;
  if (nextActiveAdmin) remaining += 1;
  return remaining >= 1;
}

function auditSafeRoles(codes) {
  return [...codes];
}

export async function listUsers() {
  return userRepo.listUsers();
}

export async function getUser(id) {
  const user = await userRepo.findById(id);
  if (!user) {
    throw appError('USER_NOT_FOUND', 'کاربر یافت نشد.', 404);
  }
  return user;
}

export async function listAssignableRoles() {
  return userRepo.listAssignableRoles();
}

export async function createUser(body, actorUserId) {
  if (body?.password_hash != null || body?.passwordHash != null) {
    throw validationError('هش رمز عبور از سمت کلاینت پذیرفته نمی‌شود.');
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های کاربر نامعتبر است.');

  const username = parsed.data.username;
  const displayName = parsed.data.displayName;
  const roles = uniqueRoles(parsed.data.roles);
  const isActive = parsed.data.isActive !== false;
  const password = parsed.data.password;

  if (!roles.length) {
    throw validationError('حداقل یک نقش الزامی است.');
  }
  await assertRolesExist(roles);

  const existing = await userRepo.findByUsername(username);
  if (existing) {
    throw appError('USERNAME_EXISTS', 'این نام کاربری قبلاً ثبت شده است.', 409);
  }

  const id = newEntityId('u');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    await withTransaction(async (client) => {
      await userRepo.insertUser({
        id, username, displayName, passwordHash, isActive,
      }, client);
      await userRepo.replaceRoles(id, roles, client);
      await writeAudit({
        actorUserId,
        action: 'user.create',
        entityType: 'user',
        entityId: id,
        detail: { username, roles: auditSafeRoles(roles), isActive },
      }, client);
    });
  } catch (err) {
    if (isUsernameUniqueViolation(err)) {
      throw appError('USERNAME_EXISTS', 'این نام کاربری قبلاً ثبت شده است.', 409);
    }
    throw err;
  }

  return getUser(id);
}

export async function updateUser(id, body, actorUserId) {
  if (body?.password != null || body?.password_hash != null || body?.passwordHash != null) {
    throw validationError('برای تغییر رمز از مسیر بازنشانی رمز استفاده کنید.');
  }
  if (body?.id != null && body.id !== id) {
    throw validationError('شناسه کاربر قابل تغییر نیست.');
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, 'username')) {
    throw validationError('نام کاربری پس از ایجاد قابل تغییر نیست.');
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'داده‌های کاربر نامعتبر است.');
  const patch = parsed.data;
  if (Object.keys(patch).length === 0) {
    throw validationError('هیچ فیلدی برای به‌روزرسانی ارسال نشده است.');
  }

  const nextRoles = patch.roles ? uniqueRoles(patch.roles) : null;
  if (nextRoles) await assertRolesExist(nextRoles);

  const touchesAdminInvariant = patch.isActive !== undefined || nextRoles !== null;

  return withTransaction(async (client) => {
    if (touchesAdminInvariant) {
      await userRepo.acquireLastAdminLock(client);
      await userRepo.lockActiveAdminRows(client);
    }

    const locked = await userRepo.lockById(id, client);
    if (!locked) {
      throw appError('USER_NOT_FOUND', 'کاربر یافت نشد.', 404);
    }

    const currentRoles = await userRepo.listRoleCodes(id, client);
    const nextDisplayName = patch.displayName !== undefined ? patch.displayName : locked.display_name;
    const nextIsActive = patch.isActive !== undefined ? patch.isActive : Boolean(locked.is_active);
    const resolvedRoles = nextRoles || currentRoles;

    const currentlyActiveAdmin = Boolean(locked.is_active) && currentRoles.includes(ADMIN_ROLE_CODE);
    const nextActiveAdmin = nextIsActive && resolvedRoles.includes(ADMIN_ROLE_CODE);

    if (touchesAdminInvariant) {
      const activeAdminCount = await userRepo.countActiveAdmins(client);
      if (!wouldRemainActiveAdmin({ currentlyActiveAdmin, nextActiveAdmin, activeAdminCount })) {
        throw lastAdminError();
      }
    }

    await userRepo.updateUserFields(id, {
      displayName: patch.displayName,
      isActive: patch.isActive,
    }, client);

    if (nextRoles) {
      await userRepo.replaceRoles(id, nextRoles, client);
    }

    const changedFields = [];
    if (patch.displayName !== undefined && patch.displayName !== locked.display_name) {
      changedFields.push('displayName');
    }
    const prevActive = Boolean(locked.is_active);
    if (patch.isActive !== undefined && patch.isActive !== prevActive) {
      changedFields.push('isActive');
      await writeAudit({
        actorUserId,
        action: patch.isActive ? 'user.activate' : 'user.deactivate',
        entityType: 'user',
        entityId: id,
        detail: { previous: prevActive, next: patch.isActive },
      }, client);
    }
    if (nextRoles) {
      const prevSorted = [...currentRoles].sort();
      const nextSorted = [...nextRoles].sort();
      const rolesChanged = prevSorted.join(',') !== nextSorted.join(',');
      if (rolesChanged) {
        changedFields.push('roles');
        await writeAudit({
          actorUserId,
          action: 'user.roles.update',
          entityType: 'user',
          entityId: id,
          detail: {
            previous: auditSafeRoles(currentRoles),
            next: auditSafeRoles(nextRoles),
          },
        }, client);
      }
    }

    if (changedFields.length) {
      await writeAudit({
        actorUserId,
        action: 'user.update',
        entityType: 'user',
        entityId: id,
        detail: { fields: changedFields },
      }, client);
    }

    return userRepo.findById(id, client);
  });
}

export async function resetPassword(id, body, actorUserId) {
  if (body?.password_hash != null || body?.passwordHash != null) {
    throw validationError('هش رمز عبور از سمت کلاینت پذیرفته نمی‌شود.');
  }
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'رمز عبور نامعتبر است.');

  const existing = await userRepo.findById(id);
  if (!existing) {
    throw appError('USER_NOT_FOUND', 'کاربر یافت نشد.', 404);
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);

  await withTransaction(async (client) => {
    const locked = await userRepo.lockById(id, client);
    if (!locked) {
      throw appError('USER_NOT_FOUND', 'کاربر یافت نشد.', 404);
    }
    await userRepo.updatePasswordHash(id, passwordHash, client);
    await writeAudit({
      actorUserId,
      action: 'user.password.reset',
      entityType: 'user',
      entityId: id,
      detail: { fields: ['password'] },
    }, client);
  });

  return { ok: true };
}
