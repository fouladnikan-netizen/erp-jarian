import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PERSONA_CODE_RE,
  assertPersonaCode,
  normalizePersonaCode,
  normalizePersonaLabel,
} from '../domain/persona/normalize.js';

describe('persona domain', () => {
  it('normalizes codes to uppercase technical identifiers', () => {
    assert.equal(normalizePersonaCode(' sales '), 'SALES');
    assert.equal(normalizePersonaCode('Procurement'), 'PROCUREMENT');
    assert.ok(PERSONA_CODE_RE.test('SALES'));
    assert.ok(PERSONA_CODE_RE.test('PROCUREMENT'));
    assert.equal(assertPersonaCode('sales').ok, true);
    assert.equal(assertPersonaCode('sales').code, 'SALES');
  });

  it('rejects codes that are not technical identifiers', () => {
    assert.equal(assertPersonaCode('').ok, false);
    assert.equal(assertPersonaCode('شوالیه').ok, false);
    assert.equal(assertPersonaCode('sales-lead').ok, false);
    assert.equal(assertPersonaCode('1SALES').ok, false);
  });

  it('keeps generated persona_N codes lowercase', () => {
    assert.equal(normalizePersonaCode('persona_12'), 'persona_12');
    assert.equal(normalizePersonaCode('PERSONA_12'), 'persona_12');
    assert.equal(assertPersonaCode('persona_12').ok, true);
    assert.equal(assertPersonaCode('PERSONA_12').code, 'persona_12');
  });

  it('trims and collapses display labels without inventing business rules', () => {
    assert.equal(normalizePersonaLabel('  شوالیه  '), 'شوالیه');
    assert.equal(normalizePersonaLabel('مالی  و   حسابداری'), 'مالی و حسابداری');
  });
});
