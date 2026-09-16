import { Files, Inbox, Send, Eye } from 'lucide-react';
import { useState } from 'react';
import { DRAWER_MODE } from '../models/officialRecord';
import { useOrderOfficialRecords } from '../officialRecordFacade';
import OfficialRecordDrawer from './OfficialRecordDrawer';
import { ProfileTabSectionHeader } from '../../../components/profileLayout';
import '../../kanoon/customerProfile.css';
import '../gahshomar-documents.css';

function OrderCorrespondenceTable({ records, emptyTitle, partyLabel, onOpen }) {
  if (!records.length) {
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
            <th className="font-meem">شماره</th>
            <th className="font-meem">تاریخ</th>
            <th className="font-meem">{partyLabel}</th>
            <th className="font-meem">موضوع</th>
            <th className="font-meem">وضعیت</th>
            <th className="font-meem">عملیات</th>
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
              <td className="font-meem">{record.displayStatus || '—'}</td>
              <td>
                <button
                  type="button"
                  className="gahshomar-list__detail-btn"
                  aria-label="جزئیات"
                  onClick={() => onOpen(record.id)}
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
 * Nabz OrderProfile correspondence projection (DDL-23, product rule 15).
 * Read-only, order-scoped view over the canonical Gahshomar Correspondence
 * aggregate — Nabz never copies or stores the record itself; clicking a row
 * opens the same Gahshomar drawer used inside Gahshomar/Kanoon.
 */
export default function GahshomarOrderCorrespondencePanel({ orderId, showHeader = true }) {
  const records = useOrderOfficialRecords(orderId);
  const [drawerState, setDrawerState] = useState({ mode: null, recordId: null });

  const incoming = records.filter((record) => record.direction === 'INCOMING');
  const outgoing = records.filter((record) => record.direction === 'OUTGOING');

  return (
    <section className="gahshomar-docs" data-domain="gahshomar" aria-label="مکاتبات رسمی سفارش">
      {showHeader ? (
        <ProfileTabSectionHeader
          title="دبیرخانه — مکاتبات این سفارش"
          subtitle="فقط مکاتبات رسمی مرتبط با این سفارش (منبع: گاه‌شمار)"
          Icon={Files}
        />
      ) : null}

      <p className="gahshomar-docs__boundary-note font-meem">
        این فهرست فقط پیش‌نمایش است — ثبت و ویرایش مکاتبات از ماژول دبیرخانه انجام می‌شود.
      </p>

      <div className="gahshomar-docs__section">
        <h4 className="gahshomar-docs__section-title font-meem">
          <Inbox size={16} strokeWidth={1.75} aria-hidden="true" />
          دریافتی
        </h4>
        <OrderCorrespondenceTable
          records={incoming}
          emptyTitle="نامه دریافتی‌ای برای این سفارش ثبت نشده است"
          partyLabel="فرستنده"
          onOpen={(recordId) => setDrawerState({ mode: DRAWER_MODE.VIEW, recordId })}
        />
      </div>

      <div className="gahshomar-docs__section">
        <h4 className="gahshomar-docs__section-title font-meem">
          <Send size={16} strokeWidth={1.75} aria-hidden="true" />
          ارسالی
        </h4>
        <OrderCorrespondenceTable
          records={outgoing}
          emptyTitle="نامه ارسالی‌ای برای این سفارش ثبت نشده است"
          partyLabel="گیرنده"
          onOpen={(recordId) => setDrawerState({ mode: DRAWER_MODE.VIEW, recordId })}
        />
      </div>

      <OfficialRecordDrawer
        mode={drawerState.mode}
        recordId={drawerState.recordId}
        onClose={() => setDrawerState({ mode: null, recordId: null })}
      />
    </section>
  );
}
