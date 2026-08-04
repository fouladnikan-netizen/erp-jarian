/**
 * Timeline region for entity events / interactions.
 */
export default function EntityTimeline({
  className,
  children,
  as: Component = 'ol',
  'aria-label': ariaLabel = 'تایم‌لاین',
  ...rest
}) {
  return (
    <Component className={className} aria-label={ariaLabel} {...rest}>
      {children}
    </Component>
  );
}
