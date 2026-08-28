function ActionIcon({ children, label, onClick }) {
  return (
    <button type="button" className="vitrin-row-actions__btn" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

export default function VitrinRowActions({ product, onToggleActive }) {
  const isActive = product.lifecycleStatus !== 'INACTIVE';
  if (typeof onToggleActive !== 'function') return null;

  return (
    <div className="vitrin-row-actions">
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
    </div>
  );
}
