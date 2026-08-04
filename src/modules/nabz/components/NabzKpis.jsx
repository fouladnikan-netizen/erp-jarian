export default function NabzKpis({ kpis }) {
  return (
    <section className="section-kpis nabz-kpis" aria-label="شاخص‌های کلیدی">
      <div className="section-label">شاخص‌های عملکردی و آمار زنده</div>
      <div className="kpi-grid nabz-kpi-grid">
        {kpis.map((kpi) => {
          const tone = kpi.tone || 'neutral';
          const trendClass = kpi.trendDir === 'down' ? 'nabz-kpi__trend--down' : 'nabz-kpi__trend--up';
          const trendIcon = kpi.trendDir === 'down' ? '↓' : '↑';

          return (
            <article key={kpi.label} className={`nabz-kpi nabz-kpi--${tone}`}>
              <span className="nabz-kpi__accent" aria-hidden="true" />
              <div className="nabz-kpi__body">
                <div className="nabz-kpi__label">{kpi.label}</div>
                <div className="nabz-kpi__value font-yekan">{kpi.value}</div>
                {kpi.trend && (
                  <span className={`nabz-kpi__trend ${trendClass}`}>
                    {trendIcon}
                    {' '}
                    {kpi.trend}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
