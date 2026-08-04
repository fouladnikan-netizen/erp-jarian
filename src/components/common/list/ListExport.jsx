import { Download } from 'lucide-react';
import { exportListData } from '../../../services/listExportService';
import './list-infra.css';

/**
 * Shared list export control — CSV + Excel from filtered/sorted/visible columns.
 */
export default function ListExport({
  columns = [],
  rows = [],
  getValue,
  filenameBase = 'export',
  sheetName = 'فهرست',
  disabled = false,
  className = '',
}) {
  const runExport = (format) => {
    if (!columns.length) return;
    const stamp = new Date().toISOString().slice(0, 10);
    exportListData({
      format,
      columns,
      rows,
      getValue,
      sheetName,
      filename: `${filenameBase}-${stamp}.${format === 'excel' ? 'xls' : 'csv'}`,
    });
  };

  return (
    <div className={`jarian-list-export${className ? ` ${className}` : ''}`} role="group" aria-label="خروجی">
      <button
        type="button"
        className="jarian-list-chrome__btn font-meem"
        disabled={disabled || !rows.length || !columns.length}
        onClick={() => runExport('csv')}
      >
        <Download size={16} strokeWidth={1.75} aria-hidden="true" />
        CSV
      </button>
      <button
        type="button"
        className="jarian-list-chrome__btn font-meem"
        disabled={disabled || !rows.length || !columns.length}
        onClick={() => runExport('excel')}
      >
        <Download size={16} strokeWidth={1.75} aria-hidden="true" />
        Excel
      </button>
    </div>
  );
}
