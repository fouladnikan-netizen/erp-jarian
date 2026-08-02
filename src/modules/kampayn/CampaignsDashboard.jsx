import { useMemo, useState } from 'react';
import {
  Plus,
  Megaphone,
  Search,
  Pause,
  Play,
  Workflow,
} from 'lucide-react';
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  INITIAL_CAMPAIGNS,
  findLabel,
  TRIGGER_OPTIONS,
  ACTION_OPTIONS,
} from './campaignsData';
import CampaignBuilderDrawer from './CampaignBuilderDrawer';
import './kampayn.css';

const ICON = { size: 16, strokeWidth: 1.75 };

function StatusBadge({ status }) {
  const meta = CAMPAIGN_STATUSES[status] || CAMPAIGN_STATUSES.draft;
  return <span className={`kampayn-status kampayn-status--${status}`}>{meta.label}</span>;
}

export default function CampaignsDashboard() {
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
    const avgResponse = campaigns.length
      ? Math.round(campaigns.reduce((sum, c) => sum + c.responseRate, 0) / campaigns.length)
      : 0;
    return { total: campaigns.length, active, paused, avgResponse };
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
      id: `cmp-${Date.now()}`,
      name: draft.name,
      type: draft.type,
      status: 'active',
      responseRate: 0,
      conversionRate: 0,
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
            <div className="kampayn-kpi__label">میانگین مشارکت</div>
            <div className="kampayn-kpi__value font-yekan">{kpis.avgResponse.toLocaleString('fa-IR')}٪</div>
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
        <button
          type="button"
          className="kampayn-btn kampayn-btn--launch"
          onClick={() => setBuilderOpen(true)}
        >
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          ایجاد کمپین جدید
        </button>
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
                <th>نرخ مشارکت</th>
                <th>نرخ تبدیل</th>
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
                  <td className="font-yekan">{campaign.responseRate.toLocaleString('fa-IR')}٪</td>
                  <td className="font-yekan">{campaign.conversionRate.toLocaleString('fa-IR')}٪</td>
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
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={8} className="kampayn-empty font-meem">کمپینی با این فیلتر یافت نشد.</td>
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
