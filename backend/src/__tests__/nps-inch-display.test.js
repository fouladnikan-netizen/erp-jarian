/**
 * NPS inch display labels (not SKU / not mm↔inch conversion).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyNpsInchSizeDisplay,
  formatNpsInchDisplay,
  npsInchLatinLabel,
} from '../domain/productMaster/npsInchDisplay.js';

describe('npsInchDisplay', () => {
  it('maps stored decimal inches to Persian fraction + اینچ', () => {
    assert.equal(npsInchLatinLabel(0.5), '1/2');
    assert.equal(formatNpsInchDisplay(0.5), '۱/۲ اینچ');
    assert.equal(formatNpsInchDisplay(0.75), '۳/۴ اینچ');
    assert.equal(formatNpsInchDisplay(1), '۱ اینچ');
    assert.equal(formatNpsInchDisplay(1.25), '۱ ۱/۴ اینچ');
    assert.equal(formatNpsInchDisplay(1.5), '۱ ۱/۲ اینچ');
    assert.equal(formatNpsInchDisplay(2), '۲ اینچ');
    assert.equal(formatNpsInchDisplay(2.5), '۲ ۱/۲ اینچ');
    assert.equal(formatNpsInchDisplay(3), '۳ اینچ');
    assert.equal(formatNpsInchDisplay(4), '۴ اینچ');
    assert.equal(formatNpsInchDisplay(8), '۸ اینچ');
    assert.equal(formatNpsInchDisplay(10), '۱۰ اینچ');
    assert.equal(formatNpsInchDisplay(24), '۲۴ اینچ');
    assert.equal(formatNpsInchDisplay(32), '۳۲ اینچ');
    assert.equal(formatNpsInchDisplay(7), '۷ اینچ');
    assert.equal(formatNpsInchDisplay(36), '۳۶ اینچ');
  });

  it('replaces میل on size for pipe Types, including size_pipe', () => {
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'لوله تست گاز',
        code: 'size_pipe',
        displayValue: '0.5',
        unitLabel: 'اینچ',
      }),
      { displayValue: '۱/۲ اینچ', unitLabel: null },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'لوله تست گاز',
        code: 'size',
        displayValue: '0.5',
        unitLabel: 'میل',
      }),
      { displayValue: '۱/۲ اینچ', unitLabel: null },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'تیرآهن IPE',
        code: 'size',
        displayValue: '16',
        unitLabel: 'میل',
      }),
      { displayValue: '16', unitLabel: 'میل' },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'لوله تست گاز',
        code: 'thickness',
        displayValue: '2.5',
        unitLabel: 'میل',
      }),
      { displayValue: '2.5', unitLabel: 'میل' },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'لوله API',
        code: 'size',
        displayValue: '4',
        unitLabel: 'میل',
      }),
      { displayValue: '۴ اینچ', unitLabel: null },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'لوله مانیسمان',
        code: 'size_pipe',
        displayValue: '0.5',
        unitLabel: 'اینچ',
      }),
      { displayValue: '۱/۲ اینچ', unitLabel: null },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'لوله تست آب',
        code: 'size',
        displayValue: '6',
        unitLabel: 'میل',
      }),
      { displayValue: '۶ اینچ', unitLabel: null },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'زانو ۹۰ درجه مانیسمان',
        code: 'size_pipe',
        displayValue: '0.5',
        unitLabel: 'اینچ',
      }),
      { displayValue: '۱/۲ اینچ', unitLabel: null },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'سه راهی تبدیلی مانیسمان',
        code: 'size_run',
        displayValue: '36',
        unitLabel: 'اینچ',
      }),
      { displayValue: '۳۶ اینچ', unitLabel: null },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'تبدیل هم‌مرکز مانیسمان',
        code: 'size_small',
        displayValue: '2',
        unitLabel: 'اینچ',
      }),
      { displayValue: '۲ اینچ', unitLabel: null },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'فلنج کور',
        code: 'size_pipe',
        displayValue: '0.5',
        unitLabel: 'اینچ',
      }),
      { displayValue: '۱/۲ اینچ', unitLabel: null },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'سه راهی تبدیلی ساکت‌ولد',
        code: 'size_run',
        displayValue: '4',
        unitLabel: 'اینچ',
      }),
      { displayValue: '۴ اینچ', unitLabel: null },
    );
    assert.deepEqual(
      applyNpsInchSizeDisplay({
        typeName: 'تبدیل دنده‌ای (روپیچ توپیچ)',
        code: 'size_small',
        displayValue: '1',
        unitLabel: 'اینچ',
      }),
      { displayValue: '۱ اینچ', unitLabel: null },
    );
  });
});
