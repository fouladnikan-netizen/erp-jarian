import { useMemo } from 'react';
import { Eye, Paperclip } from 'lucide-react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import '../gahshomar-documents.css';

const INCOMING_COLUMNS = [
  { key: 'row', label: 'ردیف', defaultWidth: 56, resizable: false },
  { key: 'number', label: 'شماره', defaultWidth: 120, numeric: true },
  { key: 'date', label: 'تاریخ', defaultWidth: 120, numeric: true },
  { key: 'displayParty', label: 'فرستنده', defaultWidth: 160 },
  { key: 'subject', label: 'موضوع', defaultWidth: 220 },
  { key: 'displayType', label: 'نوع', defaultWidth: 90 },
  { key: 'displayStatus', label: 'وضعیت', defaultWidth: 110 },
  { key: 'attachment', label: 'پیوست', defaultWidth: 72, resizable: false },
  { key: 'actions', label: 'عملیات', defaultWidth: 88, resizable: false },
];

const OUTGOING_COLUMNS = [
  { key: 'row', label: 'ردیف', defaultWidth: 56, resizable: false },
  { key: 'number', label: 'شماره', defaultWidth: 120, numeric: true },
  { key: 'date', label: 'تاریخ', defaultWidth: 120, numeric: true },
  { key: 'displayParty', label: 'گیرنده', defaultWidth: 160 },
  { key: 'subject', label: 'موضوع', defaultWidth: 220 },
  { key: 'attachment', label: 'پیوست', defaultWidth: 72, resizable: false },
  { key: 'actions', label: 'عملیات', defaultWidth: 88, resizable: false },
];

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
  const { widths, startResize } = useResizableColumns(`gahshomar-records-${tab}`, columns);

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
      aria-label={isIncoming ? 'فهرست دریافت کردیم' : 'فهرست ارسال کردیم'}
    >
      <div className="data-table-header">
        <span className="data-table-header__title font-meem">
          {isIncoming ? 'نامه‌هایی که دریافت کردیم' : 'نامه‌هایی که ارسال کردیم'}
        </span>
        <span className="data-table-header__count font-yekan">
          {records.length.toLocaleString('fa-IR')} رکورد
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
                  {col.label}
                </ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={record.id}>
                <td className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>
                <td className="font-yekan">{record.number || '—'}</td>
                <td className="font-yekan">{record.date || '—'}</td>
                <td className="font-meem">{record.displayParty || '—'}</td>
                <td className="font-meem">{record.subject || '—'}</td>
                {isIncoming ? (
                  <>
                    <td className="font-meem">{record.displayType || '—'}</td>
                    <td className="font-meem">{record.displayStatus || '—'}</td>
                  </>
                ) : null}
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
