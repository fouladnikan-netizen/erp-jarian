/**
 * Inline filter cluster for ListToolbar (Block 2).
 * Does not render its own section — parent toolbar owns the glass shell.
 */
export default function ListFilterBar({
  children,
  className = '',
  ariaLabel = 'فیلتر، وضعیت و مرتب‌سازی',
}) {
  if (children == null) return null;

  return (
    <div
      className={`list-toolbar__filter-cluster ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
