process.env.JARIAN_SKIP_LISTEN = '1';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../index.js';

function mountedPaths(app) {
  const router = app.router || app._router;
  assert.ok(router, 'express router missing');
  return router.stack
    .filter((layer) => layer.route || layer.name === 'router' || layer.regexp)
    .map((layer) => {
      const src = String(layer.regexp || '');
      return src;
    })
    .join('\n');
}

describe('Phase 2.1 public HTTP mount', () => {
  it('still mounts CRM and tasks under the same /api/v1 prefixes', () => {
    const app = createApp();
    const stack = mountedPaths(app);
    for (const prefix of [
      '/api/v1/companies',
      '/api/v1/contacts',
      '/api/v1/leads',
      '/api/v1/lead-pipelines',
      '/api/v1/identity',
      '/api/v1/tasks',
      '/api/v1/activities',
      '/api/v1/activity-types',
    ]) {
      const escaped = prefix.replace(/\//g, '\\/');
      assert.match(stack, new RegExp(escaped), `missing mount ${prefix}`);
    }
  });
});
