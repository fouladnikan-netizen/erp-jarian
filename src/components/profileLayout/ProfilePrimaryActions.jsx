/**
 * Primary action bar (CTA cluster on a profile).
 */
export default function ProfilePrimaryActions({
  className,
  children,
  'aria-label': ariaLabel = 'اقدامات اصلی',
  as: Component = 'div',
  ...rest
}) {
  return (
    <Component className={className} aria-label={ariaLabel} role="toolbar" {...rest}>
      {children}
    </Component>
  );
}
