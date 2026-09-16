/**
 * Unified list-page layout for standard Jarian modules
 * (Kanoon, Nabz, Ofogh, Vitrin, Gahshomar — NOT Pooyesh).
 *
 * Exact 3-block order (do not reorder):
 * 1. kpis     — KPI / live summary cards
 * 2. toolbar  — search (RTL right) + filters/chips + primary create (RTL left)
 * 3. children — data table / grid / board body
 */

export default function ListPageLayout({
  moduleId,
  className = '',
  dir = 'rtl',
  kpis,
  toolbar,
  /** @deprecated Prefer `toolbar` (3-block). Kept for transitional call sites. */
  actionBar = null,
  /** @deprecated Prefer embedding filters inside `toolbar`. */
  filters = null,
  children,
  ...rest
}) {
  const resolvedToolbar = toolbar ?? (
    <>
      {actionBar}
      {filters}
    </>
  );

  return (
    <div
      className={`module-page list-page-layout ${className}`.trim()}
      data-module={moduleId}
      data-layout="list-page-3"
      dir={dir}
      {...rest}
    >
      {kpis}
      {resolvedToolbar}
      {children}
    </div>
  );
}
