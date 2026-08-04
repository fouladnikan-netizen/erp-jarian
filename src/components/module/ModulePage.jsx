import { useState } from 'react';
import ListPageLayout from './ListPageLayout';
import ListToolbar from './ListToolbar';
import KpiCard from './KpiCard';
import DataTable from './DataTable';

/**
 * Generic module list page — unified 3-block list layout.
 */
export default function ModulePage({ module, data }) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(data.filters?.[0] || null);

  return (
    <ListPageLayout
      moduleId={module.id}
      kpis={(
        <section className="section-kpis" aria-label="شاخص‌های کلیدی">
          <div className="kpi-grid">
            {data.kpis.map((kpi) => (
              <KpiCard key={kpi.label} kpi={kpi} />
            ))}
          </div>
        </section>
      )}
      toolbar={(
        <ListToolbar
          searchPlaceholder={data.searchPlaceholder}
          searchValue={search}
          onSearchChange={setSearch}
          primaryLabel={data.primaryAction || 'ثبت رکورد جدید'}
          secondary={(data.secondaryActions || []).map((action) => (
            <button key={action} type="button" className="btn btn--outline font-meem">
              {action}
            </button>
          ))}
          filters={(data.filters || []).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`chip font-meem${activeFilter === filter ? ' is-active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        />
      )}
    >
      <DataTable data={data} />
    </ListPageLayout>
  );
}
