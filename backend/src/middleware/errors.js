export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err, _req, res, _next) {
  console.error('[jarian-api]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'خطای داخلی سرور',
    details: err.details,
  });
}

export function notFound(_req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'مسیر یافت نشد.' });
}
