import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { loadUserAuth, signAccessToken } from '../middleware/auth.js';
import { writeAudit } from '../lib/ids.js';
import { GENERIC_LOGIN_MESSAGE } from '../domain/userAccount/authChallenges.js';
import { resolveLoginIdentifier } from '../domain/userAccount/loginIdentifier.js';
import { canAuthenticate } from '../domain/userAccount/accountStatus.js';
import * as userRepo from '../repositories/userRepository.js';

const loginSchema = z.object({
  mobile: z.string().optional(),
  username: z.string().optional(),
  identifier: z.string().optional(),
  password: z.string().min(1),
}).refine((value) => String(value.mobile || value.username || value.identifier || '').trim(), {
  message: 'شماره موبایل و رمز عبور الزامی است.',
});

function invalidCredentials() {
  const err = new Error(GENERIC_LOGIN_MESSAGE);
  err.status = 401;
  err.code = 'INVALID_CREDENTIALS';
  return err;
}

export async function login(body) {
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const err = new Error('شماره موبایل و رمز عبور الزامی است.');
    err.status = 400;
    err.code = 'VALIDATION';
    throw err;
  }

  const { password } = parsed.data;
  const identifier = resolveLoginIdentifier(parsed.data);
  if (!identifier.ok) {
    const err = new Error(identifier.message);
    err.status = 400;
    err.code = 'VALIDATION';
    throw err;
  }

  const row = await userRepo.findLoginRow({ kind: identifier.kind, value: identifier.value });
  const allowed = row && canAuthenticate({
    isActive: row.is_active,
    accountStatus: row.account_status,
    hasPassword: Boolean(row.password_hash),
  });
  if (!row || !allowed) {
    throw invalidCredentials();
  }

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    throw invalidCredentials();
  }

  const user = await loadUserAuth(row.id);
  const accessToken = signAccessToken(user);
  await writeAudit({
    actorUserId: user.id,
    action: 'auth.login',
    entityType: 'user',
    entityId: user.id,
  });

  return {
    accessToken,
    tokenType: 'Bearer',
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles,
      permissions: user.permissions,
    },
  };
}

export async function me(userId) {
  const user = await loadUserAuth(userId);
  if (!user) {
    const err = new Error('کاربر یافت نشد.');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  return user;
}
