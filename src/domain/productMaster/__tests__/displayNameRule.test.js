import { describe, expect, it } from 'vitest';
import {
  annotateDisplayNameTokens,
  buildDisplayNameFromRule,
  previewCreatedProductName,
  previewDisplayName,
} from '../displayNameRule';

describe('displayNameRule preview', () => {
  it('uses Persian placeholders and type name for live preview', () => {
    const preview = previewDisplayName({
      separator: '·',
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'attribute', attributeId: 'g' },
        { sourceType: 'attribute', attributeId: 't' },
        { sourceType: 'attribute', attributeId: 'd' },
      ],
    }, {
      sources: { type: 'ورق استیل' },
      attributes: {
        g: { nameFa: 'گرید' },
        t: { nameFa: 'ضخامت', unitLabel: 'میل' },
        d: { nameFa: 'ابعاد' },
      },
    });
    expect(preview).toBe('ورق استیل · {گرید} · {ضخامت} میل · {ابعاد}');
  });

  it('prefixes the field title in preview only when includeLabel is on', () => {
    const preview = previewDisplayName({
      separator: ' ',
      tokens: [
        { sourceType: 'type', includeLabel: true },
        { sourceType: 'attribute', attributeId: 't', includeLabel: true },
      ],
    }, {
      sources: { type: 'ورق سیاه' },
      attributes: { t: { nameFa: 'ضخامت', unitLabel: 'میل' } },
    });
    expect(preview).toBe('نوع ورق سیاه ضخامت {ضخامت} میل');
  });

  it('marks removed attributes as invalid without dropping the token', () => {
    const annotated = annotateDisplayNameTokens({
      tokens: [{ sourceType: 'attribute', attributeId: 'missing' }],
    }, { schema: [] });
    expect(annotated[0].invalid).toBe(true);
    expect(buildDisplayNameFromRule({
      tokens: [{ sourceType: 'type' }, { sourceType: 'attribute', attributeId: 'missing' }],
    }, { sources: { type: 'ورق سیاه' }, attributes: {} })).toBe('ورق سیاه');
  });

  it('previews a created product with the Type rule and live values, not type | attrs', () => {
    const name = previewCreatedProductName({
      type: {
        name: 'ورق استیل ۳۰۴L',
        displayNameRule: {
          separator: ' ',
          tokens: [
            { sourceType: 'type', includeLabel: true },
            { sourceType: 'attribute', attributeId: 'th' },
          ],
        },
      },
      schema: [{
        definition: { id: 'th', nameFa: 'ضخامت', dataType: 'DECIMAL', uomId: 'u1' },
        binding: { sortOrder: 1 },
      }],
      attributeValues: { th: '2' },
      uoms: [{ id: 'u1', nameFa: 'میل' }],
    });
    expect(name).toBe('نوع ورق استیل ۳۰۴L ۲ میل');
    expect(name).not.toMatch(/\|/);
  });

  it('falls back to the legacy formatter only when the Type has no rule', () => {
    const name = previewCreatedProductName({
      type: { name: 'ورق سیاه', displayNameRule: null },
      schema: [{
        definition: { id: 'th', nameFa: 'ضخامت', dataType: 'DECIMAL' },
        binding: { sortOrder: 1 },
      }],
      attributeValues: { th: '6' },
    });
    expect(name).toBe('ورق سیاه | ضخامت: ۶');
  });

  it('omits the unit in live preview when includeUnit is off', () => {
    const name = previewCreatedProductName({
      type: {
        name: 'لوله',
        displayNameRule: {
          tokens: [
            { sourceType: 'type' },
            { sourceType: 'attribute', attributeId: 'sz', includeUnit: false },
          ],
        },
      },
      schema: [{
        definition: { id: 'sz', nameFa: 'سایز', dataType: 'DECIMAL', uomId: 'u-inch' },
        binding: { sortOrder: 1 },
      }],
      attributeValues: { sz: '6' },
      uoms: [{ id: 'u-inch', nameFa: 'اینچ' }],
    });
    expect(name).toBe('لوله ۶');
  });

  it('previews catalog literals and omits prefix glue when the live value is empty', () => {
    const preview = previewDisplayName({
      tokens: [
        { sourceType: 'type' },
        { sourceType: 'literal', literalId: 'branch' },
        { sourceType: 'attribute', attributeId: 'len' },
      ],
    }, {
      sources: { type: 'میلگرد آجدار' },
      attributes: { len: { nameFa: 'طول', unitLabel: 'متر' } },
    });
    expect(preview).toBe('میلگرد آجدار شاخه {طول} متر');

    const created = previewCreatedProductName({
      type: {
        name: 'میلگرد آجدار',
        displayNameRule: {
          tokens: [
            { sourceType: 'type' },
            { sourceType: 'literal', literalId: 'branch' },
            { sourceType: 'attribute', attributeId: 'len' },
          ],
        },
      },
      schema: [{
        definition: { id: 'len', nameFa: 'طول', dataType: 'DECIMAL', uomId: 'u-m' },
        binding: { sortOrder: 1 },
      }],
      attributeValues: { len: '12' },
      uoms: [{ id: 'u-m', nameFa: 'متر' }],
    });
    expect(created).toBe('میلگرد آجدار شاخه ۱۲ متر');
  });

  it('keeps empty slots and prefix glue in the create-form preview', () => {
    const type = {
      name: 'پروفیل',
      displayNameRule: {
        separator: ' ',
        tokens: [
          { sourceType: 'type' },
          { sourceType: 'attribute', attributeId: 'th', includeLabel: true },
          { sourceType: 'literal', literalId: 'dims' },
          { sourceType: 'attribute', attributeId: 'w' },
          { sourceType: 'literal', literalId: 'times' },
          { sourceType: 'attribute', attributeId: 'lp' },
          { sourceType: 'literal', literalId: 'branch' },
          { sourceType: 'attribute', attributeId: 'len' },
        ],
      },
    };
    const schema = [
      { definition: { id: 'th', nameFa: 'ضخامت', dataType: 'DECIMAL', uomId: 'u-mm' }, binding: {} },
      { definition: { id: 'w', nameFa: 'عرض پروفیل', dataType: 'DECIMAL' }, binding: {} },
      { definition: { id: 'lp', nameFa: 'طول پروفیل', dataType: 'DECIMAL' }, binding: {} },
      { definition: { id: 'len', nameFa: 'طول', dataType: 'DECIMAL', uomId: 'u-m' }, binding: { valueScope: 'TRANSACTION' } },
    ];
    const uoms = [
      { id: 'u-mm', nameFa: 'میل' },
      { id: 'u-m', nameFa: 'متری' },
    ];
    expect(previewCreatedProductName({
      type, schema, uoms, emptyAsPlaceholder: true,
    })).toBe('پروفیل ضخامت {ضخامت} میل ابعاد {عرض پروفیل}×{طول پروفیل} شاخه {طول} متری');
    expect(previewCreatedProductName({
      type, schema, uoms,
      attributeValues: { th: '2', w: '40', lp: '80' },
      emptyAsPlaceholder: true,
    })).toBe('پروفیل ضخامت ۲ میل ابعاد ۴۰×۸۰ شاخه {طول} متری');
    expect(previewCreatedProductName({
      type, schema, uoms,
      attributeValues: { th: '2', w: '40', lp: '80' },
    })).toBe('پروفیل ضخامت ۲ میل ابعاد ۴۰×۸۰');
    const withDefault = schema.map((entry) => (
      entry.definition.id === 'len'
        ? { ...entry, binding: { ...entry.binding, overrideDefaultValue: '6' } }
        : entry
    ));
    expect(previewCreatedProductName({
      type, schema: withDefault, uoms, emptyAsPlaceholder: true,
    })).toBe('پروفیل ضخامت {ضخامت} میل ابعاد {عرض پروفیل}×{طول پروفیل} شاخه ۶ متری');
    expect(previewCreatedProductName({
      type, schema: withDefault, uoms,
      attributeValues: { th: '2', w: '40', lp: '80' },
    })).toBe('پروفیل ضخامت ۲ میل ابعاد ۴۰×۸۰ شاخه ۶ متری');
  });

  it('fills mill-sheet طول ورق from width and thickness (DDL-56)', () => {
    const type = {
      name: 'ورق گالوانیزه',
      displayNameRule: {
        separator: ' ',
        tokens: [
          { sourceType: 'type' },
          { sourceType: 'attribute', attributeId: 'th', includeLabel: true, includeUnit: true },
          { sourceType: 'attribute', attributeId: 'w' },
          { sourceType: 'attribute', attributeId: 'sl', includeUnit: true },
        ],
      },
    };
    const schema = [
      { definition: { id: 'th', code: 'thickness', nameFa: 'ضخامت', dataType: 'DECIMAL', uomId: 'u-mm' }, binding: { valueScope: 'PRODUCT' } },
      { definition: { id: 'w', code: 'width', nameFa: 'عرض', dataType: 'DECIMAL' }, binding: { valueScope: 'PRODUCT' } },
      { definition: { id: 'sl', code: 'sheet_length', nameFa: 'طول ورق', dataType: 'DECIMAL', uomId: 'u-mm' }, binding: { valueScope: 'TRANSACTION' } },
    ];
    const uoms = [{ id: 'u-mm', nameFa: 'میل' }];
    expect(previewCreatedProductName({
      type, schema, uoms,
      attributeValues: { th: '0.5', w: '1000' },
    })).toBe('ورق گالوانیزه ضخامت ۰.۵ میل ۱۰۰۰ ۲۰۰۰ میل');
    expect(previewCreatedProductName({
      type, schema, uoms,
      attributeValues: { th: '12', w: '1250' },
    })).toBe('ورق گالوانیزه ضخامت ۱۲ میل ۱۲۵۰ ۶۰۰۰ میل');
    expect(previewCreatedProductName({
      type, schema, uoms,
      attributeValues: { th: '45', w: '2000' },
    })).toBe('ورق گالوانیزه ضخامت ۴۵ میل ۲۰۰۰ طول');
  });

  it('omits طول ورق from the mill-sheet name when عرضه is رول', () => {
    const type = {
      name: 'ورق گالوانیزه',
      displayNameRule: {
        separator: ' ',
        tokens: [
          { sourceType: 'type' },
          { sourceType: 'attribute', attributeId: 'th', includeLabel: true, includeUnit: true },
          { sourceType: 'attribute', attributeId: 'w' },
          { sourceType: 'literal', literalId: 'times' },
          { sourceType: 'attribute', attributeId: 'sl', includeUnit: true },
          { sourceType: 'attribute', attributeId: 'sf' },
        ],
      },
    };
    const schema = [
      { definition: { id: 'th', code: 'thickness', nameFa: 'ضخامت', dataType: 'DECIMAL', uomId: 'u-mm' }, binding: { valueScope: 'PRODUCT' } },
      { definition: { id: 'w', code: 'width', nameFa: 'عرض', dataType: 'DECIMAL' }, binding: { valueScope: 'PRODUCT' } },
      { definition: { id: 'sl', code: 'sheet_length', nameFa: 'طول ورق', dataType: 'DECIMAL', uomId: 'u-mm' }, binding: { valueScope: 'TRANSACTION' } },
      { definition: { id: 'sf', code: 'supply_form', nameFa: 'حالت عرضه', dataType: 'ENUM', allowedValues: [{ value: 'roll', labelFa: 'رول' }, { value: 'mill', labelFa: 'شیت فابریک' }] }, binding: { valueScope: 'TRANSACTION' } },
    ];
    const uoms = [{ id: 'u-mm', nameFa: 'میل' }];
    expect(previewCreatedProductName({
      type, schema, uoms,
      attributeValues: { th: '0.5', w: '1000', sf: 'roll' },
    })).toBe('ورق گالوانیزه ضخامت ۰.۵ میل ۱۰۰۰ رول');
    expect(previewCreatedProductName({
      type, schema, uoms,
      attributeValues: { th: '0.5', w: '1000', sf: 'mill' },
    })).toBe('ورق گالوانیزه ضخامت ۰.۵ میل ۱۰۰۰×۲۰۰۰ میل شیت فابریک');
  });

  it('shows لوله تست گاز size_pipe as ۱/۲ اینچ, not 0.5 میل', () => {
    const type = {
      name: 'لوله تست گاز',
      displayNameRule: {
        separator: ' ',
        tokens: [
          { sourceType: 'type' },
          { sourceType: 'attribute', attributeId: 'sz', includeUnit: true },
          { sourceType: 'attribute', attributeId: 'th', includeLabel: true, includeUnit: true },
        ],
      },
    };
    const schema = [
      { definition: { id: 'sz', code: 'size_pipe', nameFa: 'سایز', dataType: 'DECIMAL', uomId: 'u-in' }, binding: { valueScope: 'PRODUCT' } },
      { definition: { id: 'th', code: 'thickness', nameFa: 'ضخامت', dataType: 'DECIMAL', uomId: 'u-mm' }, binding: { valueScope: 'PRODUCT' } },
    ];
    const uoms = [
      { id: 'u-in', nameFa: 'اینچ' },
      { id: 'u-mm', nameFa: 'میل' },
    ];
    expect(previewCreatedProductName({
      type, schema, uoms,
      attributeValues: { sz: '0.5', th: '2.5' },
    })).toBe('لوله تست گاز ۱/۲ اینچ ضخامت ۲.۵ میل');
    expect(previewCreatedProductName({
      type, schema, uoms,
      attributeValues: { sz: '1.25', th: '3.6' },
    })).toBe('لوله تست گاز ۱ ۱/۴ اینچ ضخامت ۳.۶ میل');
  });

  it('shows لوله مانیسمان size_pipe as ۱/۲ اینچ and schedule without a unit', () => {
    const type = {
      name: 'لوله مانیسمان',
      displayNameRule: {
        separator: ' ',
        tokens: [
          { sourceType: 'type' },
          { sourceType: 'attribute', attributeId: 'sp', includeUnit: true },
          { sourceType: 'attribute', attributeId: 'sch', includeLabel: true, includeUnit: false },
        ],
      },
    };
    const schema = [
      { definition: { id: 'sp', code: 'size_pipe', nameFa: 'سایز', dataType: 'DECIMAL', uomId: 'u-in' }, binding: { valueScope: 'PRODUCT' } },
      { definition: { id: 'sch', code: 'sch', nameFa: 'رده', dataType: 'ENUM' }, binding: { valueScope: 'PRODUCT' } },
    ];
    const uoms = [{ id: 'u-in', nameFa: 'اینچ' }];
    expect(previewCreatedProductName({
      type, schema, uoms,
      attributeValues: { sp: '0.5', sch: '20' },
    })).toBe('لوله مانیسمان ۱/۲ اینچ رده ۲۰');
    expect(previewCreatedProductName({
      type, schema, uoms,
      attributeValues: { sp: '0.5', sch: '20' },
    })).not.toMatch(/[0-9]/);
  });

  it('emits Persian digits only when attribute values are stored Latin', () => {
    const name = previewCreatedProductName({
      type: {
        name: 'ورق استیل 304L',
        displayNameRule: {
          tokens: [
            { sourceType: 'type' },
            { sourceType: 'attribute', attributeId: 'th' },
          ],
        },
      },
      schema: [{
        definition: { id: 'th', nameFa: 'ضخامت', dataType: 'DECIMAL', uomId: 'u1' },
        binding: { sortOrder: 1 },
      }],
      attributeValues: { th: '2' },
      uoms: [{ id: 'u1', nameFa: 'میل' }],
    });
    expect(name).toBe('ورق استیل ۳۰۴L ۲ میل');
    expect(name).not.toMatch(/[0-9]/);
    expect(name).not.toMatch(/[٠-٩]/);
  });

  it('keeps empty NPS size as a {سایز} slot in create preview, not ۰ اینچ', () => {
    const name = previewCreatedProductName({
      type: {
        name: 'لوله مانیسمان',
        displayNameRule: {
          tokens: [
            { sourceType: 'type' },
            { sourceType: 'attribute', attributeId: 'sz' },
            { sourceType: 'attribute', attributeId: 'th' },
          ],
        },
      },
      schema: [
        { definition: { id: 'sz', code: 'size_pipe', nameFa: 'سایز', dataType: 'DECIMAL' }, binding: {} },
        { definition: { id: 'th', code: 'thickness', nameFa: 'ضخامت', dataType: 'DECIMAL', uomId: 'u1' }, binding: {} },
      ],
      attributeValues: {},
      uoms: [{ id: 'u1', nameFa: 'میل' }],
      emptyAsPlaceholder: true,
    });
    expect(name).toContain('{سایز}');
    expect(name).toContain('{ضخامت}');
    expect(name).not.toMatch(/۰ اینچ/);
    expect(name).toBe('لوله مانیسمان {سایز} {ضخامت} میل');
  });
});
