import { Files, Inbox, Send, Eye } from 'lucide-react';
import { useState } from 'react';
import { DRAWER_MODE } from '../models/officialRecord';
import { useCompanyOfficialRecords } from '../officialRecordFacade';
import OfficialRecordDrawer from './OfficialRecordDrawer';
import { ProfileTabSectionHeader } from '../../../components/profileLayout';
import '../../kanoon/customerProfile.css';
import '../gahshomar-documents.css';

function ProfileTable({ records, emptyTitle, partyLabel = 'گیرنده', onOpen }) {
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
 * Profile documents tab — company-scoped reads via facade only.
 */
export default function GahshomarDocumentsPanel({ companyId, showHeader = true }) {
  const records = useCompanyOfficialRecords(companyId);
  const [drawerState, setDrawerState] = useState({ mode: null, recordId: null });

  const incoming = records.filter((record) => record.direction === 'INCOMING');
  const outgoing = records.filter((record) => record.direction === 'OUTGOING');

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
        <ProfileTable
          records={incoming}
          emptyTitle="نامه وارده‌ای برای این سازمان نیست"
          partyLabel="فرستنده"
          onOpen={(recordId) => setDrawerState({ mode: DRAWER_MODE.VIEW, recordId })}
        />
      </div>

      <div className="gahshomar-docs__section">
        <h4 className="gahshomar-docs__section-title font-meem">
          <Send size={16} strokeWidth={1.75} aria-hidden="true" />
          صادره
        </h4>
        <ProfileTable
          records={outgoing}
          emptyTitle="نامه صادره‌ای برای این سازمان نیست"
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
