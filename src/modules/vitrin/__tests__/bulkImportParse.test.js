import { describe, expect, it } from 'vitest';
import { parseBulkImportText } from '../bulkImportParse.js';

describe('parseBulkImportText', () => {
  it('maps quoted CSV cells and attr: columns', () => {
    const text = [
      'groupName,categoryName,typeName,attr:dimensions,attr:thickness',
      'مقاطع فولادی,پروفیل,پروفیل مبلی,"20×20",0.9',
    ].join('\n');
    expect(parseBulkImportText(text)).toEqual([
      {
        groupName: 'مقاطع فولادی',
        categoryName: 'پروفیل',
        typeName: 'پروفیل مبلی',
        attributes: { dimensions: '20×20', thickness: '0.9' },
      },
    ]);
  });

  it('skips hash comments and empty attribute cells', () => {
    const text = [
      'groupName\tcategoryName\ttypeName\tattr:size\tattr:grade',
      '#راهنما\t-\t-\t-\t-',
      'مقاطع فولادی\tمیلگرد\tمیلگرد آجدار\t8\t',
    ].join('\n');
    expect(parseBulkImportText(text)).toEqual([
      {
        groupName: 'مقاطع فولادی',
        categoryName: 'میلگرد',
        typeName: 'میلگرد آجدار',
        attributes: { size: '8' },
      },
    ]);
  });
});
