/**
 * Optional compositional layout: slots map to the profile contract.
 * Modules may use individual primitives instead when structure differs (e.g. side rail).
 *
 * Slots: topbar, header, summary, primaryActions, tabs, timeline, related, aside, main
 */
export default function ProfileLayout({
  className,
  bodyClassName,
  asideClassName,
  mainClassName,
  topbar = null,
  header = null,
  summary = null,
  primaryActions = null,
  tabs = null,
  timeline = null,
  related = null,
  aside = null,
  main = null,
  children = null,
  dataModule,
}) {
  const hasBody = aside != null || main != null || children != null;

  return (
    <div className={className} data-module={dataModule}>
      {topbar}
      {header}
      {summary}
      {primaryActions}
      {tabs}
      {hasBody ? (
        <div className={bodyClassName}>
          {aside != null ? <aside className={asideClassName}>{aside}</aside> : null}
          <main className={mainClassName}>
            {main}
            {timeline}
            {related}
            {children}
          </main>
        </div>
      ) : (
        <>
          {timeline}
          {related}
        </>
      )}
    </div>
  );
}
