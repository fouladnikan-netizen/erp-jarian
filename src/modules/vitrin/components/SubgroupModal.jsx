import { useState } from 'react';

export default function SubgroupModal({ groupName, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('نام زیرگروه الزامی است.');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <div className="vitrin-modal-overlay" onClick={onClose} role="presentation">
      <div className="vitrin-modal" role="dialog" aria-modal="true" aria-label="ثبت زیرگروه" onClick={(e) => e.stopPropagation()}>
        <header className="vitrin-modal__header">
          <h2 className="vitrin-modal__title">ثبت زیرگروه — {groupName}</h2>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <form className="vitrin-modal__body" onSubmit={handleSubmit}>
          <label className="vitrin-form__field">
            <span className="vitrin-form__label">نام زیرگروه</span>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="مثلاً میلگرد آجدار"
              autoFocus
            />
          </label>
          {error && <p className="vitrin-form__error">{error}</p>}
          <footer className="vitrin-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>انصراف</button>
            <button type="submit" className="btn btn--primary">ثبت زیرگروه</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
