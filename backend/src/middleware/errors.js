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
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'خطای داخلی سرور',
    ...(err.details !== undefined ? { details: err.details } : {}),
  });
}

export function notFound(_req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'مسیر یافت نشد.' });
}
