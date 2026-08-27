import { randomUUID } from 'node:crypto';

/**
 * Lightweight request context: X-Request-Id + structured console logs.
 * Foundation only — not a full APM stack.
 */
export function requestContext(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && incoming.trim()
    ? incoming.trim().slice(0, 64)
    : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const started = Date.now();
  res.on('finish', () => {
    const actor = req.auth?.userId || null;
    const line = {
      level: 'info',
      msg: 'http_request',
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: Date.now() - started,
      actor,
    };
    console.log(JSON.stringify(line));
  });

  next();
}

export function logError(err, req) {
  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'http_error',
      requestId: req?.requestId || null,
      actor: req?.auth?.userId || null,
      error: err?.code || err?.name || 'Error',
      message: err?.message || String(err),
    }),
  );
}
