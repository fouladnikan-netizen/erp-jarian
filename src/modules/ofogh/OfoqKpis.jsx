import { useMemo } from 'react';
import { useCompanies, LIFECYCLE_STAGES, CONTACT_RECORD_TYPES } from '../kanoon/public/index.js';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { isOpenLeadStatus } from './domain/lead.constants.js';
import { PIPELINE_STAGES, getPulseStatus } from './pipelineConfig';

const SQ_STAGE_COLOR = PIPELINE_STAGES.find(
  (stage) => stage.id === LIFECYCLE_STAGES.SALES_QUALIFIED,
)?.color || 'var(--success)';

/** مشتقات KPI افق — مخاطبین کانون + سرنخ‌های باز افق. */
function computeOfoqKpis(contacts, openLeadCount) {
  const companies = contacts.filter(
    (contact) => contact.recordType !== CONTACT_RECORD_TYPES.LEAD
      && contact.lifecycle_stage
      && contact.lifecycle_stage !== LIFECYCLE_STAGES.ARCHIVED,
  );
  const dueToday = companies.filter(
    (contact) => getPulseStatus(contact.next_follow_up_date) === 'today',
  ).length;
  const salesQualified = companies.filter(
    (contact) => contact.lifecycle_stage === LIFECYCLE_STAGES.SALES_QUALIFIED,
  ).length;
  const buyers = companies.filter(
    (contact) => contact.lifecycle_stage === LIFECYCLE_STAGES.FIRST_TIME_BUYER
      || contact.lifecycle_stage === LIFECYCLE_STAGES.LOYAL,
  ).length;
  const conversionRate = companies.length ? Math.round((buyers / companies.length) * 100) : 0;

  return {
    openLeads: openLeadCount,
    total: companies.length,
    dueToday,
    salesQualified,
    conversionRate,
    buyers,
  };
}

export default function OfoqKpis() {
  const contacts = useCompanies();
  const openLeadCount = useLeadsStore(
    (state) => state.leads.filter((l) => isOpenLeadStatus(l.status)).length,
  );
  const kpis = useMemo(() => computeOfoqKpis(contacts, openLeadCount), [contacts, openLeadCount]);

  const cards = [
    {
      label: 'سرنخ خام',
      value: kpis.openLeads.toLocaleString('fa-IR'),
      hint: 'خارج از کانون',
      accent: 'var(--text-muted)',
    },
    {
      label: 'مخاطب فعال',
      value: kpis.total.toLocaleString('fa-IR'),
      hint: 'خارج از سایه',
      accent: 'var(--color-accent-dark)',
    },
    {
      label: 'پیگیری امروز',
      value: kpis.dueToday.toLocaleString('fa-IR'),
      hint: 'سررسید امروز',
      accent: 'var(--color-brand-red-glossy)',
    },
    {
      label: 'آستانه',
      value: kpis.salesQualified.toLocaleString('fa-IR'),
      hint: 'در انتظار صدور پیش‌کش',
      accent: SQ_STAGE_COLOR,
    },
  ];

  return (
    <section className="section-kpis nabz-kpis ofoq-kpis" aria-label="شاخص‌های کلیدی افق">
      <div className="kpi-grid nabz-kpi-grid">
        {cards.map((card) => (
          <article key={card.label} className="nabz-kpi" style={{ '--kpi-accent': card.accent }}>
            <span className="nabz-kpi__accent" aria-hidden="true" />
            <div className="nabz-kpi__body">
              <div className="nabz-kpi__label">{card.label}</div>
              <div className="nabz-kpi__value font-yekan">{card.value}</div>
              <span className="ofoq-kpi__hint">{card.hint}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
