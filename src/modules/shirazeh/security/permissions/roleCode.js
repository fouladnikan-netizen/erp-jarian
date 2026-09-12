export const ROLE_CODE_PATTERN = /^[a-z][a-z0-9_]{0,47}$/;

export function normalizeRoleCode(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidRoleCode(value) {
  return ROLE_CODE_PATTERN.test(normalizeRoleCode(value));
}

export function roleCreateBlockReason(labelFa) {
  if (String(labelFa || '').trim()) return '';
  return 'نام نقش را وارد کنید.';
}

export function roleNameConflictMessage(labelFa, existingRoleIsActive) {
  const label = String(labelFa || '').trim();
  if (existingRoleIsActive === false) {
    return `نقش «${label}» قبلاً ایجاد شده اما غیرفعال است.`;
  }
  return `نقش «${label}» قبلاً وجود دارد.`;
}

export function activeUserWarning(count) {
  const n = Number(count) || 0;
  if (n <= 0) return '';
  return `این نقش به ${n} کاربر فعال اختصاص دارد.`;
}
