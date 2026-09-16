/**
 * Standard API errors — see Docs/architecture/BACKEND_FOUNDATION.md
 */
export class AppError extends Error {
  /**
   * @param {string} code machine-readable e.g. VALIDATION, NOT_FOUND
   * @param {string} message human-readable (Persian OK)
   * @param {{ status?: number, details?: unknown }} [options]
   */
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = options.status ?? 500;
    this.details = options.details;
  }
}

export function validationError(message, details) {
  return new AppError('VALIDATION', message, { status: 400, details });
}

export function notFoundError(message = 'مورد یافت نشد.') {
  return new AppError('NOT_FOUND', message, { status: 404 });
}

export function conflictError(message, details) {
  return new AppError('VERSION_CONFLICT', message, { status: 409, details });
}

export function appError(code, message, status = 400, details) {
  return new AppError(code, message, { status, details });
}

export function fromZodError(parsed, message = 'داده نامعتبر است.') {
  return validationError(message, parsed.error.flatten());
}
