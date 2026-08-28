/**
 * Identity normalization unit tests (DDL-25.1).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toAsciiDigits,
  normalizeMobile,
  normalizeEmail,
  normalizeCompanyName,
  normalizePersonName,
  normalizeNationalId,
  tokenOverlapSimilarity,
} from '../domain/identity/normalize.js';

describe('identity normalize (DDL-25)', () => {
  it('folds Persian/Arabic digits', () => {
    assert.equal(toAsciiDigits('۰۹۱۲۳۴۵۶۷۸'), '0912345678');
    assert.equal(toAsciiDigits('٠٩١٢٣٤٥٦٧٨'), '0912345678');
  });

  it('normalizes Iranian mobile', () => {
    const r = normalizeMobile('۰۹۱۲۱۲۳۴۵۶۷');
    assert.equal(r.ok, true);
    assert.equal(r.normalized, '09121234567');
  });

  it('normalizes email', () => {
    const r = normalizeEmail('  Test@Example.COM ');
    assert.equal(r.ok, true);
    assert.equal(r.normalized, 'test@example.com');
  });

  it('normalizes company and person names for comparison', () => {
    assert.equal(normalizeCompanyName('  فولاد   مبارکه '), normalizeCompanyName('فولاد مبارکه'));
    assert.equal(normalizePersonName('  علی   رضایی '), normalizePersonName('علی رضایی'));
  });

  it('validates nationalId length', () => {
    const ok = normalizeNationalId('12345678901');
    assert.equal(ok.ok, true);
    const bad = normalizeNationalId('123');
    assert.equal(bad.ok, false);
  });

  it('token overlap flags similar company names', () => {
    const score = tokenOverlapSimilarity('فولاد مبارکه', 'فولاد مبارکه اصفهان');
    assert.ok(score >= 0.5);
  });
});
