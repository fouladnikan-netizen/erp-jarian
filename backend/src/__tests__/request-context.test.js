import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requestContext, logError } from '../middleware/requestContext.js';

function mockRes() {
  const headers = {};
  const listeners = {};
  return {
    headers,
    setHeader(name, value) { headers[name] = value; },
    on(event, fn) {
      listeners[event] = fn;
    },
    finish() {
      listeners.finish?.();
    },
    statusCode: 200,
  };
}

describe('requestContext', () => {
  it('assigns X-Request-Id and includes it in error logs', () => {
    const req = { headers: {}, method: 'GET', url: '/api/health', originalUrl: '/api/health' };
    const res = mockRes();
    requestContext(req, res, () => {});
    assert.equal(typeof req.requestId, 'string');
    assert.ok(req.requestId.length > 0);
    assert.equal(res.headers['X-Request-Id'], req.requestId);

    const lines = [];
    const original = console.error;
    console.error = (msg) => { lines.push(msg); };
    try {
      logError(new Error('boom'), req);
    } finally {
      console.error = original;
    }
    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.requestId, req.requestId);
    assert.equal(parsed.msg, 'http_error');
  });

  it('honors incoming X-Request-Id', () => {
    const req = { headers: { 'x-request-id': 'client-trace-1' }, method: 'GET', url: '/' };
    const res = mockRes();
    requestContext(req, res, () => {});
    assert.equal(req.requestId, 'client-trace-1');
  });
});
