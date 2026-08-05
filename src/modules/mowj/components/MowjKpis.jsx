import KpiCard from '../../../components/module/KpiCard';

/**
 * KPI strip for Mowj list — Unified List block 1 (section-kpis + kpi-grid).
 */
export default function MowjKpis({ kpis }) {
  const cards = [
    { label: 'کل کمپین‌ها', value: Number(kpis?.total || 0).toLocaleString('fa-IR') },
    { label: 'آماده / در حال اجرا', value: Number(kpis?.active || 0).toLocaleString('fa-IR') },
    { label: 'نگهداشت', value: Number(kpis?.retention || 0).toLocaleString('fa-IR') },
    { label: 'جذب', value: Number(kpis?.acquisition || 0).toLocaleString('fa-IR') },
  ];

  return (
    <section className="section-kpis" aria-label="شاخص‌های موج">
      <div className="kpi-grid">
        {cards.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}
