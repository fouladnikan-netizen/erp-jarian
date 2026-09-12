import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCorsOptions, parseAllowedOrigins } from '../modules/shared/http/corsOptions.js';
import { DEV_JWT_SECRET_FALLBACK, resolveJwtExpiresIn, resolveJwtSecret } from '../modules/shared/http/jwtPolicy.js';
import { isLegacyAiGatewayEnabled } from '../modules/shared/ai/legacyAiGateway.js';

describe('CORS / JWT / AI quarantine policy', () => {
  it('reflects any origin in development', () => {
    const opts = createCorsOptions({ nodeEnv: 'development', appPublicUrl: 'http://localhost:3000' });
    assert.equal(opts.origin, true);
    assert.equal(opts.credentials, true);
  });

  it('allow-lists origins in production', async () => {
    const opts = createCorsOptions({
      nodeEnv: 'production',
      appPublicUrl: 'https://app.example.com',
      corsOrigins: 'https://app.example.com, https://admin.example.com',
    });
    assert.equal(typeof opts.origin, 'function');
    const allowed = await new Promise((resolve, reject) => {
      opts.origin('https://admin.example.com', (err, value) => (err ? reject(err) : resolve(value)));
    });
    assert.equal(allowed, true);
    await assert.rejects(
      () => new Promise((resolve, reject) => {
        opts.origin('https://evil.example', (err, value) => (err ? reject(err) : resolve(value)));
      }),
      /CORS_FORBIDDEN/,
    );
    assert.deepEqual(
      parseAllowedOrigins('https://a.com, https://a.com', 'https://b.com'),
      ['https://a.com', 'https://b.com'],
    );
  });

  it('rejects default JWT secret in production', () => {
    assert.equal(resolveJwtSecret({ NODE_ENV: 'development' }), DEV_JWT_SECRET_FALLBACK);
    assert.throws(
      () => resolveJwtSecret({ NODE_ENV: 'production' }),
      /JWT_SECRET must be a non-default/,
    );
    assert.equal(
      resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'prod-secret-ok' }),
      'prod-secret-ok',
    );
    assert.equal(resolveJwtExpiresIn({ NODE_ENV: 'production' }), '8h');
  });

  it('disables glued AI routes in production unless explicitly enabled', () => {
    assert.equal(isLegacyAiGatewayEnabled({ NODE_ENV: 'development' }), true);
    assert.equal(isLegacyAiGatewayEnabled({ NODE_ENV: 'production' }), false);
    assert.equal(isLegacyAiGatewayEnabled({ NODE_ENV: 'production', AI_ROUTES_ENABLED: '1' }), true);
    assert.equal(isLegacyAiGatewayEnabled({ NODE_ENV: 'development', AI_ROUTES_ENABLED: '0' }), false);
  });
});
