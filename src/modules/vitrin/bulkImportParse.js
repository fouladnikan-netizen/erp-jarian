/**
 * Client-side parse of the Product bulk-import template (CSV / TSV).
 * Backend remains the authority for validation and apply (DDL-24g).
 */

const MACHINE_HEADERS = new Set([
  'groupName',
  'categoryName',
  'typeName',
  'displayNameOverride',
  'brandName',
  'baseUomCode',
  'salesUomCode',
  'purchaseUomCode',
  'unitWeight',
  'customLengthAllowed',
  'weightProfileType',
]);

export function detectDelimiter(headerLine) {
  const tabs = (headerLine.match(/\t/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return tabs > commas ? '\t' : ',';
}

export function parseDelimitedTable(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  if (!source.trim()) return [];

  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const delimiter = detectDelimiter(firstLine);

  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (ch === '\r') {
      if (source[i + 1] === '\n') continue;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => String(value).trim().length > 0));
}

function isCommentOrLabelRow(headers, cells) {
  const group = String(cells[0] ?? '').trim();
  if (!group || group.startsWith('#')) return true;
  const firstHeader = String(headers[0] ?? '').trim();
  if (firstHeader === 'groupName' && group !== 'groupName' && !MACHINE_HEADERS.has(group) && group.includes('گروه')) {
    return true;
  }
  return false;
}

export function mapTemplateRows(table) {
  if (!table.length) {
    throw new Error('حداقل یک ردیف هدر و یک ردیف داده لازم است.');
  }
  const headers = table[0].map((h) => String(h || '').trim());
  if (!headers.includes('groupName') || !headers.includes('categoryName') || !headers.includes('typeName')) {
    throw new Error('ستون‌های groupName، categoryName و typeName در ردیف اول الزامی هستند.');
  }

  const rows = [];
  for (const cells of table.slice(1)) {
    if (isCommentOrLabelRow(headers, cells)) continue;
    const row = { attributes: {} };
    headers.forEach((header, idx) => {
      if (!header) return;
      const value = String(cells[idx] ?? '').trim();
      if (!value) return;
      if (header.startsWith('attr:')) {
        row.attributes[header.slice(5)] = value;
        return;
      }
      row[header] = value;
    });
    if (row.groupName && row.categoryName && row.typeName) rows.push(row);
  }
  if (!rows.length) {
    throw new Error('هیچ ردیف کالایی برای ورود یافت نشد.');
  }
  return rows;
}

export function parseBulkImportText(text) {
  return mapTemplateRows(parseDelimitedTable(text));
}
