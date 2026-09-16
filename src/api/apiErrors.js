/**
 * Shared API error helpers — 401 vs 403 must not be conflated.
 */
export const FORBIDDEN_MESSAGE = 'شما مجوز انجام این عملیات را ندارید.';
export const UNAUTHORIZED_MESSAGE = 'نشست شما منقضی شده است. دوباره وارد شوید.';

export function getApiErrorStatus(error) {
  return error?.response?.status || error?.status || null;
}

export function isUnauthorizedError(error) {
  return getApiErrorStatus(error) === 401;
}

export function isForbiddenError(error) {
  return getApiErrorStatus(error) === 403;
}

export function getApiErrorMessage(error, fallback = 'خطای ارتباط با سرور') {
  if (isForbiddenError(error)) {
    return error?.response?.data?.message || FORBIDDEN_MESSAGE;
  }
  if (isUnauthorizedError(error)) {
    return error?.response?.data?.message || UNAUTHORIZED_MESSAGE;
  }
  return error?.response?.data?.message || error?.message || fallback;
}

export default {
  FORBIDDEN_MESSAGE,
  UNAUTHORIZED_MESSAGE,
  isUnauthorizedError,
  isForbiddenError,
  getApiErrorMessage,
};
