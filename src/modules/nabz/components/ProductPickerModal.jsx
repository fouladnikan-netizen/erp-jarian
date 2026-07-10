import { useMemo, useState } from 'react';
import { initialProducts } from '../../vitrin/catalogData';
import {
  MAIN_PRODUCT_CATEGORIES,
  productMatchesCategory,
} from '../vitrinCategories';

function buildSelectionList(pickOrder, picked) {
  return pickOrder
    .filter((id) => picked[id])
    .map((id) => ({
      product: picked[id].product,
      repeat: Math.max(1, Number(picked[id].repeat) || 1),
    }));
}

export default function ProductPickerModal({ onClose, onConfirm }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(MAIN_PRODUCT_CATEGORIES[0]);
  const [picked, setPicked] = useState({});
  const [pickOrder, setPickOrder] = useState([]);

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialProducts
      .filter((p) => p.isActive !== false)
      .filter((p) => (q ? true : productMatchesCategory(p, activeCategory)))
      .filter((p) => {
        if (!q) return true;
        const haystack = [p.title, p.description, p.code, p.unit].join(' ').toLowerCase();
        return haystack.includes(q);
      });
  }, [search, activeCategory]);

  const selectedCount = pickOrder.filter((id) => picked[id]).length;

  const toggleProduct = (product) => {
    setPicked((prev) => {
      if (prev[product.id]) {
        const next = { ...prev };
        delete next[product.id];
        return next;
      }
      return { ...prev, [product.id]: { product, repeat: 1 } };
    });
    setPickOrder((prev) => (
      prev.includes(product.id)
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id]
    ));
  };

  const setRepeat = (productId, repeat) => {
    setPicked((prev) => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: { ...prev[productId], repeat: Math.max(1, Number(repeat) || 1) },
      };
    });
  };

  const handleConfirm = () => {
    const selections = buildSelectionList(pickOrder, picked);
    if (!selections.length) return;
    onConfirm(selections);
    onClose();
  };

  return (
    <div className="nabz-picker-overlay" onClick={onClose} role="presentation">
      <div
        className="nabz-picker-modal nabz-picker-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label="انتخاب کالا از ویترین"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="nabz-picker-modal__header nabz-picker-modal__header--stacked">
          <div className="nabz-picker-modal__header-top">
            <h3>انتخاب از ویترین</h3>
            <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="search"
            className="nabz-form__input"
            placeholder="جستجوی سریع محصول..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="جستجوی محصول"
          />
          <div className="nabz-picker-tabs" role="tablist" aria-label="دسته‌های محصول">
            {MAIN_PRODUCT_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={activeCategory === category}
                className={`nabz-picker-tabs__btn${activeCategory === category ? ' is-active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </header>

        <div className="nabz-picker-modal__table-wrap">
          <table className="nabz-picker-table">
            <thead>
              <tr>
                <th>نام محصول</th>
                <th>کد</th>
                <th>تعداد تکرار</th>
                <th className="nabz-picker-table__check-col">انتخاب</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="nabz-picker-table__empty">
                    محصولی در این دسته یافت نشد.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isChecked = Boolean(picked[product.id]);
                  return (
                    <tr
                      key={product.id}
                      className={`nabz-picker-table__row${isChecked ? ' is-selected' : ''}`}
                      onClick={() => toggleProduct(product)}
                    >
                      <td className="nabz-picker-table__name">{product.title}</td>
                      <td className="nabz-picker-table__code">{product.code}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          min="1"
                          className="nabz-picker-table__repeat"
                          value={picked[product.id]?.repeat ?? 1}
                          disabled={!isChecked}
                          onChange={(e) => setRepeat(product.id, e.target.value)}
                          aria-label={`تعداد تکرار ${product.title}`}
                        />
                      </td>
                      <td className="nabz-picker-table__check-col" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="nabz-picker-table__checkbox"
                          checked={isChecked}
                          onChange={() => toggleProduct(product)}
                          aria-label={`انتخاب ${product.title}`}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="nabz-picker-modal__footer">
          <span className="nabz-picker-modal__summary">
            {selectedCount.toLocaleString('fa-IR')} محصول انتخاب‌شده
          </span>
          <button
            type="button"
            className="btn btn--primary"
            disabled={selectedCount === 0}
            onClick={handleConfirm}
          >
            افزودن به سفارش
          </button>
        </footer>
      </div>
    </div>
  );
}
