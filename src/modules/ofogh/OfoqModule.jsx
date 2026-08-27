import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import OfoqRawLeadModal from './OfoqRawLeadModal';
import OfoqKpis from './OfoqKpis';
import OfoqToolbar from './OfoqToolbar';
import OfoqPipelineBoard from './OfoqPipelineBoard';
import ListPageLayout from '../../components/module/ListPageLayout';
import ListToolbar from '../../components/module/ListToolbar';
import { useCan } from '../../stores/useSessionStore';
import { PERMISSIONS } from '../../auth/permissions.catalog.js';
import { fetchLeadById } from './public/index.js';
import '../kanoon/kanoon.css';
import './ofoq-pipeline.css';

const OFOGH_VIEWS = Object.freeze({
  LEADS: 'leads',
  CUSTOMERS: 'customers',
});

/**
 * افق — دو تب: سرنخ‌ها (Lead Management) | چرخه مشتری (Customer Lifecycle view on Kanoon).
 * Deep-link: /ofogh?leadId=<id> | /ofogh?view=leads|customers
 */
export default function OfoqModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [globalQuery, setGlobalQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState([]);
  const [globalDue, setGlobalDue] = useState(null);
  const [rawLeadModalOpen, setRawLeadModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const canWriteLeads = useCan(PERMISSIONS.LEADS_WRITE);

  const viewParam = searchParams.get('view');
  const activeView = viewParam === OFOGH_VIEWS.CUSTOMERS
    ? OFOGH_VIEWS.CUSTOMERS
    : OFOGH_VIEWS.LEADS;

  useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (!leadId) return undefined;
    let cancelled = false;
    void (async () => {
      await fetchLeadById(leadId);
      if (!cancelled) {
        setSelectedLeadId(leadId);
        // Opening a lead forces Lead Management tab without dropping leadId.
        const next = new URLSearchParams(searchParams);
        if (next.get('view') !== OFOGH_VIEWS.LEADS) {
          next.set('view', OFOGH_VIEWS.LEADS);
          setSearchParams(next, { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  const setView = (view) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', view);
    if (view === OFOGH_VIEWS.CUSTOMERS) {
      next.delete('leadId');
      setSelectedLeadId(null);
    }
    setSearchParams(next, { replace: true });
  };

  const handleSelectLead = (id) => {
    setSelectedLeadId(id);
    const next = new URLSearchParams(searchParams);
    next.set('view', OFOGH_VIEWS.LEADS);
    if (id == null || id === '') {
      next.delete('leadId');
    } else {
      next.set('leadId', String(id));
    }
    setSearchParams(next, { replace: true });
  };

  const isLeads = activeView === OFOGH_VIEWS.LEADS;

  return (
    <ListPageLayout
      moduleId="ofogh"
      className="ofoq-page ofoq-pipeline"
      kpis={<OfoqKpis />}
      toolbar={(
        <ListToolbar
          className="ofoq-glass"
          searchPlaceholder={isLeads
            ? 'جستجو نام شرکت، شخص، موبایل، شناسه ملی…'
            : 'جستجو نام مشتری، شناسه ملی، تلفن…'}
          searchValue={globalQuery}
          onSearchChange={setGlobalQuery}
          primaryLabel={isLeads ? 'ثبت سرنخ خام' : undefined}
          onPrimaryClick={isLeads ? () => setRawLeadModalOpen(true) : undefined}
          primaryDisabled={isLeads ? !canWriteLeads : true}
          primaryTitle={isLeads && !canWriteLeads ? 'شما مجوز ایجاد سرنخ را ندارید.' : undefined}
          filters={(
            <div className="ofoq-toolbar-cluster" dir="rtl">
              <nav className="ofoq-workspace-tabs" aria-label="حوزه‌های افق">
                <button
                  type="button"
                  className={`ofoq-workspace-tabs__btn${isLeads ? ' is-active' : ''}`}
                  aria-pressed={isLeads}
                  data-testid="ofogh-tab-leads"
                  onClick={() => setView(OFOGH_VIEWS.LEADS)}
                >
                  سرنخ‌ها
                </button>
                <button
                  type="button"
                  className={`ofoq-workspace-tabs__btn${!isLeads ? ' is-active' : ''}`}
                  aria-pressed={!isLeads}
                  data-testid="ofogh-tab-customers"
                  onClick={() => setView(OFOGH_VIEWS.CUSTOMERS)}
                >
                  چرخه مشتری
                </button>
              </nav>
              <OfoqToolbar
                selectedStages={selectedStages}
                onStagesChange={setSelectedStages}
                dueFilter={globalDue}
                onDueFilterChange={setGlobalDue}
                entityScope={isLeads ? 'raw' : 'companies'}
                onEntityScopeChange={() => {}}
                hideEntityScope
              />
            </div>
          )}
        />
      )}
    >
      <OfoqPipelineBoard
        globalQuery={globalQuery}
        selectedStages={selectedStages}
        globalDue={globalDue}
        entityScope={isLeads ? 'raw' : 'companies'}
        boardMode={isLeads ? 'leads' : 'customers'}
        selectedLeadId={selectedLeadId}
        onSelectLead={handleSelectLead}
      />

      {rawLeadModalOpen && (
        <OfoqRawLeadModal
          onClose={() => setRawLeadModalOpen(false)}
          onSaved={(id) => handleSelectLead(id)}
        />
      )}
    </ListPageLayout>
  );
}
