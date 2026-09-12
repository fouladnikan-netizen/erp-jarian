import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sniffLogoMime, validateLogoBytes, MAX_LOGO_BYTES } from '../domain/organizationIdentity/logoFile.js';

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('organization identity logoFile', () => {
  it('sniffs PNG magic bytes', () => {
    assert.equal(sniffLogoMime(PNG_1x1), 'image/png');
  });

  it('rejects non-image bytes', () => {
    const check = validateLogoBytes({
      fileName: 'x.png',
      mimeType: 'image/png',
      bytes: Buffer.from('hello'),
    });
    assert.equal(check.ok, false);
  });

  it('rejects oversize', () => {
    const bytes = Buffer.alloc(MAX_LOGO_BYTES + 1, 0x89);
    bytes[0] = 0x89;
    bytes[1] = 0x50;
    bytes[2] = 0x4e;
    bytes[3] = 0x47;
    bytes[4] = 0x0d;
    bytes[5] = 0x0a;
    bytes[6] = 0x1a;
    bytes[7] = 0x0a;
    const check = validateLogoBytes({ fileName: 'big.png', mimeType: 'image/png', bytes });
    assert.equal(check.ok, false);
  });

  it('accepts a tiny PNG', () => {
    const check = validateLogoBytes({ fileName: 'dot.png', mimeType: 'image/png', bytes: PNG_1x1 });
    assert.equal(check.ok, true);
    assert.equal(check.mimeType, 'image/png');
  });
});
