/**
 * Summary cards region (KPIs, identity summary, financial snapshot, …).
 */
export default function ProfileSummary({
  className,
  children,
  'aria-label': ariaLabel = 'خلاصه موجودیت',
  as: Component = 'section',
  ...rest
}) {
  return (
    <Component className={className} aria-label={ariaLabel} {...rest}>
      {children}
    </Component>
  );
}
