/**
 * JWT secret policy — development may use a well-known fallback;
 * production must set a non-default JWT_SECRET.
 */
export const DEV_JWT_SECRET_FALLBACK = 'jarian-dev-secret-change-me';

export function resolveJwtSecret(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const value = env.JWT_SECRET ?? DEV_JWT_SECRET_FALLBACK;
  if (nodeEnv === 'production') {
    if (!env.JWT_SECRET || env.JWT_SECRET === DEV_JWT_SECRET_FALLBACK) {
      throw new Error('JWT_SECRET must be a non-default value when NODE_ENV=production');
    }
  }
  return value;
}

export function resolveJwtExpiresIn(env = process.env) {
  if (env.JWT_EXPIRES_IN) return env.JWT_EXPIRES_IN;
  return env.NODE_ENV === 'production' ? '8h' : '12h';
}
