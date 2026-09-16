/**
 * Auth challenge policy (DDL-41).
 * Pure helpers — hashing uses a caller-supplied digest so tests stay crypto-free.
 */

export const CHALLENGE_PURPOSES = Object.freeze({
  INVITATION: 'INVITATION',
  OTP: 'OTP',
  PASSWORD_RESET: 'PASSWORD_RESET',
});

export const INVITATION_TTL_MS = 72 * 60 * 60 * 1000;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_HOUR = 5;
export const OTP_LENGTH = 6;
export const MIN_PASSWORD_LENGTH = 8;

export const GENERIC_FORGOT_MESSAGE = 'اگر این شماره در سامانه باشد، پیامک ارسال می‌شود.';
export const GENERIC_LOGIN_MESSAGE = 'شماره موبایل یا رمز عبور نادرست است.';

export function isChallengeOpen(row, now = new Date()) {
  if (!row || row.consumed_at || row.consumedAt) return false;
  const expires = new Date(row.expires_at || row.expiresAt);
  return expires.getTime() > now.getTime();
}

export function otpAttemptsExceeded(row) {
  const count = Number(row?.attempt_count ?? row?.attemptCount ?? 0);
  return count >= OTP_MAX_ATTEMPTS;
}

export function shouldThrottleOtp(latestCreatedAt, now = new Date()) {
  if (!latestCreatedAt) return false;
  const created = new Date(latestCreatedAt).getTime();
  return Number.isFinite(created) && (now.getTime() - created) < OTP_RESEND_COOLDOWN_MS;
}

export function hourlyOtpLimitReached(countInWindow) {
  return Number(countInWindow || 0) >= OTP_MAX_PER_HOUR;
}

export function assertPasswordPolicy(password) {
  const value = String(password || '');
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} نویسه باشد.` };
  }
  return { ok: true };
}
