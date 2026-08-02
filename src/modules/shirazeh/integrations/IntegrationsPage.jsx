import { useMemo } from 'react';
import { Activity, AlertTriangle, Plug } from 'lucide-react';
import { buildIntegrationsHealthSummary } from './config/integrationsRegistry';
import { useIntegrationUIStore } from './store/integrationUIStore';
import IntegrationGrid from './components/IntegrationGrid';
import './integrations.css';

function HealthMiniCard({ icon: Icon, label, value, tone = 'neutral' }) {
  return (
    <article className={`shirazeh-int-health-card shirazeh-int-health-card--${tone}`}>
      <div className="shirazeh-int-health-card__head">
        <span className="shirazeh-int-health-card__icon" aria-hidden="true">
          <Icon size={17} strokeWidth={1.75} />
        </span>
        <span className="shirazeh-int-health-card__label font-meem">{label}</span>
      </div>
      <p className="shirazeh-int-health-card__value font-yekan">{value}</p>
    </article>
  );
}

/**
 * Shirazeh → Integrations section (Outlet child for /shirazeh/integrations).
 */
export default function IntegrationsPage() {
  const health = useIntegrationUIStore((s) => s.health);
  const summary = useMemo(() => buildIntegrationsHealthSummary(health), [health]);

  return (
    <div className="shirazeh-integrations" dir="rtl">
      <header className="shirazeh-integrations__header">
        <h2 className="shirazeh-integrations__title font-meem">یکپارچگی‌ها</h2>
        <p className="shirazeh-integrations__subtitle font-meem">
          مدیریت اتصال‌های خارجی و سرویس‌های هوشمند سیستم
        </p>
      </header>

      <section className="shirazeh-integrations__health" aria-label="خلاصه وضعیت اتصال‌ها">
        <HealthMiniCard
          icon={Plug}
          label="اتصالات فعال"
          value={`${summary.activeCount.toLocaleString('fa-IR')} اتصال فعال`}
          tone="accent"
        />
        <HealthMiniCard
          icon={Activity}
          label="آخرین بررسی موفق"
          value={summary.lastSuccessfulCheck}
          tone="neutral"
        />
        <HealthMiniCard
          icon={AlertTriangle}
          label="اتصالات ناموفق"
          value={summary.failedCount.toLocaleString('fa-IR')}
          tone={summary.failedCount > 0 ? 'danger' : 'success'}
        />
      </section>

      <IntegrationGrid />
    </div>
  );
}
