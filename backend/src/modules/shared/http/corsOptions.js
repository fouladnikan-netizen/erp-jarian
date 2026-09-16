/**
 * Env-based CORS. Local DX keeps reflecting any origin.
 * Non-development: allow-list from CORS_ORIGINS or APP_PUBLIC_URL.
 */
export function isLocalDevEnv(nodeEnv) {
  return nodeEnv === 'development' || nodeEnv === 'test' || !nodeEnv;
}

export function parseAllowedOrigins(corsOrigins, appPublicUrl) {
  const raw = [corsOrigins, appPublicUrl]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(raw)];
}

export function createCorsOptions({
  nodeEnv = process.env.NODE_ENV || 'development',
  appPublicUrl = '',
  corsOrigins = process.env.CORS_ORIGINS,
} = {}) {
  if (isLocalDevEnv(nodeEnv)) {
    return { origin: true, credentials: true };
  }

  const allowed = parseAllowedOrigins(corsOrigins, appPublicUrl);
  return {
    origin(origin, callback) {
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS_FORBIDDEN'));
    },
    credentials: true,
  };
}
