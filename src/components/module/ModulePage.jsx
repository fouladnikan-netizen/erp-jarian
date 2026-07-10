import KpiCard from './KpiCard';
import ActionsBar from './ActionsBar';
import DataTable from './DataTable';

export default function ModulePage({ module, data }) {
  return (
    <div className="module-page" data-module={module.id}>
      <section className="section-kpis" aria-label="شاخص‌های کلیدی">
        <div className="section-label">شاخص‌های کلیدی عملکرد</div>
        <div className="kpi-grid">
          {data.kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </div>
      </section>

      <ActionsBar data={data} />
      <DataTable data={data} />
    </div>
  );
}
