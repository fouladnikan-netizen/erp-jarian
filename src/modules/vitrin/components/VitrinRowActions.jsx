function ActionIcon({ children, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      className={`vitrin-row-actions__btn${danger ? ' vitrin-row-actions__btn--danger' : ''}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function VitrinRowActions({ product, onToggleActive, onDelete }) {
  const isActive = product.lifecycleStatus !== 'INACTIVE';
  const hasLifecycle = typeof onToggleActive === 'function';
  const hasDelete = typeof onDelete === 'function';
  if (!hasLifecycle && !hasDelete) return null;

  return (
    <div className="vitrin-row-actions">
      {hasLifecycle && (
        <ActionIcon label={isActive ? 'غیرفعال کردن' : 'فعال کردن'} onClick={() => onToggleActive(product)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {isActive ? (
              <>
                <path d="M12 2v10" />
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              </>
            ) : (
              <path d="M12 2v10M18.36 6.64a9 9 0 1 1-12.73 0" />
            )}
          </svg>
        </ActionIcon>
      )}
      {hasDelete && (
        <ActionIcon label="حذف" danger onClick={() => onDelete(product)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
          </svg>
        </ActionIcon>
      )}
    </div>
  );
}
