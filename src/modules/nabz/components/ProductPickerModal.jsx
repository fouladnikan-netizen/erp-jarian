import { useEffect, useMemo, useState } from 'react';
import {
  filterPickerProducts,
  listSubcategoriesForMain,
  MAIN_PRODUCT_CATEGORIES,
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
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [picked, setPicked] = useState({});
  const [pickOrder, setPickOrder] = useState([]);

  const subcategories = useMemo(
    () => listSubcategoriesForMain(activeCategory),
    [activeCategory],
  );

  useEffect(() => {
    setActiveSubcategory(subcategories[0] || '');
  }, [activeCategory, subcategories]);

  const products = useMemo(
    () => filterPickerProducts({
      mainCategory: activeCategory,
      subCategory: activeSubcategory,
      query: search,
    }),
    [activeCategory, activeSubcategory, search],
  );

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

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSearch('');
  };

  return (
    <div className="nabz-picker-overlay" onClick={onClose} role="presentation">
      <div
        className="nabz-picker-modal nabz-picker-modal--wide font-meem"
        role="dialog"
        aria-modal="true"
        aria-label="انتخاب کالا از ویترین"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="nabz-picker-modal__header nabz-picker-modal__header--stacked">
          <div className="nabz-picker-modal__header-top">
            <h3 className="font-meem">انتخاب از ویترین</h3>
            <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="search"
            className="nabz-form__input font-meem"
            placeholder="جستجوی سریع محصول..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="جستجوی محصول"
          />
          <div className="nabz-picker-tabs" role="tablist" aria-label="دسته‌های اصلی">
            {MAIN_PRODUCT_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={activeCategory === category}
                className={`nabz-picker-tabs__btn font-meem${activeCategory === category ? ' is-active' : ''}`}
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>
          {subcategories.length > 0 && (
            <div className="nabz-picker-tabs nabz-picker-tabs--sub" role="tablist" aria-label="زیردسته‌ها">
              {subcategories.map((subcategory) => (
                <button
                  key={subcategory}
                  type="button"
                  role="tab"
                  aria-selected={activeSubcategory === subcategory}
                  className={`nabz-picker-tabs__btn nabz-picker-tabs__btn--sub font-meem${
                    activeSubcategory === subcategory ? ' is-active' : ''
                  }`}
                  onClick={() => {
                    setActiveSubcategory(subcategory);
                    setSearch('');
                  }}
                >
                  {subcategory}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="nabz-picker-modal__table-wrap">
          <table className="nabz-picker-table" dir="rtl">
            <thead>
              <tr>
                <th className="nabz-picker-table__check-col font-meem">انتخاب</th>
                <th className="font-meem">نام محصول</th>
                <th className="font-meem">واحد</th>
                <th className="font-meem">تعداد تکرار</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="nabz-picker-table__empty font-meem">
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
                      <td className="nabz-picker-table__check-col" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="nabz-picker-table__checkbox"
                          checked={isChecked}
                          onChange={() => toggleProduct(product)}
                          aria-label={`انتخاب ${product.title}`}
                        />
                      </td>
                      <td className="nabz-picker-table__name font-meem">{product.title}</td>
                      <td className="nabz-picker-table__unit font-meem">{product.unit || '—'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          min="1"
                          className="nabz-picker-table__repeat font-yekan"
                          value={picked[product.id]?.repeat ?? 1}
                          disabled={!isChecked}
                          onChange={(e) => setRepeat(product.id, e.target.value)}
                          aria-label={`تعداد تکرار ${product.title}`}
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
          <span className="nabz-picker-modal__summary font-meem">
            {selectedCount.toLocaleString('fa-IR')} محصول انتخاب‌شده
          </span>
          <button
            type="button"
            className="btn btn--primary font-meem"
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
