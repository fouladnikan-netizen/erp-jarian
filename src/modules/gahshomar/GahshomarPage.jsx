import { useState } from 'react';
import { Inbox, Send } from 'lucide-react';
import { DRAWER_MODE } from './models/officialRecord';
import OfficialRecordList from './components/OfficialRecordList';
import OfficialRecordDrawer from './components/OfficialRecordDrawer';
import RecordTypePickerModal from './components/RecordTypePickerModal';
import {
  createDraftRecord,
  createReply,
  useOfficialRecordKpis,
  useOfficialRecordList,
} from './officialRecordFacade';
import ListPageLayout from '../../components/module/ListPageLayout';
import ListToolbar from '../../components/module/ListToolbar';
import ListFilterBar from '../../components/module/ListFilterBar';
import KpiCard from '../../components/module/KpiCard';
import '../kanoon/customerProfile.css';
import './gahshomar-documents.css';
import './gahshomar-page.css';

/**
 * Gahshomar MVP — List answers "What records exist?"
 * Drawer answers "What is this record?" / editor flow.
 * UI communicates ONLY with officialRecordFacade.
 */
export default function GahshomarPage() {
  const [tab, setTab] = useState('outgoing');
  const [search, setSearch] = useState('');
  const [kpiFilter, setKpiFilter] = useState(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [drawerState, setDrawerState] = useState({ mode: null, recordId: null });

  const kpis = useOfficialRecordKpis();
  const records = useOfficialRecordList({ tab, search, kpiFilter });

  const closeDrawer = () => setDrawerState({ mode: null, recordId: null });

  const handleKpiClick = (kpiId) => {
    setKpiFilter((current) => (current === kpiId ? null : kpiId));
    if (kpiId === 'new-incoming' || kpiId === 'pending-action') setTab('incoming');
    if (kpiId === 'issued-today') setTab('outgoing');
  };

  const handleTypeSelect = (direction) => {
    setTypePickerOpen(false);
    const draft = createDraftRecord(direction);
    if (!draft) return;
    setDrawerState({ mode: DRAWER_MODE.CREATE, recordId: draft.id });
    if (direction === 'INCOMING') setTab('incoming');
    if (direction === 'OUTGOING') setTab('outgoing');
  };

  const handleOpenDetail = (recordId) => {
    setDrawerState({ mode: DRAWER_MODE.VIEW, recordId });
  };

  const handleReply = (recordId) => {
    const reply = createReply(recordId);
    if (!reply) return;
    setTab('outgoing');
    setDrawerState({ mode: DRAWER_MODE.EDIT, recordId: reply.id });
  };

  return (
    <ListPageLayout
      moduleId="gahshomar"
      className="gahshomar-page"
      data-domain="gahshomar"
      kpis={(
        <section className="section-kpis" aria-label="شاخص‌های فیلترشونده">
          <div className="section-label">شاخص‌های عملکردی و آمار زنده</div>
          <div className="kpi-grid">
            {kpis.map((kpi) => (
              <KpiCard
                key={kpi.id}
                kpi={kpi}
                active={kpiFilter === kpi.id}
                onClick={() => handleKpiClick(kpi.id)}
              />
            ))}
          </div>
        </section>
      )}
      toolbar={(
        <ListToolbar
          searchPlaceholder="جستجو در شماره و موضوع..."
          searchValue={search}
          onSearchChange={setSearch}
          primaryLabel="ثبت مکاتبه"
          onPrimaryClick={() => setTypePickerOpen(true)}
          filters={(
            <ListFilterBar className="gahshomar-page__filters" ariaLabel="تب مکاتبات">
              <div className="nabz-tabs" role="tablist" aria-label="ارسال کردیم و دریافت کردیم">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'outgoing'}
                  className={`nabz-tabs__btn font-meem${tab === 'outgoing' ? ' is-active' : ''}`}
                  onClick={() => setTab('outgoing')}
                >
                  <Send size={14} strokeWidth={1.75} aria-hidden="true" />
                  ارسال کردیم
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'incoming'}
                  className={`nabz-tabs__btn font-meem${tab === 'incoming' ? ' is-active' : ''}`}
                  onClick={() => setTab('incoming')}
                >
                  <Inbox size={14} strokeWidth={1.75} aria-hidden="true" />
                  دریافت کردیم
                </button>
              </div>
            </ListFilterBar>
          )}
        />
      )}
    >
      <OfficialRecordList
        tab={tab}
        records={records}
        onOpenDetail={handleOpenDetail}
      />

      <RecordTypePickerModal
        open={typePickerOpen}
        onSelect={handleTypeSelect}
        onClose={() => setTypePickerOpen(false)}
      />

      <OfficialRecordDrawer
        mode={drawerState.mode}
        recordId={drawerState.recordId}
        onClose={closeDrawer}
        onReply={handleReply}
        onSaved={closeDrawer}
      />
    </ListPageLayout>
  );
}
