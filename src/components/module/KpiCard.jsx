export default function KpiCard({ kpi, onClick = null, active = false }) {
  const variantClass = kpi.variant ? `kpi-card--${kpi.variant}` : '';
  const trendClass = kpi.trendDir === 'down' ? 'kpi-card__trend--down' : 'kpi-card__trend--up';
  const trendIcon = kpi.trendDir === 'down' ? '↓' : '↑';
  const interactive = typeof onClick === 'function';
  const className = [
    'kpi-card',
    variantClass,
    interactive ? 'kpi-card--interactive' : '',
    active ? 'is-active' : '',
  ].filter(Boolean).join(' ');

  const body = (
    <>
      <div className="kpi-card__label font-meem">{kpi.label}</div>
      <div className="kpi-card__value font-yekan">{kpi.value}</div>
      {kpi.trend && (
        <span className={`kpi-card__trend ${trendClass} font-meem`}>
          {trendIcon} {kpi.trend}
        </span>
      )}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-pressed={active}
      >
        {body}
      </button>
    );
  }

  return (
    <article className={className}>
      {body}
    </article>
  );
}
