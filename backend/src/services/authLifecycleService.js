/**
 * Authentication lifecycle (DDL-41).
 * Invitation SMS, set-password, forgot-password OTP.
 * Persona is out of scope. Admin password reset stays on userService.
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config.js';
import { appError, fromZodError, validationError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import { withTransaction } from '../db/pool.js';
import { canAuthenticate } from '../domain/userAccount/accountStatus.js';
import {
  CHALLENGE_PURPOSES,
  GENERIC_FORGOT_MESSAGE,
  INVITATION_TTL_MS,
  MIN_PASSWORD_LENGTH,
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  assertPasswordPolicy,
  hourlyOtpLimitReached,
  isChallengeOpen,
  otpAttemptsExceeded,
  shouldThrottleOtp,
} from '../domain/userAccount/authChallenges.js';
import { normalizeMobile } from '../domain/identity/normalize.js';
import * as userRepo from '../repositories/userRepository.js';
import * as challengeRepo from '../repositories/authChallengeRepository.js';
import { sendInvitationSms, sendOtpSms } from '../integrations/farazSms/farazSmsClient.js';

const BCRYPT_ROUNDS = 10;

const setPasswordSchema = z.object({
  token: z.string().trim().min(16),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

const forgotSchema = z.object({
  mobile: z.string().trim().min(1),
});

const verifySchema = z.object({
  mobile: z.string().trim().min(1),
  code: z.string().trim().min(OTP_LENGTH).max(OTP_LENGTH),
});

function hashSecret(value) {
  return crypto.createHmac('sha256', config.jwtSecret).update(String(value)).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function randomOtp() {
  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

function parseMobileOrNull(raw) {
  const parsed = normalizeMobile(raw);
  return parsed.ok ? parsed.normalized : null;
}

function invitationUrl(token) {
  return `${config.appPublicUrl}/set-password?token=${encodeURIComponent(token)}`;
}

function dummyHashCompare(value) {
  const dummy = hashSecret('0'.repeat(64));
  const actual = Buffer.from(hashSecret(value));
  const expected = Buffer.from(dummy);
  try {
    crypto.timingSafeEqual(actual, expected);
  } catch {
    /* length mismatch is fine — this is a timing pad */
  }
}

async function applyPassword({ userId, password, actorUserId, action, client }) {
  const policy = assertPasswordPolicy(password);
  if (!policy.ok) throw validationError(policy.message);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await userRepo.updatePasswordHash(userId, passwordHash, client, { activateInvited: true });
  await writeAudit({
    actorUserId: actorUserId || userId,
    action,
    entityType: 'user',
    entityId: userId,
    detail: { fields: ['password'] },
  }, client);
}

export async function issueInvitation({ userId, actorUserId, source = 'create' }) {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw appError('USER_NOT_FOUND', 'کاربر یافت نشد.', 404);
  }
  if (user.status !== 'INVITED') {
    throw appError('INVITATION_NOT_ALLOWED', 'فقط کاربر دعوت‌شده می‌تواند دعوتنامه دریافت کند.', 409);
  }
  if (!user.mobile) {
    throw validationError('شماره موبایل برای ارسال دعوتنامه الزامی است.');
  }

  const token = randomToken();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  await withTransaction(async (client) => {
    await challengeRepo.consumeOpenByPurpose(userId, CHALLENGE_PURPOSES.INVITATION, client);
    await challengeRepo.insertChallenge({
      id: newEntityId('ach'),
      userId,
      purpose: CHALLENGE_PURPOSES.INVITATION,
      secretHash: hashSecret(token),
      expiresAt,
      createdBy: actorUserId || null,
    }, client);
    await writeAudit({
      actorUserId: actorUserId || null,
      action: 'auth.invitation.issue',
      entityType: 'user',
      entityId: userId,
      detail: { source },
    }, client);
  });

  const sms = await sendInvitationSms({ mobile: user.mobile, url: invitationUrl(token) });
  return {
    sent: sms.ok === true,
    channel: sms.channel,
    error: sms.ok ? undefined : sms.error,
  };
}

export async function peekInvitation(token) {
  const raw = String(token || '').trim();
  if (!raw) {
    throw appError('INVALID_OR_EXPIRED', 'پیوند تعیین رمز نامعتبر یا منقضی است.', 400);
  }
  const row = await challengeRepo.findOpenByHash(CHALLENGE_PURPOSES.INVITATION, hashSecret(raw));
  if (!isChallengeOpen(row)) {
    throw appError('INVALID_OR_EXPIRED', 'پیوند تعیین رمز نامعتبر یا منقضی است.', 400);
  }
  const user = await userRepo.findById(row.user_id);
  if (!user || user.status === 'INACTIVE') {
    throw appError('INVALID_OR_EXPIRED', 'پیوند تعیین رمز نامعتبر یا منقضی است.', 400);
  }
  return { valid: true };
}

export async function setPasswordWithToken(body) {
  const parsed = setPasswordSchema.safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'رمز عبور نامعتبر است.');
  const { token, password } = parsed.data;

  const invitation = await challengeRepo.findOpenByHash(CHALLENGE_PURPOSES.INVITATION, hashSecret(token));
  const reset = invitation
    ? null
    : await challengeRepo.findOpenByHash(CHALLENGE_PURPOSES.PASSWORD_RESET, hashSecret(token));
  const row = invitation || reset;
  if (!isChallengeOpen(row)) {
    throw appError('INVALID_OR_EXPIRED', 'پیوند تعیین رمز نامعتبر یا منقضی است.', 400);
  }

  const purpose = row.purpose;
  await withTransaction(async (client) => {
    const locked = await userRepo.lockById(row.user_id, client);
    if (!locked || locked.account_status === 'INACTIVE' || locked.is_active === false) {
      throw appError('INVALID_OR_EXPIRED', 'پیوند تعیین رمز نامعتبر یا منقضی است.', 400);
    }
    if (purpose === CHALLENGE_PURPOSES.INVITATION && locked.account_status !== 'INVITED') {
      throw appError('INVALID_OR_EXPIRED', 'پیوند تعیین رمز نامعتبر یا منقضی است.', 400);
    }
    await applyPassword({
      userId: row.user_id,
      password,
      actorUserId: row.user_id,
      action: purpose === CHALLENGE_PURPOSES.INVITATION ? 'auth.password.set' : 'auth.password.reset',
      client,
    });
    await challengeRepo.consumeById(row.id, client);
    await challengeRepo.consumeOpenByPurpose(row.user_id, CHALLENGE_PURPOSES.OTP, client);
    await challengeRepo.consumeOpenByPurpose(row.user_id, CHALLENGE_PURPOSES.PASSWORD_RESET, client);
    if (purpose === CHALLENGE_PURPOSES.INVITATION) {
      await challengeRepo.consumeOpenByPurpose(row.user_id, CHALLENGE_PURPOSES.INVITATION, client);
    }
  });

  return { ok: true };
}

function forgotAccepted() {
  return { ok: true, message: GENERIC_FORGOT_MESSAGE };
}

export async function requestPasswordReset(body) {
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) return forgotAccepted();
  const mobile = parseMobileOrNull(parsed.data.mobile);
  if (!mobile) return forgotAccepted();

  const user = await userRepo.findByMobile(mobile);
  if (!user || user.status !== 'ACTIVE' || user.hasPassword !== true) {
    dummyHashCompare(mobile);
    return forgotAccepted();
  }

  const latest = await challengeRepo.findLatest(user.id, CHALLENGE_PURPOSES.OTP);
  if (shouldThrottleOtp(latest?.created_at)) {
    return forgotAccepted();
  }
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourCount = await challengeRepo.countCreatedSince(user.id, CHALLENGE_PURPOSES.OTP, hourAgo);
  if (hourlyOtpLimitReached(hourCount)) {
    return forgotAccepted();
  }

  const code = randomOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await withTransaction(async (client) => {
    await challengeRepo.consumeOpenByPurpose(user.id, CHALLENGE_PURPOSES.OTP, client);
    await challengeRepo.insertChallenge({
      id: newEntityId('ach'),
      userId: user.id,
      purpose: CHALLENGE_PURPOSES.OTP,
      secretHash: hashSecret(code),
      expiresAt,
      createdBy: null,
    }, client);
    await writeAudit({
      actorUserId: user.id,
      action: 'auth.otp.issue',
      entityType: 'user',
      entityId: user.id,
      detail: { purpose: 'PASSWORD_RESET' },
    }, client);
  });

  await sendOtpSms({ mobile, code });
  return forgotAccepted();
}

export async function verifyPasswordResetOtp(body) {
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    throw appError('INVALID_OR_EXPIRED', 'کد تأیید نامعتبر یا منقضی است.', 400);
  }
  const mobile = parseMobileOrNull(parsed.data.mobile);
  const code = String(parsed.data.code || '').replace(/\D/g, '');
  if (!mobile || code.length !== OTP_LENGTH) {
    dummyHashCompare(code || '000000');
    throw appError('INVALID_OR_EXPIRED', 'کد تأیید نامعتبر یا منقضی است.', 400);
  }

  const user = await userRepo.findByMobile(mobile);
  if (!user || user.status !== 'ACTIVE') {
    dummyHashCompare(code);
    throw appError('INVALID_OR_EXPIRED', 'کد تأیید نامعتبر یا منقضی است.', 400);
  }

  const row = await challengeRepo.findLatestOpen(user.id, CHALLENGE_PURPOSES.OTP);
  if (!isChallengeOpen(row) || otpAttemptsExceeded(row)) {
    dummyHashCompare(code);
    throw appError('INVALID_OR_EXPIRED', 'کد تأیید نامعتبر یا منقضی است.', 400);
  }

  const expected = Buffer.from(row.secret_hash);
  const actual = Buffer.from(hashSecret(code));
  const match = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!match) {
    const attempts = await challengeRepo.incrementAttempts(row.id);
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await challengeRepo.consumeById(row.id);
    }
    throw appError('INVALID_OR_EXPIRED', 'کد تأیید نامعتبر یا منقضی است.', 400);
  }

  const resetToken = randomToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await withTransaction(async (client) => {
    await challengeRepo.consumeById(row.id, client);
    await challengeRepo.consumeOpenByPurpose(user.id, CHALLENGE_PURPOSES.PASSWORD_RESET, client);
    await challengeRepo.insertChallenge({
      id: newEntityId('ach'),
      userId: user.id,
      purpose: CHALLENGE_PURPOSES.PASSWORD_RESET,
      secretHash: hashSecret(resetToken),
      expiresAt,
      createdBy: user.id,
    }, client);
    await writeAudit({
      actorUserId: user.id,
      action: 'auth.otp.verify',
      entityType: 'user',
      entityId: user.id,
      detail: { purpose: 'PASSWORD_RESET' },
    }, client);
  });

  return { ok: true, resetToken };
}

export function canIssueInvitation(user) {
  return Boolean(user && user.status === 'INVITED' && user.mobile);
}

export { canAuthenticate, GENERIC_FORGOT_MESSAGE };
