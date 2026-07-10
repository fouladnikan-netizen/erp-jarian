function ActionIcon({ children, label, onClick }) {
  return (
    <button type="button" className="vitrin-row-actions__btn" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

export default function VitrinRowActions({ product, onEdit, onToggleActive }) {
  const isActive = product.isActive !== false;

  return (
    <div className="vitrin-row-actions">
      <ActionIcon label="ویرایش" onClick={() => onEdit(product)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </ActionIcon>
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
