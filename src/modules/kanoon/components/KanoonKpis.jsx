import KpiCard from '../../../components/module/KpiCard';

export default function KanoonKpis({ kpis }) {
  return (
    <section className="section-kpis" aria-label="شاخص‌های کلیدی">
      <div className="section-label">شاخص‌های کلیدی عملکرد</div>
      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}
