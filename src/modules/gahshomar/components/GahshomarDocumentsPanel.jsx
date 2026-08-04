import { Files, Inbox, Send, Eye } from 'lucide-react';
import { useState } from 'react';
import { useCompanyCorrespondence } from '../services/correspondenceService';
import {
  CORRESPONDENCE_DIRECTION,
  STATUS_LABELS,
} from '../models/correspondence';
import { ProfileTabSectionHeader } from '../../../components/profileLayout';
import CorrespondenceDetailDrawer from './CorrespondenceDetailDrawer';
import '../../kanoon/customerProfile.css';
import '../gahshomar-documents.css';

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '—';
}

function SimpleTable({ documents, emptyTitle, columns, onOpen }) {
  if (!documents.length) {
    return (
      <div className="gahshomar-docs__empty gahshomar-docs__empty--section">
        <p className="gahshomar-docs__empty-title font-meem">{emptyTitle}</p>
      </div>
    );
  }

  return (
    <div className="gahshomar-docs__table-wrap" role="region">
      <table className="jarian-table gahshomar-docs__table">
        <thead>
          <tr>
            <th className="font-meem">ردیف</th>
            {columns.map((col) => (
              <th key={col.key} className="font-meem">{col.label}</th>
            ))}
            <th className="font-meem">عملیات</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, index) => (
            <tr key={doc.id}>
              <td className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>
              {columns.map((col) => (
                <td key={col.key} className={col.numeric ? 'font-yekan' : 'font-meem'}>
                  {col.render ? col.render(doc) : (doc[col.key] || '—')}
                </td>
              ))}
              <td>
                <button
                  type="button"
                  className="gahshomar-list__detail-btn"
                  aria-label="جزئیات"
                  onClick={() => onOpen(doc)}
                >
                  <Eye size={16} strokeWidth={1.75} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Profile documents tab — company-scoped correspondence only (Gahshomar service).
 */
export default function GahshomarDocumentsPanel({ companyId, showHeader = true }) {
  const documents = useCompanyCorrespondence(companyId);
  const [detail, setDetail] = useState(null);
  const incoming = documents.filter((doc) => doc.direction === CORRESPONDENCE_DIRECTION.INCOMING);
  const outgoing = documents.filter((doc) => doc.direction === CORRESPONDENCE_DIRECTION.OUTGOING);

  const incomingColumns = [
    { key: 'letterNumber', label: 'شماره وارده', numeric: true },
    { key: 'receivedDate', label: 'تاریخ دریافت', numeric: true, render: (d) => d.receivedDate || d.letterDate || '—' },
    { key: 'senderName', label: 'فرستنده', render: (d) => d.senderName || d.counterpartyName || '—' },
    { key: 'subject', label: 'موضوع' },
    { key: 'category', label: 'دسته‌بندی' },
    { key: 'status', label: 'وضعیت', render: (d) => statusLabel(d.status) },
  ];

  const outgoingColumns = [
    { key: 'letterNumber', label: 'شماره صادره', numeric: true },
    { key: 'letterDate', label: 'تاریخ', numeric: true },
    { key: 'receiverName', label: 'گیرنده', render: (d) => d.receiverName || d.counterpartyName || '—' },
    { key: 'subject', label: 'موضوع' },
    { key: 'category', label: 'دسته‌بندی' },
    { key: 'status', label: 'وضعیت', render: (d) => statusLabel(d.status) },
  ];

  return (
    <section className="gahshomar-docs" data-domain="gahshomar" aria-label="اسناد و مکاتبات">
      {showHeader ? (
        <ProfileTabSectionHeader
          title="دبیرخانه — اسناد و مکاتبات"
          subtitle="فقط مکاتبات رسمی مرتبط با این مخاطب"
          Icon={Files}
        />
      ) : null}

      <p className="gahshomar-docs__boundary-note font-meem">
        فقط مکاتبات رسمی — تماس و پیگیری در پویش ثبت می‌شوند.
      </p>

      <div className="gahshomar-docs__section">
        <h4 className="gahshomar-docs__section-title font-meem">
          <Inbox size={16} strokeWidth={1.75} aria-hidden="true" />
          وارده
        </h4>
        <SimpleTable
          documents={incoming}
          emptyTitle="نامه وارده‌ای برای این سازمان نیست"
          columns={incomingColumns}
          onOpen={setDetail}
        />
      </div>

      <div className="gahshomar-docs__section">
        <h4 className="gahshomar-docs__section-title font-meem">
          <Send size={16} strokeWidth={1.75} aria-hidden="true" />
          صادره
        </h4>
        <SimpleTable
          documents={outgoing}
          emptyTitle="نامه صادره‌ای برای این سازمان نیست"
          columns={outgoingColumns}
          onOpen={setDetail}
        />
      </div>

      <CorrespondenceDetailDrawer
        record={detail}
        onClose={() => setDetail(null)}
      />
    </section>
  );
}
