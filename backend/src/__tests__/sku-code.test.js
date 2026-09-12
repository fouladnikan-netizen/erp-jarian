import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  suggestTwoLetterSkuCode,
  suggestSkuCodeCandidates,
  pickSkuCode,
  buildProductSku,
  formatIdentitySkuSegment,
} from '../domain/productMaster/skuCode.js';
import { allocateSku } from '../domain/productMaster/skuGenerator.js';

describe('mnemonic SKU codes (DDL-24m)', () => {
  it('takes two-letter initials from significant Latin words', () => {
    assert.equal(suggestTwoLetterSkuCode('Carbon Steel Products'), 'CS');
    assert.equal(suggestTwoLetterSkuCode('Hot Rolled Sheets'), 'HR');
    assert.equal(suggestTwoLetterSkuCode('Stainless Steel Products'), 'SS');
    assert.equal(suggestTwoLetterSkuCode('Piping Fittings'), 'PF');
  });

  it('collapses a single long word to two letters and keeps short tokens', () => {
    assert.equal(suggestTwoLetterSkuCode('Fasteners'), 'Fa');
    assert.equal(suggestTwoLetterSkuCode('Profiles'), 'Pr');
    assert.equal(suggestTwoLetterSkuCode('Black'), 'Black');
    assert.equal(suggestTwoLetterSkuCode('IPE'), 'IPE');
  });

  it('on collision uses three leading letters then longer prefixes', () => {
    const taken = new Set(['cs']);
    assert.equal(pickSkuCode({ latinName: 'Carbon Steel Products', takenKeys: taken }), 'Car');
  });

  it('honors an explicit override such as Black or Sq', () => {
    assert.equal(pickSkuCode({ latinName: 'Hot Rolled Sheets (HR)', explicit: 'Black', takenKeys: [] }), 'Black');
    assert.equal(pickSkuCode({ latinName: 'Square & Rectangular Hollow Sections', explicit: 'Sq', takenKeys: [] }), 'Sq');
  });

  it('builds the product SKU from taxonomy codes + identity values', () => {
    assert.equal(
      buildProductSku({ groupSku: 'CS', categorySku: 'HR', typeSku: 'Black', identitySegments: ['10'] }),
      'CS-HR-Black-10',
    );
    assert.equal(
      buildProductSku({ groupSku: 'CS', categorySku: 'Pr', typeSku: 'Sq', identitySegments: ['2', '40', '40'] }),
      'CS-Pr-Sq-2-40-40',
    );
  });

  it('formats numeric identity values without trailing zeros or Persian digits', () => {
    assert.equal(formatIdentitySkuSegment('DECIMAL', '10'), '10');
    assert.equal(formatIdentitySkuSegment('DECIMAL', '2'), '2');
  });

  it('keeps Persian ENUM identity when there are no Latin letters', () => {
    assert.equal(formatIdentitySkuSegment('ENUM', 'خرپایی'), 'خرپایی');
    assert.equal(formatIdentitySkuSegment('ENUM', 'نردبانی'), 'نردبانی');
  });

  it('allocateSku uses identity-relevant attributes, not required', () => {
    const { sku } = allocateSku({
      groupSkuCode: 'CS',
      categorySkuCode: 'HR',
      typeSkuCode: 'Black',
      identityEntries: [
        { dataType: 'DECIMAL', normalized: '14', isRequired: true, isIdentityRelevant: true, sortOrder: 10 },
        { dataType: 'STRING', normalized: '1250x2500', isRequired: false, isIdentityRelevant: false, sortOrder: 20 },
      ],
    });
    assert.equal(sku, 'CS-HR-Black-14');
  });

  it('allocateSku includes required ENUM identity and omits STRING', () => {
    const { sku } = allocateSku({
      groupSkuCode: 'CS',
      categorySkuCode: 'Re',
      typeSkuCode: 'De',
      identityEntries: [
        { dataType: 'ENUM', normalized: 'A3', isRequired: true, isIdentityRelevant: true, sortOrder: 10 },
        { dataType: 'DECIMAL', normalized: '14', isRequired: true, isIdentityRelevant: true, sortOrder: 20 },
        { dataType: 'STRING', normalized: 'note', isRequired: false, isIdentityRelevant: false, sortOrder: 30 },
      ],
    });
    assert.equal(sku, 'CS-Re-De-A3-14');
  });

  it('allocateSku joins identity-relevant attributes in sort order', () => {
    const { sku } = allocateSku({
      groupSkuCode: 'CS',
      categorySkuCode: 'Pr',
      typeSkuCode: 'Sq',
      identityEntries: [
        { dataType: 'DECIMAL', normalized: '40', isIdentityRelevant: true, sortOrder: 20 },
        { dataType: 'DECIMAL', normalized: '2', isIdentityRelevant: true, sortOrder: 10 },
        { dataType: 'DECIMAL', normalized: '40', isIdentityRelevant: true, sortOrder: 30 },
        { dataType: 'STRING', normalized: 'ignored', isIdentityRelevant: false, sortOrder: 1 },
      ],
    });
    assert.equal(sku, 'CS-Pr-Sq-2-40-40');
  });

  it('rejects a duplicate explicit code in the same scope', () => {
    assert.throws(
      () => pickSkuCode({ explicit: 'CS', takenKeys: new Set(['cs']) }),
      (err) => err.code === 'SKU_CODE_DUPLICATE',
    );
  });
});
