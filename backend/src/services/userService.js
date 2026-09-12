/**
 * User administration use-cases (Shirazeh) — DDL-27A / DDL-39.
 * Canonical identity is backend `users`. Passwords are hashed with bcryptjs.
 * Last-active-admin is enforced transactionally (role-based, not username).
 */
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { withTransaction } from '../db/pool.js';
import { appError, fromZodError, validationError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import { normalizeMobile, normalizeEmail } from '../domain/identity/normalize.js';
import { isActiveFlag, resolveCreateStatus } from '../domain/userAccount/accountStatus.js';
import * as userRepo from '../repositories/userRepository.js';
import { ADMIN_ROLE_CODE } from '../repositories/userRepository.js';
import * as orgRepo from '../repositories/organizationRepository.js';
import * as authLifecycle from './authLifecycleService.js';

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

const rolesSchema = z.array(z.string().trim().min(1)).min(1);

const organizationSchema = z.object({
  unitId: z.string().trim().min(1),
  positionId: z.string().trim().min(1).nullable().optional(),
  isManager: z.boolean().optional().default(false),
});

const createSchema = z.object({
  username: z.string().trim().min(1).max(80).optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
  fullName: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(MIN_PASSWORD_LENGTH).optional(),
  mobile: z.string().optional().default(''),
  email: z.string().optional().nullable().default(''),
  roles: rolesSchema,
  isActive: z.boolean().optional(),
  organization: organizationSchema.optional(),
  unitId: z.string().trim().min(1).optional(),
  positionId: z.string().trim().min(1).nullable().optional(),
  isManager: z.boolean().optional(),
});

const patchSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  fullName: z.string().trim().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  status: z.enum(['INVITED', 'ACTIVE', 'INACTIVE']).optional(),
  mobile: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  roles: rolesSchema.optional(),
  organization: organizationSchema.nullable().optional(),
  unitId: z.string().trim().min(1).nullable().optional(),
  positionId: z.string().trim().min(1).nullable().optional(),
  isManager: z.boolean().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

function uniqueRoles(roles) {
  return [...new Set(roles.map((c) => String(c).trim()).filter(Boolean))];
}

function uniqueViolationKind(err) {
  if (err?.code !== '23505') return null;
  const constraint = String(err.constraint || '');
  const detail = String(err.detail || '');
  const hay = `${constraint} ${detail}`.toLowerCase();
  if (hay.includes('username')) return 'username';
  if (hay.includes('mobile')) return 'mobile';
  if (hay.includes('email')) return 'email';
  return 'other';
}

function lastAdminError() {
  return appError(
    'LAST_ACTIVE_ADMIN_REQUIRED',
    'سامانه باید حداقل یک کاربر فعال با نقش مدیر داشته باشد.',
    409,
  );
}

function resolveDisplayName(body) {
  return String(body?.fullName || body?.displayName || '').trim();
}

function parseMobileInput(raw, { required }) {
  const text = String(raw ?? '').trim();
  if (!text) {
    if (required) throw validationError('شماره موبایل سازمانی الزامی است.');
    return null;
  }
  const parsed = normalizeMobile(text);
  if (!parsed.ok) {
    throw validationError('شماره موبایل سازمانی نامعتبر است.');
  }
  return parsed.normalized;
}

function parseEmailInput(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const parsed = normalizeEmail(text);
  if (!parsed.ok || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.normalized)) {
    throw validationError('ایمیل سازمانی نامعتبر است.');
  }
  return parsed.normalized;
}

function resolveOrganizationInput(body) {
  if (body?.organization === null) return null;
  if (body?.organization && body.organization.unitId) {
    return {
      unitId: body.organization.unitId,
      positionId: body.organization.positionId ?? null,
      isManager: body.organization.isManager === true,
    };
  }
  if (body?.unitId) {
    return {
      unitId: body.unitId,
      positionId: body.positionId ?? null,
      isManager: body.isManager === true,
    };
  }
  return undefined;
}

async function assertRolesAssignable(roleCodes, { alreadyAssigned = [] } = {}, client = null) {
  const found = await userRepo.findRoleStates(roleCodes, client);
  const byCode = new Map(found.map((r) => [r.code, r]));
  const missing = roleCodes.filter((c) => !byCode.has(c));
  if (missing.length) {
    throw appError('ROLE_NOT_FOUND', 'نقش انتخاب‌شده معتبر نیست.', 400, { missing });
  }
  const inactiveNew = roleCodes.filter((c) => {
    const row = byCode.get(c);
    return row && !row.isActive && !alreadyAssigned.includes(c);
  });
  if (inactiveNew.length) {
    throw appError('ROLE_INACTIVE', 'فقط نقش‌های فعال قابل انتساب جدید هستند.', 400, {
      inactive: inactiveNew,
    });
  }
}

async function upsertUserOrganization(userId, org, client) {
  if (org === null) {
    await orgRepo.deleteAssignment(userId, client);
    return;
  }
  const unit = await orgRepo.findUnit(org.unitId, client);
  if (!unit || unit.isActive === false) {
    throw appError('UNIT_NOT_FOUND', 'واحد سازمانی معتبر نیست.', 400);
  }
  let positionId = org.positionId || null;
  if (positionId) {
    const position = await orgRepo.findPosition(positionId, client);
    if (!position || position.unitId !== unit.id) {
      throw appError('POSITION_NOT_FOUND', 'سمت انتخاب‌شده متعلق به این واحد نیست.', 400);
    }
    positionId = position.id;
  }
  if (org.isManager) {
    await orgRepo.clearManagerOnUnit(unit.id, userId, client);
  }
  await orgRepo.upsertAssignment({
    userId,
    unitId: unit.id,
    positionId,
    isManager: org.isManager === true,
  }, client);
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

function isAuthenticableAdmin(locked, roleCodes) {
  return locked.account_status === 'ACTIVE'
    && Boolean(locked.is_active)
    && locked.has_password === true
    && roleCodes.includes(ADMIN_ROLE_CODE);
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

  const displayName = resolveDisplayName(parsed.data);
  if (!displayName) {
    throw validationError('نام و نام خانوادگی الزامی است.');
  }

  const password = parsed.data.password;
  const hasPassword = Boolean(password);
  const mobile = parseMobileInput(parsed.data.mobile, { required: !hasPassword });
  const email = parseEmailInput(parsed.data.email);
  const roles = uniqueRoles(parsed.data.roles);
  const accountStatus = resolveCreateStatus({
    hasPassword,
    isActive: parsed.data.isActive,
  });
  const isActive = isActiveFlag(accountStatus);
  const organization = resolveOrganizationInput(parsed.data);

  if (!roles.length) {
    throw validationError('حداقل یک نقش الزامی است.');
  }
  await assertRolesAssignable(roles);

  if (parsed.data.username) {
    const existing = await userRepo.findByUsername(parsed.data.username);
    if (existing) {
      throw appError('USERNAME_EXISTS', 'این نام کاربری قبلاً ثبت شده است.', 409);
    }
  }
  if (mobile) {
    const existingMobile = await userRepo.findByMobile(mobile);
    if (existingMobile) {
      throw appError('MOBILE_EXISTS', 'این شماره موبایل قبلاً ثبت شده است.', 409);
    }
  }
  if (email) {
    const existingEmail = await userRepo.findByEmail(email);
    if (existingEmail) {
      throw appError('EMAIL_EXISTS', 'این ایمیل قبلاً ثبت شده است.', 409);
    }
  }

  const id = newEntityId('u');
  const passwordHash = hasPassword ? await bcrypt.hash(password, BCRYPT_ROUNDS) : null;

  try {
    await withTransaction(async (client) => {
      let username = parsed.data.username || '';
      if (!username) {
        await userRepo.acquireGeneratedUsernameLock(client);
        username = await userRepo.allocateNextGeneratedUsername(client);
      }

      await userRepo.insertUser({
        id,
        username,
        displayName,
        passwordHash,
        isActive,
        mobile,
        email,
        accountStatus,
      }, client);
      await userRepo.replaceRoles(id, roles, client);
      if (organization) {
        await upsertUserOrganization(id, organization, client);
      }
      await writeAudit({
        actorUserId,
        action: 'user.create',
        entityType: 'user',
        entityId: id,
        detail: {
          username,
          roles: auditSafeRoles(roles),
          status: accountStatus,
          hasPassword,
        },
      }, client);
    });
  } catch (err) {
    const kind = uniqueViolationKind(err);
    if (kind === 'username') {
      throw appError('USERNAME_EXISTS', 'این نام کاربری قبلاً ثبت شده است.', 409);
    }
    if (kind === 'mobile') {
      throw appError('MOBILE_EXISTS', 'این شماره موبایل قبلاً ثبت شده است.', 409);
    }
    if (kind === 'email') {
      throw appError('EMAIL_EXISTS', 'این ایمیل قبلاً ثبت شده است.', 409);
    }
    throw err;
  }

  const user = await getUser(id);
  let invitation = null;
  if (user.status === 'INVITED' && user.mobile) {
    try {
      invitation = await authLifecycle.issueInvitation({
        userId: user.id,
        actorUserId,
        source: 'create',
      });
    } catch {
      invitation = { sent: false, error: 'INVITATION_FAILED' };
    }
  }
  return { user, invitation };
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
  const organization = Object.prototype.hasOwnProperty.call(body || {}, 'organization')
    || Object.prototype.hasOwnProperty.call(body || {}, 'unitId')
    ? resolveOrganizationInput({ ...patch, organization: body.organization, unitId: body.unitId, positionId: body.positionId, isManager: body.isManager })
    : undefined;

  const nextDisplayName = patch.fullName !== undefined
    ? patch.fullName
    : patch.displayName;
  const hasProfilePatch = nextDisplayName !== undefined
    || patch.isActive !== undefined
    || patch.status !== undefined
    || patch.mobile !== undefined
    || patch.email !== undefined
    || patch.roles !== undefined
    || organization !== undefined;
  if (!hasProfilePatch) {
    throw validationError('هیچ فیلدی برای به‌روزرسانی ارسال نشده است.');
  }

  const nextRoles = patch.roles ? uniqueRoles(patch.roles) : null;
  const touchesAdminInvariant = patch.isActive !== undefined
    || patch.status !== undefined
    || nextRoles !== null;

  try {
    return await withTransaction(async (client) => {
    if (touchesAdminInvariant) {
      await userRepo.acquireLastAdminLock(client);
      await userRepo.lockActiveAdminRows(client);
    }

    const locked = await userRepo.lockById(id, client);
    if (!locked) {
      throw appError('USER_NOT_FOUND', 'کاربر یافت نشد.', 404);
    }

    const currentRoles = await userRepo.listRoleCodes(id, client);
    if (nextRoles) await assertRolesAssignable(nextRoles, { alreadyAssigned: currentRoles }, client);

    let mobile = undefined;
    if (patch.mobile !== undefined) {
      mobile = parseMobileInput(patch.mobile, { required: false });
      if (mobile) {
        const existingMobile = await userRepo.findByMobile(mobile, client);
        if (existingMobile && existingMobile.id !== id) {
          throw appError('MOBILE_EXISTS', 'این شماره موبایل قبلاً ثبت شده است.', 409);
        }
      }
    }

    let email = undefined;
    if (patch.email !== undefined) {
      email = parseEmailInput(patch.email);
      if (email) {
        const existingEmail = await userRepo.findByEmail(email, client);
        if (existingEmail && existingEmail.id !== id) {
          throw appError('EMAIL_EXISTS', 'این ایمیل قبلاً ثبت شده است.', 409);
        }
      }
    }

    let nextStatus = locked.account_status;
    if (patch.status) {
      nextStatus = patch.status;
    } else if (patch.isActive !== undefined) {
      nextStatus = patch.isActive ? (locked.has_password ? 'ACTIVE' : 'INVITED') : 'INACTIVE';
    }

    if (nextStatus === 'ACTIVE' && locked.has_password !== true) {
      throw appError(
        'PASSWORD_REQUIRED',
        'فعال‌سازی حساب بدون رمز عبور ممکن نیست. این مرحله در دعوت پیامکی تکمیل می‌شود.',
        409,
      );
    }

    const nextIsActive = isActiveFlag(nextStatus);
    const resolvedRoles = nextRoles || currentRoles;

    const currentlyActiveAdmin = isAuthenticableAdmin(locked, currentRoles);
    const nextActiveAdmin = nextStatus === 'ACTIVE'
      && nextIsActive
      && locked.has_password === true
      && resolvedRoles.includes(ADMIN_ROLE_CODE);

    if (touchesAdminInvariant) {
      const activeAdminCount = await userRepo.countActiveAdmins(client);
      if (!wouldRemainActiveAdmin({ currentlyActiveAdmin, nextActiveAdmin, activeAdminCount })) {
        throw lastAdminError();
      }
    }

    await userRepo.updateUserFields(id, {
      displayName: nextDisplayName,
      isActive: nextIsActive,
      mobile,
      email,
      accountStatus: nextStatus,
    }, client);

    if (nextRoles) {
      await userRepo.replaceRoles(id, nextRoles, client);
    }

    if (organization !== undefined) {
      await upsertUserOrganization(id, organization, client);
    }

    const changedFields = [];
    if (nextDisplayName !== undefined && nextDisplayName !== locked.display_name) {
      changedFields.push('displayName');
    }
    if (mobile !== undefined && mobile !== (locked.mobile || null)) {
      changedFields.push('mobile');
    }
    if (email !== undefined && email !== (locked.email || null)) {
      changedFields.push('email');
    }
    if (nextStatus !== locked.account_status) {
      changedFields.push('status');
      await writeAudit({
        actorUserId,
        action: nextStatus === 'INACTIVE' ? 'user.deactivate' : 'user.activate',
        entityType: 'user',
        entityId: id,
        detail: { previous: locked.account_status, next: nextStatus },
      }, client);
    }
    if (organization !== undefined) {
      changedFields.push('organization');
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
  } catch (err) {
    const kind = uniqueViolationKind(err);
    if (kind === 'mobile') {
      throw appError('MOBILE_EXISTS', 'این شماره موبایل قبلاً ثبت شده است.', 409);
    }
    if (kind === 'email') {
      throw appError('EMAIL_EXISTS', 'این ایمیل قبلاً ثبت شده است.', 409);
    }
    throw err;
  }
}

export async function resendInvitation(id, actorUserId) {
  return authLifecycle.issueInvitation({
    userId: id,
    actorUserId,
    source: 'resend',
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
    await userRepo.updatePasswordHash(id, passwordHash, client, { activateInvited: true });
    await writeAudit({
      actorUserId,
      action: 'user.password.reset',
      entityType: 'user',
      entityId: id,
      detail: { fields: ['password'] },
    }, client);
  });

  return { ok: true, user: await getUser(id) };
}
