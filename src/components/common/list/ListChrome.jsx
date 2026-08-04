import ColumnManager from './ColumnManager';
import ListExport from './ListExport';
import './list-infra.css';

const VIEW_MODES = [
  { id: 'client', label: 'صفحه‌بندی' },
  { id: 'infinite', label: 'نامحدود' },
  { id: 'virtual', label: 'مجازی' },
];

/**
 * Shared list chrome — column manager, export, view mode, reset preferences.
 */
export default function ListChrome({
  columns,
  setColumnVisible,
  reorderColumns,
  resetColumns,
  exportColumns,
  exportRows,
  getExportValue,
  filenameBase,
  sheetName,
  viewMode,
  setViewMode,
  onResetPreferences,
  className = '',
}) {
  return (
    <div className={`jarian-list-chrome${className ? ` ${className}` : ''}`} dir="rtl">
      <ColumnManager
        columns={columns}
        setColumnVisible={setColumnVisible}
        reorderColumns={reorderColumns}
        resetColumns={resetColumns}
      />

      <ListExport
        columns={exportColumns}
        rows={exportRows}
        getValue={getExportValue}
        filenameBase={filenameBase}
        sheetName={sheetName}
      />

      <div className="jarian-list-chrome__modes" role="group" aria-label="حالت نمایش">
        {VIEW_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`jarian-list-chrome__btn font-meem${viewMode === mode.id ? ' is-active' : ''}`}
            onClick={() => setViewMode?.(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {onResetPreferences ? (
        <button
          type="button"
          className="jarian-list-chrome__btn font-meem"
          onClick={() => onResetPreferences()}
        >
          بازنشانی تنظیمات
        </button>
      ) : null}
    </div>
  );
}
