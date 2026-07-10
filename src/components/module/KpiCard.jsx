export default function KpiCard({ kpi }) {
  const variantClass = kpi.variant ? `kpi-card--${kpi.variant}` : '';
  const trendClass = kpi.trendDir === 'down' ? 'kpi-card__trend--down' : 'kpi-card__trend--up';
  const trendIcon = kpi.trendDir === 'down' ? '↓' : '↑';

  return (
    <article className={`kpi-card ${variantClass}`}>
      <div className="kpi-card__label">{kpi.label}</div>
      <div className="kpi-card__value">{kpi.value}</div>
      {kpi.trend && (
        <span className={`kpi-card__trend ${trendClass}`}>
          {trendIcon} {kpi.trend}
        </span>
      )}
    </article>
  );
}
