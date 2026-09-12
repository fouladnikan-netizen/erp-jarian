import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logError } from './requestContext.js';

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    if (err.status >= 500) logError(err, req);
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
      ...(err.code === 'ROLE_NAME_ALREADY_EXISTS' && err.details && typeof err.details === 'object'
        ? {
          code: err.code,
          existingRoleCode: err.details.existingRoleCode,
          existingRoleIsActive: err.details.existingRoleIsActive,
        }
        : {}),
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'VALIDATION',
      message: 'داده نامعتبر است.',
      details: err.flatten(),
    });
  }

  logError(err, req);
  if (err?.code === '23505') {
    return res.status(409).json({
      error: 'DUPLICATE',
      message: 'این مورد قبلاً ثبت شده است.',
    });
  }
  const raw = String(err.message || '');
  const looksLikeDatabase = err.code && /^\d{5}$/.test(String(err.code));
  const looksLikePgEnglish = /duplicate key|unique constraint|violates |syntax error/i.test(raw);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.code && !/^\d{5}$/.test(String(err.code)) ? err.code : 'INTERNAL_ERROR',
    message: looksLikeDatabase || looksLikePgEnglish
      ? 'ثبت انجام نشد. دوباره تلاش کنید.'
      : (raw || 'خطای داخلی سرور'),
    ...(err.details !== undefined ? { details: err.details } : {}),
  });
}

export function notFound(_req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'مسیر یافت نشد.' });
}
