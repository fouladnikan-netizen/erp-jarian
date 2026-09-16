/**
 * Unified Jarian overlay backdrop — use for BOTH modals and drawers.
 */

export default function JarianBackdrop({
  open = true,
  onClose,
  variant = 'drawer',
  transition = false,
  className = '',
  children,
  asButton = false,
}) {
  if (!open) return null;

  const classes = [
    'jarian-backdrop',
    variant === 'modal' ? 'jarian-backdrop--modal' : '',
    transition ? 'jarian-backdrop--transition' : '',
    className,
  ].filter(Boolean).join(' ');

  if (asButton) {
    return (
      <button
        type="button"
        className={classes}
        aria-label="بستن"
        onClick={onClose}
      />
    );
  }

  return (
    <div className={classes} role="presentation" onClick={onClose}>
      {children}
    </div>
  );
}
