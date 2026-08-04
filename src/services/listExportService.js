/**
 * Shared list export — CSV + Excel (SpreadsheetML).
 * Exports filtered/sorted rows for visible columns in UI order.
 */

function escapeCsvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveCell(row, column, getValue) {
  if (typeof getValue === 'function') {
    return getValue(row, column.key, column);
  }
  if (typeof column.accessor === 'function') {
    return column.accessor(row);
  }
  const raw = row?.[column.key];
  return raw == null ? '' : raw;
}

/**
 * @param {{
 *   columns: Array<{ key: string, title?: string, label?: string, accessor?: Function }>,
 *   rows: Array<any>,
 *   getValue?: (row: any, key: string, column: any) => any,
 * }} input
 */
export function buildExportMatrix({ columns, rows, getValue }) {
  const cols = (columns || []).filter((col) => col && col.key);
  const header = cols.map((col) => col.title || col.label || col.key);
  const body = (rows || []).map((row) => (
    cols.map((col) => resolveCell(row, col, getValue))
  ));
  return { header, body, columns: cols };
}

export function toCsvString({ columns, rows, getValue }) {
  const { header, body } = buildExportMatrix({ columns, rows, getValue });
  const lines = [
    header.map(escapeCsvCell).join(','),
    ...body.map((line) => line.map(escapeCsvCell).join(',')),
  ];
  // UTF-8 BOM so Excel opens Persian correctly
  return `\uFEFF${lines.join('\r\n')}`;
}

/** Excel-compatible SpreadsheetML (.xls) — no third-party dependency. */
export function toExcelXmlString({ columns, rows, getValue, sheetName = 'Sheet1' }) {
  const { header, body } = buildExportMatrix({ columns, rows, getValue });
  const safeSheet = String(sheetName).replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Sheet1';

  const headerRow = `<Row>${header.map((cell) => (
    `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`
  )).join('')}</Row>`;

  const dataRows = body.map((line) => (
    `<Row>${line.map((cell) => {
      const text = cell == null ? '' : String(cell);
      const asNum = Number(text.replace(/,/g, ''));
      const isNum = text.trim() !== '' && Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(text.trim());
      if (isNum) {
        return `<Cell><Data ss:Type="Number">${asNum}</Data></Cell>`;
      }
      return `<Cell><Data ss:Type="String">${escapeXml(text)}</Data></Cell>`;
    }).join('')}</Row>`
  )).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escapeXml(safeSheet)}">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {{
 *   format: 'csv'|'excel',
 *   filename?: string,
 *   columns: Array<any>,
 *   rows: Array<any>,
 *   getValue?: Function,
 *   sheetName?: string,
 * }} options
 */
export function exportListData(options) {
  const {
    format = 'csv',
    filename,
    columns,
    rows,
    getValue,
    sheetName,
  } = options;

  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'excel') {
    const name = filename || `export-${stamp}.xls`;
    const xml = toExcelXmlString({ columns, rows, getValue, sheetName });
    downloadBlob(name, 'application/vnd.ms-excel;charset=utf-8', xml);
    return { format: 'excel', filename: name, rowCount: rows?.length || 0 };
  }

  const name = filename || `export-${stamp}.csv`;
  const csv = toCsvString({ columns, rows, getValue });
  downloadBlob(name, 'text/csv;charset=utf-8', csv);
  return { format: 'csv', filename: name, rowCount: rows?.length || 0 };
}

export const listExportService = {
  buildExportMatrix,
  toCsvString,
  toExcelXmlString,
  exportListData,
};

export default listExportService;
