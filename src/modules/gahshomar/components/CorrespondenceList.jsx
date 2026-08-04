import { useMemo } from 'react';
import { Eye, Paperclip } from 'lucide-react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import {
  STATUS_LABELS,
  TYPE_LABELS,
  CORRESPONDENCE_TYPE,
} from '../models/correspondence';
import '../gahshomar-documents.css';

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '—';
}

/**
 * Correspondence-centric list for Incoming or Outgoing tab.
 */
export default function CorrespondenceList({
  tab,
  documents,
  onOpenDetail,
}) {
  const isIncoming = tab === 'incoming';

  const columns = useMemo(() => (
    isIncoming
      ? [
        { key: 'row', label: 'ردیف', defaultWidth: 56, resizable: false },
        { key: 'letterNumber', label: 'شماره وارده', defaultWidth: 120, numeric: true },
        { key: 'receivedDate', label: 'تاریخ دریافت', defaultWidth: 120, numeric: true },
        { key: 'senderName', label: 'فرستنده', defaultWidth: 160 },
        { key: 'subject', label: 'موضوع', defaultWidth: 200 },
        { key: 'category', label: 'دسته‌بندی', defaultWidth: 110 },
        { key: 'status', label: 'وضعیت', defaultWidth: 120 },
        { key: 'actions', label: 'عملیات', defaultWidth: 88, resizable: false },
      ]
      : [
        { key: 'row', label: 'ردیف', defaultWidth: 56, resizable: false },
        { key: 'letterNumber', label: 'شماره صادره', defaultWidth: 120, numeric: true },
        { key: 'letterDate', label: 'تاریخ', defaultWidth: 120, numeric: true },
        { key: 'receiverName', label: 'گیرنده', defaultWidth: 160 },
        { key: 'subject', label: 'موضوع', defaultWidth: 200 },
        { key: 'category', label: 'دسته‌بندی', defaultWidth: 110 },
        { key: 'status', label: 'وضعیت', defaultWidth: 120 },
        { key: 'actions', label: 'عملیات', defaultWidth: 88, resizable: false },
      ]
  ), [isIncoming]);

  const { widths, startResize } = useResizableColumns(`gahshomar-list-${tab}`, columns);

  if (!documents.length) {
    return (
      <div className="gahshomar-docs__empty gahshomar-docs__empty--section section-data">
        <p className="gahshomar-docs__empty-title font-meem">
          {isIncoming ? 'نامه وارده‌ای نیست' : 'نامه صادره‌ای نیست'}
        </p>
        <p className="gahshomar-docs__empty-body font-meem">
          مکاتبات رسمی و نامه‌های داخلی مرتبط با این نما اینجا نمایش داده می‌شوند.
        </p>
      </div>
    );
  }

  return (
    <section className="section-data gahshomar-list" aria-label={isIncoming ? 'فهرست وارده' : 'فهرست صادره'}>
      <div className="data-table-header">
        <span className="data-table-header__title font-meem">
          {isIncoming ? 'نامه‌های وارده' : 'نامه‌های صادره'}
        </span>
        <span className="data-table-header__count font-yekan">
          {documents.length.toLocaleString('fa-IR')} رکورد
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
            {documents.map((doc, index) => (
              <tr key={doc.id}>
                <td className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>
                <td className="font-yekan">
                  {doc.letterNumber || '—'}
                  {doc.type === CORRESPONDENCE_TYPE.INTERNAL ? (
                    <span className="gahshomar-list__type-pill font-meem">
                      {TYPE_LABELS.INTERNAL}
                    </span>
                  ) : null}
                </td>
                <td className="font-yekan">
                  {isIncoming
                    ? (doc.receivedDate || doc.letterDate || '—')
                    : (doc.letterDate || '—')}
                </td>
                <td className="font-meem">
                  {isIncoming
                    ? (doc.senderName || doc.counterpartyName || '—')
                    : (doc.receiverName || doc.counterpartyName || '—')}
                </td>
                <td className="font-meem">{doc.subject || '—'}</td>
                <td className="font-meem">{doc.category || '—'}</td>
                <td className="font-meem">
                  {statusLabel(doc.status)}
                  {Array.isArray(doc.attachments) && doc.attachments.length > 0 ? (
                    <span className="gahshomar-list__attach font-meem" title="پیوست">
                      <Paperclip size={13} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  ) : null}
                </td>
                <td>
                  <button
                    type="button"
                    className="gahshomar-list__detail-btn"
                    aria-label="جزئیات نامه"
                    onClick={() => onOpenDetail?.(doc)}
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
