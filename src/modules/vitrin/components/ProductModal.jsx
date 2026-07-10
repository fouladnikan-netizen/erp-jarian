import { useEffect, useMemo, useState } from 'react';
import { PRODUCT_UNITS } from '../config';
import { buildProductCode } from '../productCode';

const EMPTY = {
  groupId: '',
  subgroupId: '',
  title: '',
  description: '',
  unit: PRODUCT_UNITS[2],
};

export default function ProductModal({ groups, products, product, onClose, onSubmit }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(() => (product ? {
    groupId: product.groupId,
    subgroupId: product.subgroupId,
    title: product.title,
    description: product.description || '',
    unit: product.unit,
  } : { ...EMPTY }));
  const [error, setError] = useState('');

  const selectedGroup = groups.find((g) => g.id === Number(form.groupId));
  const subgroups = selectedGroup?.subgroups || [];

  const previewCode = useMemo(() => {
    const groupId = Number(form.groupId);
    const subgroupId = Number(form.subgroupId);
    if (!groupId || !subgroupId) return '———';
    const { code } = buildProductCode(products, groupId, subgroupId, product?.id);
    return code;
  }, [form.groupId, form.subgroupId, products, product?.id]);

  useEffect(() => {
    if (!selectedGroup) return;
    const stillValid = subgroups.some((s) => s.id === Number(form.subgroupId));
    if (!stillValid) {
      setForm((f) => ({ ...f, subgroupId: subgroups[0]?.id || '' }));
    }
  }, [form.groupId, selectedGroup, subgroups, form.subgroupId]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const groupId = Number(form.groupId);
    const subgroupId = Number(form.subgroupId);
    const title = form.title.trim();

    if (!groupId || !subgroupId) {
      setError('گروه و زیرگروه کالا را انتخاب کنید.');
      return;
    }
    if (!title) {
      setError('شرح کالا الزامی است.');
      return;
    }

    const samePlacement = isEdit && product.groupId === groupId && product.subgroupId === subgroupId;
    const { serial, code } = samePlacement
      ? { serial: product.serial, code: product.code }
      : buildProductCode(products, groupId, subgroupId, product?.id);

    onSubmit({
      groupId,
      subgroupId,
      serial,
      code,
      title,
      description: form.description.trim(),
      unit: form.unit,
      isActive: product?.isActive ?? true,
      specs: product?.specs ?? {},
      relatedOrders: product?.relatedOrders ?? [],
    });
  };

  return (
    <div className="vitrin-modal-overlay" onClick={onClose} role="presentation">
      <div className="vitrin-modal vitrin-modal--wide" role="dialog" aria-modal="true" aria-label={isEdit ? 'ویرایش محصول' : 'ثبت محصول جدید'} onClick={(e) => e.stopPropagation()}>
        <header className="vitrin-modal__header">
          <h2 className="vitrin-modal__title">{isEdit ? 'ویرایش محصول' : 'ثبت محصول جدید'}</h2>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <form className="vitrin-modal__body" onSubmit={handleSubmit}>
          <div className="vitrin-form__grid">
            <label className="vitrin-form__field">
              <span className="vitrin-form__label">گروه کالا</span>
              <select value={form.groupId} onChange={(e) => update('groupId', e.target.value)} required>
                <option value="">— انتخاب کنید —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
            <label className="vitrin-form__field">
              <span className="vitrin-form__label">زیرگروه کالا</span>
              <select
                value={form.subgroupId}
                onChange={(e) => update('subgroupId', e.target.value)}
                disabled={!form.groupId}
                required
              >
                <option value="">— انتخاب کنید —</option>
                {subgroups.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="vitrin-form__field">
            <span className="vitrin-form__label">شرح کالا</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => { update('title', e.target.value); setError(''); }}
              placeholder="نام و مشخصات کوتاه کالا"
            />
          </label>

          <label className="vitrin-form__field">
            <span className="vitrin-form__label">کد کالا (۷ رقمی)</span>
            <input type="text" className="vitrin-form__readonly" value={previewCode} readOnly aria-readonly="true" />
            <span className="vitrin-form__hint">[گروه ۲ رقم] + [زیرگروه ۲ رقم] + [سریال ۳ رقم]</span>
          </label>

          <label className="vitrin-form__field">
            <span className="vitrin-form__label">توضیحات</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="توضیحات تکمیلی..."
            />
          </label>

          <label className="vitrin-form__field">
            <span className="vitrin-form__label">واحد</span>
            <select value={form.unit} onChange={(e) => update('unit', e.target.value)}>
              {PRODUCT_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </label>

          {error && <p className="vitrin-form__error">{error}</p>}

          <footer className="vitrin-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>انصراف</button>
            <button type="submit" className="btn btn--primary">{isEdit ? 'ذخیره تغییرات' : 'ثبت محصول'}</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
