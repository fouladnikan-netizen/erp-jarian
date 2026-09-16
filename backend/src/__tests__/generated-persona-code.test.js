import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENERATED_PERSONA_CODE_RE,
  generatedPersonaNumber,
  nextGeneratedPersonaCode,
} from '../domain/persona/generatedPersonaCode.js';

describe('generatedPersonaCode', () => {
  it('allocates persona_1 when none exist and skips seed codes', () => {
    assert.equal(nextGeneratedPersonaCode(['SALES', 'PROCUREMENT', 'SYSTEM']), 'persona_1');
    assert.equal(GENERATED_PERSONA_CODE_RE.test('SALES'), false);
  });

  it('takes the highest numeric suffix including gaps', () => {
    assert.equal(nextGeneratedPersonaCode(['persona_1', 'persona_2', 'persona_5', 'SALES']), 'persona_6');
    assert.equal(generatedPersonaNumber('persona_12'), 12);
    assert.equal(generatedPersonaNumber('persona_'), null);
  });
});
