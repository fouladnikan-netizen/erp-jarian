import { useMemo } from 'react';
import { Eye, Paperclip } from 'lucide-react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import ColumnFilterHeader from '../../../components/table/ColumnFilterHeader';
import ListStatusPill from '../../../components/module/ListStatusPill';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import { useColumnExcelFilters } from '../../../hooks/useColumnExcelFilters';
import '../gahshomar-documents.css';

const STATUS_KIND = {
  'پیش‌نویس': 'draft',
  'صادر شده': 'issued',
  'دریافت شده': 'received',
  'بایگانی': 'archived',
};

const INCOMING_COLUMNS = [
  { key: 'row', label: 'ردیف', defaultWidth: 56, resizable: false, filterable: false },
  { key: 'number', label: 'شماره', defaultWidth: 120, numeric: true, filterable: true },
  { key: 'date', label: 'تاریخ', defaultWidth: 120, numeric: true, filterable: true },
  { key: 'displayParty', label: 'فرستنده', defaultWidth: 160, filterable: true },
  { key: 'subject', label: 'موضوع', defaultWidth: 220, filterable: true },
  { key: 'displayType', label: 'نوع', defaultWidth: 90, filterable: true },
  { key: 'displayStatus', label: 'وضعیت', defaultWidth: 120, filterable: true },
  { key: 'attachment', label: 'پیوست', defaultWidth: 72, resizable: false, filterable: false },
  { key: 'actions', label: 'عملیات', defaultWidth: 88, resizable: false, filterable: false },
];

const OUTGOING_COLUMNS = [
  { key: 'row', label: 'ردیف', defaultWidth: 56, resizable: false, filterable: false },
  { key: 'number', label: 'شماره', defaultWidth: 120, numeric: true, filterable: true },
  { key: 'date', label: 'تاریخ', defaultWidth: 120, numeric: true, filterable: true },
  { key: 'displayParty', label: 'گیرنده', defaultWidth: 160, filterable: true },
  { key: 'subject', label: 'موضوع', defaultWidth: 220, filterable: true },
  { key: 'displayStatus', label: 'وضعیت', defaultWidth: 120, filterable: true },
  { key: 'attachment', label: 'پیوست', defaultWidth: 72, resizable: false, filterable: false },
  { key: 'actions', label: 'عملیات', defaultWidth: 88, resizable: false, filterable: false },
];

function getRawValue(record, key) {
  if (key === 'attachment') return record.hasAttachments ? 'دارد' : 'ندارد';
  const value = record[key];
  return value == null || value === '' ? '' : String(value);
}

/**
 * Block 3 — answers: "What records exist?"
 * Consumes list presentation models from facade only.
 */
export default function OfficialRecordList({ tab, records, onOpenDetail }) {
  const isIncoming = tab === 'incoming';
  const columns = useMemo(
    () => (isIncoming ? INCOMING_COLUMNS : OUTGOING_COLUMNS),
    [isIncoming],
  );
  const filterableKeys = useMemo(
    () => columns.filter((col) => col.filterable !== false).map((col) => col.key),
    [columns],
  );
  const { widths, startResize } = useResizableColumns(`gahshomar-records-${tab}`, columns);
  const {
    columnFilters,
    openFilterKey,
    setOpenFilterKey,
    applyFilter,
    filterRows,
    buildOptions,
  } = useColumnExcelFilters({ resetKey: tab });

  const filterOptions = useMemo(
    () => buildOptions(records, filterableKeys, getRawValue),
    [records, filterableKeys, buildOptions],
  );

  const visibleRecords = useMemo(
    () => filterRows(records, getRawValue),
    [records, filterRows],
  );

  const emptyTitle = useMemo(
    () => (isIncoming ? 'هنوز نامه‌ای دریافت نکرده‌ایم' : 'هنوز نامه‌ای ارسال نکرده‌ایم'),
    [isIncoming],
  );

  if (!records.length) {
    return (
      <div className="gahshomar-docs__empty gahshomar-docs__empty--section section-data">
        <p className="gahshomar-docs__empty-title font-meem">{emptyTitle}</p>
        <p className="gahshomar-docs__empty-body font-meem">
          مکاتبات رسمی سازمان در این نما نمایش داده می‌شوند.
        </p>
      </div>
    );
  }

  return (
    <section
      className="section-data gahshomar-list kprofile-glass"
      aria-label={isIncoming ? 'فهرست دریافتی' : 'فهرست ارسالی'}
    >
      <div className="data-table-header">
        <span className="data-table-header__title font-meem">
          {isIncoming ? 'نامه‌های دریافتی' : 'نامه‌های ارسالی'}
        </span>
        <span className="data-table-header__count font-yekan">
          {visibleRecords.length.toLocaleString('fa-IR')} رکورد
        </span>
      </div>
      <div className="data-table-wrap gahshomar-docs__table-wrap">
        <table className="jarian-table gahshomar-docs__table data-table--resizable">
          <ResizableColGroup columns={columns} widths={widths} />
          <thead>
            <tr>
              {columns.map((col) => (
                <ResizableTh
                  key={col.key}
                  columnKey={col.key}
                  resizable={col.resizable !== false}
                  onResizeStart={startResize}
                  className="font-meem"
                >
                  {col.filterable !== false ? (
                    <ColumnFilterHeader
                      label={col.label}
                      columnKey={col.key}
                      options={filterOptions[col.key] || []}
                      selected={columnFilters[col.key] || null}
                      openKey={openFilterKey}
                      setOpenKey={setOpenFilterKey}
                      numeric={Boolean(col.numeric)}
                      onApply={(value) => applyFilter(col.key, value)}
                    />
                  ) : (
                    col.label
                  )}
                </ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRecords.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="font-meem">
                  موردی با فیلتر فعلی یافت نشد.
                </td>
              </tr>
            ) : (
              visibleRecords.map((record, index) => (
                <tr key={record.id}>
                  <td className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>
                  <td className="font-yekan">{record.number || '—'}</td>
                  <td className="font-yekan">{record.date || '—'}</td>
                  <td className="font-meem">{record.displayParty || '—'}</td>
                  <td className="font-meem">{record.subject || '—'}</td>
                  {isIncoming ? (
                    <td className="font-meem">{record.displayType || '—'}</td>
                  ) : null}
                  <td>
                    <ListStatusPill
                      kind={STATUS_KIND[record.displayStatus] || record.status?.toLowerCase() || 'pending'}
                      label={record.displayStatus || '—'}
                    />
                  </td>
                  <td className="font-yekan">
                    {record.hasAttachments ? (
                      <Paperclip size={16} strokeWidth={1.75} aria-label="دارای پیوست" />
                    ) : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="gahshomar-list__detail-btn"
                      aria-label="مشاهده جزئیات"
                      onClick={() => onOpenDetail?.(record.id)}
                    >
                      <Eye size={16} strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
