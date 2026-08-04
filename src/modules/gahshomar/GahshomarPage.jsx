import { useMemo, useState } from 'react';
import { Inbox, Send } from 'lucide-react';
import { useContactsStore } from '../../stores/useContactsStore';
import { getDisplayName } from '../kanoon/columns';
import CorrespondenceList from './components/CorrespondenceList';
import CorrespondenceComposeModal from './components/CorrespondenceComposeModal';
import CorrespondenceDetailDrawer from './components/CorrespondenceDetailDrawer';
import {
  computeCorrespondenceKpis,
  useCorrespondenceList,
} from './services/correspondenceService';
import { useCorrespondenceStore } from './store/useCorrespondenceStore';
import ListPageLayout from '../../components/module/ListPageLayout';
import ListToolbar from '../../components/module/ListToolbar';
import ListFilterBar from '../../components/module/ListFilterBar';
import KpiCard from '../../components/module/KpiCard';
import '../kanoon/customerProfile.css';
import './gahshomar-documents.css';
import './gahshomar-page.css';

/**
 * Gahshomar — correspondence-centric secretariat (Incoming / Outgoing tabs).
 * Organization is metadata/filter only — not the navigation axis.
 */
export default function GahshomarPage() {
  const contacts = useContactsStore((state) => state.contacts);
  const records = useCorrespondenceStore((state) => state.records);
  const [tab, setTab] = useState('incoming');
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [kpiFilter, setKpiFilter] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const kpis = useMemo(() => computeCorrespondenceKpis(records), [records]);

  const documents = useCorrespondenceList(tab, {
    viewerUserId: null,
    search,
    companyId: companyFilter === 'all' ? null : companyFilter,
    kpiFilter,
  });

  const detailCompanyName = useMemo(() => {
    if (!detail?.companyId) return '';
    const match = contacts.find((c) => String(c.id) === String(detail.companyId));
    return match
      ? (getDisplayName(match) || match.companyName || match.personName || '')
      : '';
  }, [detail, contacts]);

  const handleKpiClick = (kpiId) => {
    setKpiFilter((current) => (current === kpiId ? null : kpiId));
    if (kpiId === 'new-incoming' || kpiId === 'action-needed') setTab('incoming');
    if (kpiId === 'outgoing-today') setTab('outgoing');
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
          searchPlaceholder="جستجو در موضوع، شماره، فرستنده یا گیرنده..."
          searchValue={search}
          onSearchChange={setSearch}
          primaryLabel="ثبت مکاتبه"
          onPrimaryClick={() => setComposeOpen(true)}
          filters={(
            <ListFilterBar className="gahshomar-page__filters" ariaLabel="تب مکاتبات">
              <div className="nabz-tabs" role="tablist" aria-label="وارده و صادره">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'incoming'}
                  className={`nabz-tabs__btn font-meem${tab === 'incoming' ? ' is-active' : ''}`}
                  onClick={() => setTab('incoming')}
                >
                  <Inbox size={14} strokeWidth={1.75} aria-hidden="true" />
                  وارده
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'outgoing'}
                  className={`nabz-tabs__btn font-meem${tab === 'outgoing' ? ' is-active' : ''}`}
                  onClick={() => setTab('outgoing')}
                >
                  <Send size={14} strokeWidth={1.75} aria-hidden="true" />
                  صادره
                </button>
              </div>

              <select
                className="gahshomar-page__select font-meem"
                aria-label="فیلتر سازمان"
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
              >
                <option value="all">همه سازمان‌ها</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={String(contact.id)}>
                    {getDisplayName(contact)
                      || contact.companyName
                      || contact.personName
                      || `مخاطب ${contact.id}`}
                  </option>
                ))}
              </select>
            </ListFilterBar>
          )}
        />
      )}
    >
      <CorrespondenceList
        tab={tab}
        documents={documents}
        onOpenDetail={setDetail}
      />

      <CorrespondenceComposeModal
        open={composeOpen}
        initialDirection={tab}
        contacts={contacts}
        onClose={() => setComposeOpen(false)}
      />

      <CorrespondenceDetailDrawer
        record={detail}
        companyName={detailCompanyName}
        onClose={() => setDetail(null)}
      />
    </ListPageLayout>
  );
}
