/**
 * Profile header band (identity title / status strip).
 * Styling via className from the module — no default look.
 */
export default function ProfileHeader({
  className,
  children,
  as: Component = 'header',
  ...rest
}) {
  return (
    <Component className={className} {...rest}>
      {children}
    </Component>
  );
}
