/**
 * Related information region (related orders, people, attachments, …).
 */
export default function ProfileRelated({
  className,
  children,
  as: Component = 'section',
  'aria-label': ariaLabel = 'اطلاعات مرتبط',
  ...rest
}) {
  return (
    <Component className={className} aria-label={ariaLabel} {...rest}>
      {children}
    </Component>
  );
}
