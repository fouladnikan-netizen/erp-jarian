/**
 * Structural shell for an entity profile page.
 * Pass existing module classNames — this component adds no visual styles.
 */
export default function ProfilePageShell({
  className = 'module-page',
  dataModule,
  topbar = null,
  children,
  ...rest
}) {
  return (
    <div className={className} data-module={dataModule} {...rest}>
      {topbar}
      {children}
    </div>
  );
}
