import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Megaphone,
  Search,
  Pause,
  Play,
  Workflow,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  INITIAL_CAMPAIGNS,
  findLabel,
  TRIGGER_OPTIONS,
  ACTION_OPTIONS,
  buildMetrics,
  parseMetricNumeric,
} from './campaignsData';
import CampaignBuilderDrawer from './CampaignBuilderDrawer';
import { createEntityId, ENTITY_ID_PREFIX } from '../../domain/identity';
import './kampayn.css';

const ICON = { size: 16, strokeWidth: 1.75 };

function StatusBadge({ status }) {
  const meta = CAMPAIGN_STATUSES[status] || CAMPAIGN_STATUSES.draft;
  return <span className={`kampayn-status kampayn-status--${status}`}>{meta.label}</span>;
}

function SuccessMetricCell({ metrics }) {
  if (!metrics?.label) {
    return <span className="kampayn-metric__empty">—</span>;
  }
  const numeric = parseMetricNumeric(metrics);
  return (
    <span className="kampayn-metric">
      <span className="kampayn-metric__label font-meem">{metrics.label}:</span>
      <span className="kampayn-metric__value font-yekan">
        {numeric.toLocaleString('fa-IR')}٪
      </span>
    </span>
  );
}

export default function CampaignsDashboard() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [query, setQuery] = useState('');
  const [builderOpen, setBuilderOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter((c) => {
      const typeLabel = CAMPAIGN_TYPES[c.type]?.label || '';
      const statusLabel = CAMPAIGN_STATUSES[c.status]?.label || '';
      return `${c.name} ${typeLabel} ${statusLabel}`.toLowerCase().includes(q);
    });
  }, [campaigns, query]);

  const kpis = useMemo(() => {
    const active = campaigns.filter((c) => c.status === 'active').length;
    const paused = campaigns.filter((c) => c.status === 'paused').length;
    const avgMetric = campaigns.length
      ? Math.round(
        campaigns.reduce((sum, c) => sum + parseMetricNumeric(c.metrics), 0) / campaigns.length,
      )
      : 0;
    return { total: campaigns.length, active, paused, avgMetric };
  }, [campaigns]);

  const toggleStatus = (id) => {
    setCampaigns((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      if (c.status === 'active') return { ...c, status: 'paused' };
      if (c.status === 'paused' || c.status === 'draft') return { ...c, status: 'active' };
      return c;
    }));
  };

  const handleActivate = (draft) => {
    const next = {
      id: createEntityId(ENTITY_ID_PREFIX.CAMPAIGN),
      name: draft.name,
      type: draft.type,
      status: 'active',
      metrics: buildMetrics(draft.type, 0),
      triggerId: draft.triggerId,
      actionId: draft.actionId,
      surveyId: draft.surveyId,
    };
    setCampaigns((prev) => [next, ...prev]);
    setBuilderOpen(false);
  };

  return (
    <div className="module-page kampayn-page" data-module="kampayn" dir="rtl">
      <section className="section-kpis" aria-label="شاخص‌های کمپین">
        <div className="section-label">شاخص‌های کلیدی</div>
        <div className="kampayn-kpi-grid">
          <article className="kampayn-kpi">
            <div className="kampayn-kpi__label">کل کمپین‌ها</div>
            <div className="kampayn-kpi__value font-yekan">{kpis.total.toLocaleString('fa-IR')}</div>
          </article>
          <article className="kampayn-kpi">
            <div className="kampayn-kpi__label">فعال</div>
            <div className="kampayn-kpi__value font-yekan">{kpis.active.toLocaleString('fa-IR')}</div>
          </article>
          <article className="kampayn-kpi">
            <div className="kampayn-kpi__label">متوقف</div>
            <div className="kampayn-kpi__value font-yekan">{kpis.paused.toLocaleString('fa-IR')}</div>
          </article>
          <article className="kampayn-kpi">
            <div className="kampayn-kpi__label">میانگین شاخص</div>
            <div className="kampayn-kpi__value font-yekan">{kpis.avgMetric.toLocaleString('fa-IR')}٪</div>
          </article>
        </div>
      </section>

      <section className="kampayn-toolbar glass-panel">
        <div className="kampayn-toolbar__search">
          <Search {...ICON} aria-hidden="true" />
          <input
            type="search"
            className="kampayn-toolbar__input font-meem"
            placeholder="جستجو در کمپین‌ها…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="kampayn-toolbar__actions">
          <button
            type="button"
            className="kampayn-btn kampayn-btn--ghost"
            onClick={() => navigate('/kampayn/analytics')}
          >
            <BarChart3 size={16} strokeWidth={1.75} aria-hidden="true" />
            داشبورد طنین
          </button>
          <button
            type="button"
            className="kampayn-btn kampayn-btn--ghost"
            onClick={() => navigate('/kampayn/survey')}
          >
            <ClipboardList size={16} strokeWidth={1.75} aria-hidden="true" />
            طراحی فرم
          </button>
          <button
            type="button"
            className="kampayn-btn kampayn-btn--launch"
            onClick={() => setBuilderOpen(true)}
          >
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
            ایجاد کمپین جدید
          </button>
        </div>
      </section>

      <section className="kampayn-table-wrap glass-panel" aria-label="فهرست کمپین‌ها">
        <header className="kampayn-table-head">
          <Megaphone {...ICON} aria-hidden="true" />
          <h2 className="font-meem">کمپین‌های فعال و پیش‌نویس</h2>
          <span className="kampayn-table-count font-yekan">{filtered.length.toLocaleString('fa-IR')}</span>
        </header>

        <div className="kampayn-table-scroll">
          <table className="jarian-table kampayn-table">
            <thead>
              <tr>
                <th>ردیف</th>
                <th>نام کمپین</th>
                <th>نوع</th>
                <th>وضعیت</th>
                <th>شاخص موفقیت</th>
                <th>قانون</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((campaign, index) => (
                <tr key={campaign.id}>
                  <td className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>
                  <td className="kampayn-td-name">
                    <span className="font-meem">{campaign.name}</span>
                  </td>
                  <td>
                    <span className="kampayn-type-chip font-meem">
                      {CAMPAIGN_TYPES[campaign.type]?.label}
                    </span>
                  </td>
                  <td><StatusBadge status={campaign.status} /></td>
                  <td>
                    <SuccessMetricCell metrics={campaign.metrics} />
                  </td>
                  <td className="kampayn-td-rule">
                    <span className="kampayn-rule-line font-meem">
                      <Workflow size={13} strokeWidth={1.75} aria-hidden="true" />
                      {findLabel(TRIGGER_OPTIONS, campaign.triggerId)}
                    </span>
                    <span className="kampayn-rule-line kampayn-rule-line--muted">
                      {findLabel(ACTION_OPTIONS, campaign.actionId)}
                    </span>
                  </td>
                  <td>
                    <div className="kampayn-row-actions">
                      {campaign.surveyId ? (
                        <button
                          type="button"
                          className="kampayn-icon-btn"
                          title="طراحی فرم"
                          aria-label="طراحی فرم نظرسنجی"
                          onClick={() => navigate(`/kampayn/survey?id=${encodeURIComponent(campaign.surveyId)}`)}
                        >
                          <ClipboardList size={15} strokeWidth={1.75} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="kampayn-icon-btn"
                        title={campaign.status === 'active' ? 'توقف' : 'فعال‌سازی'}
                        aria-label={campaign.status === 'active' ? 'توقف کمپین' : 'فعال‌سازی کمپین'}
                        onClick={() => toggleStatus(campaign.id)}
                      >
                        {campaign.status === 'active'
                          ? <Pause size={15} strokeWidth={1.75} />
                          : <Play size={15} strokeWidth={1.75} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="kampayn-empty font-meem">کمپینی با این فیلتر یافت نشد.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <CampaignBuilderDrawer
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onActivate={handleActivate}
      />
    </div>
  );
}
