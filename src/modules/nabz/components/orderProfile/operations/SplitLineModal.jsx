import { useEffect, useState } from 'react';

export default function SplitLineModal({ open, line, onClose, onSubmit }) {
  const [quantities, setQuantities] = useState(['', '']);

  useEffect(() => {
    if (!open || !line) return;
    const half = Math.floor(line.qty / 2);
    setQuantities([String(half), String(line.qty - half)]);
  }, [open, line]);

  if (!open || !line) return null;

  const sum = quantities.reduce((acc, value) => acc + (Number(value) || 0), 0);
  const isBalanced = Math.abs(sum - line.qty) < 0.001;

  const handleQtyChange = (index, value) => {
    setQuantities((prev) => prev.map((entry, i) => (i === index ? value : entry)));
  };

  const handleAddRow = () => {
    setQuantities((prev) => [...prev, '']);
  };

  const handleRemoveRow = (index) => {
    if (quantities.length <= 2) return;
    setQuantities((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(quantities);
  };

  return (
    <div className="tadarok-modal" role="presentation">
      <button type="button" className="tadarok-modal__backdrop" aria-label="بستن" onClick={onClose} />
      <div className="tadarok-modal__panel tadarok-modal__panel--narrow" role="dialog" aria-modal="true" aria-labelledby="split-line-title">
        <header className="tadarok-modal__header">
          <div>
            <h2 id="split-line-title" className="tadarok-modal__title">تفکیک سطر برای خرید چندتامین‌کننده</h2>
            <p className="tadarok-modal__subtitle">
              {line.name}
              {' '}
              —
              {' '}
              {line.qty.toLocaleString('fa-IR')}
              {' '}
              {line.unit}
            </p>
          </div>
          <button type="button" className="tadarok-modal__close" onClick={onClose} aria-label="بستن">×</button>
        </header>

        <form className="tadarok-modal__form" onSubmit={handleSubmit}>
          <p className="tadarok-split__hint">
            مقدار هر زیرسطر را وارد کنید. مجموع باید برابر
            {' '}
            <strong>{line.qty.toLocaleString('fa-IR')}</strong>
            {' '}
            {line.unit}
            باشد.
          </p>

          <div className="tadarok-split__rows">
            {quantities.map((qty, index) => (
              <label key={index} className="tadarok-split__row">
                <span>
                  زیرسطر
                  {' '}
                  {(index + 1).toLocaleString('fa-IR')}
                </span>
                <div className="tadarok-split__row-input">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="tadarok-form__input"
                    value={qty}
                    onChange={(e) => handleQtyChange(index, e.target.value)}
                    placeholder="مقدار"
                  />
                  <span className="tadarok-split__unit">{line.unit}</span>
                  {quantities.length > 2 && (
                    <button
                      type="button"
                      className="btn btn--ghost tadarok-split__remove"
                      onClick={() => handleRemoveRow(index)}
                    >
                      حذف
                    </button>
                  )}
                </div>
              </label>
            ))}
          </div>

          <button type="button" className="btn btn--outline tadarok-split__add" onClick={handleAddRow}>
            + افزودن زیرسطر
          </button>

          <p className={`tadarok-split__sum${isBalanced ? ' is-valid' : ' is-invalid'}`}>
            مجموع:
            {' '}
            <strong>{sum.toLocaleString('fa-IR')}</strong>
            {' '}
            /
            {' '}
            {line.qty.toLocaleString('fa-IR')}
            {' '}
            {line.unit}
          </p>

          <footer className="tadarok-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>انصراف</button>
            <button type="submit" className="btn btn--primary" disabled={!isBalanced}>تایید تفکیک</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
