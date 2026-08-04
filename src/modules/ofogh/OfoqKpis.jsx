import { useMemo } from 'react';
import { useContactsStore, LIFECYCLE_STAGES } from '../../stores/useContactsStore';
import { PIPELINE_STAGES, getPulseStatus } from './pipelineConfig';

const SQ_STAGE_COLOR = PIPELINE_STAGES.find(
  (stage) => stage.id === LIFECYCLE_STAGES.SALES_QUALIFIED,
)?.color || 'var(--success)';

/** مشتقات KPI افق — مستقیم از مخاطبین کانون (بدون state جداگانه). */
function computeOfoqKpis(contacts) {
  const active = contacts.filter(
    (contact) => contact.lifecycle_stage !== LIFECYCLE_STAGES.ARCHIVED,
  );
  const dueToday = active.filter(
    (contact) => getPulseStatus(contact.next_follow_up_date) === 'today',
  ).length;
  const salesQualified = active.filter(
    (contact) => contact.lifecycle_stage === LIFECYCLE_STAGES.SALES_QUALIFIED,
  ).length;
  const buyers = active.filter(
    (contact) => contact.lifecycle_stage === LIFECYCLE_STAGES.FIRST_TIME_BUYER
      || contact.lifecycle_stage === LIFECYCLE_STAGES.LOYAL,
  ).length;
  const conversionRate = active.length ? Math.round((buyers / active.length) * 100) : 0;

  return {
    total: active.length,
    dueToday,
    salesQualified,
    conversionRate,
    buyers,
  };
}

export default function OfoqKpis() {
  const contacts = useContactsStore((state) => state.contacts);
  const kpis = useMemo(() => computeOfoqKpis(contacts), [contacts]);

  const cards = [
    {
      label: 'سرنخ‌های فعال',
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
    {
      label: 'نرخ تبدیل',
      value: `${kpis.conversionRate.toLocaleString('fa-IR')}٪`,
      hint: `${kpis.buyers.toLocaleString('fa-IR')} خریدار از ${kpis.total.toLocaleString('fa-IR')} سرنخ`,
      accent: 'var(--warning)',
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
