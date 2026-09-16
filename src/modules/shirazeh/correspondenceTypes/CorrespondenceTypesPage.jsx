import { useEffect, useMemo, useState } from 'react';
import { Plus, ArrowUp, ArrowDown, Pencil, Check, X, Power } from 'lucide-react';
import { useCorrespondenceTypesStore } from '../../../stores/useCorrespondenceTypesStore.js';
import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import '../activityTypes/activity-types.css';

/**
 * Shirazeh → Correspondence Types section (Outlet child for
 * /shirazeh/correspondence-types). Mirrors ActivityTypesPage exactly
 * (DDL-23d) — real backend-persisted CRUD; Gahshomar's correspondence
 * drawer reads this same registry via
 * src/domain/correspondenceTypes/correspondenceTypesFacade.js.
 */
export default function CorrespondenceTypesPage() {
  const canManage = useCan(PERMISSIONS.USERS_ADMIN);
  const types = useCorrespondenceTypesStore((s) => s.types);
  const error = useCorrespondenceTypesStore((s) => s.error);
  const fetchAll = useCorrespondenceTypesStore((s) => s.fetchAll);
  const createType = useCorrespondenceTypesStore((s) => s.createType);
  const updateType = useCorrespondenceTypesStore((s) => s.updateType);
  const activateType = useCorrespondenceTypesStore((s) => s.activateType);
  const deactivateType = useCorrespondenceTypesStore((s) => s.deactivateType);

  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [busyKey, setBusyKey] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const sorted = useMemo(
    () => [...types].sort((a, b) => a.sortOrder - b.sortOrder),
    [types],
  );

  const slugify = (label) => label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\u0600-\u06FF]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || `TYPE_${Date.now().toString(36).toUpperCase()}`;

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormError('');
    const labelFa = newLabel.trim();
    if (!labelFa) {
      setFormError('عنوان فارسی الزامی است.');
      return;
    }
    const key = (newKey.trim() || slugify(labelFa)).toUpperCase();
    setBusyKey('__create__');
    try {
      await createType({ key, labelFa });
      setNewLabel('');
      setNewKey('');
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'ثبت نوع جدید ناموفق بود.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleActive = async (item) => {
    setBusyKey(item.key);
    try {
      if (item.isActive) await deactivateType(item.key);
      else await activateType(item.key);
    } finally {
      setBusyKey(null);
    }
  };

  const startEdit = (item) => {
    setEditingKey(item.key);
    setEditLabel(item.labelFa);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditLabel('');
  };

  const saveEdit = async (item) => {
    const labelFa = editLabel.trim();
    if (!labelFa || labelFa === item.labelFa) {
      cancelEdit();
      return;
    }
    setBusyKey(item.key);
    try {
      await updateType(item.key, { labelFa });
      cancelEdit();
    } finally {
      setBusyKey(null);
    }
  };

  const move = async (item, direction) => {
    const idx = sorted.findIndex((t) => t.key === item.key);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    setBusyKey(item.key);
    try {
      await Promise.all([
        updateType(item.key, { sortOrder: swapWith.sortOrder }),
        updateType(swapWith.key, { sortOrder: item.sortOrder }),
      ]);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="shirazeh-atypes" dir="rtl">
      <header className="shirazeh-atypes__header">
        <div className="shirazeh-atypes__titles">
          <h2 className="shirazeh-atypes__title font-meem">انواع مکاتبات دبیرخانه</h2>
          <p className="shirazeh-atypes__subtitle font-meem">
            فهرست یکپارچه نوع مکاتبه که در ثبت نامه‌های دبیرخانه (گاه‌شمار) استفاده می‌شود
          </p>
        </div>
      </header>

      {error && <div className="shirazeh-atypes__alert">{error}</div>}

      {canManage && (
      <form className="shirazeh-atypes__create" onSubmit={handleCreate}>
        <input
          type="text"
          className="shirazeh-atypes__input"
          placeholder="عنوان فارسی نوع جدید (مثلاً: صورت‌جلسه)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <input
          type="text"
          className="shirazeh-atypes__input shirazeh-atypes__input--key"
          placeholder="کلید انگلیسی (اختیاری)"
          dir="ltr"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <button
          type="submit"
          className="shirazeh-atypes__btn shirazeh-atypes__btn--primary"
          disabled={busyKey === '__create__'}
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          افزودن نوع
        </button>
      </form>
      )}
      {formError && <div className="shirazeh-atypes__form-error">{formError}</div>}

      <table className="jarian-table shirazeh-atypes__table">
        <thead>
          <tr>
            <th>ردیف</th>
            <th>کلید</th>
            <th>عنوان فارسی</th>
            <th>وضعیت</th>
            {canManage && <th>ترتیب</th>}
            {canManage && <th>عملیات</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, index) => (
            <tr key={item.key} className={!item.isActive ? 'shirazeh-atypes__row--inactive' : ''}>
              <td>{(index + 1).toLocaleString('fa-IR')}</td>
              <td dir="ltr" className="shirazeh-atypes__key">{item.key}</td>
              <td>
                {canManage && editingKey === item.key ? (
                  <div className="shirazeh-atypes__edit-row">
                    <input
                      type="text"
                      className="shirazeh-atypes__input"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      autoFocus
                    />
                    <button type="button" className="shirazeh-atypes__icon-btn" onClick={() => saveEdit(item)} aria-label="ذخیره">
                      <Check size={15} strokeWidth={2} />
                    </button>
                    <button type="button" className="shirazeh-atypes__icon-btn" onClick={cancelEdit} aria-label="انصراف">
                      <X size={15} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <span>{item.labelFa}</span>
                )}
              </td>
              <td>
                <span className={`shirazeh-atypes__badge ${item.isActive ? 'shirazeh-atypes__badge--active' : 'shirazeh-atypes__badge--inactive'}`}>
                  {item.isActive ? 'فعال' : 'غیرفعال'}
                </span>
              </td>
              {canManage && (
              <td>
                <div className="shirazeh-atypes__order-controls">
                  <button type="button" className="shirazeh-atypes__icon-btn" disabled={index === 0 || busyKey} onClick={() => move(item, -1)} aria-label="بالا">
                    <ArrowUp size={14} strokeWidth={2} />
                  </button>
                  <button type="button" className="shirazeh-atypes__icon-btn" disabled={index === sorted.length - 1 || busyKey} onClick={() => move(item, 1)} aria-label="پایین">
                    <ArrowDown size={14} strokeWidth={2} />
                  </button>
                </div>
              </td>
              )}
              {canManage && (
              <td>
                <div className="shirazeh-atypes__actions">
                  {editingKey !== item.key && (
                    <button type="button" className="shirazeh-atypes__icon-btn" onClick={() => startEdit(item)} aria-label="ویرایش نام">
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="shirazeh-atypes__icon-btn"
                    disabled={busyKey === item.key}
                    onClick={() => handleToggleActive(item)}
                    aria-label={item.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                  >
                    <Power size={14} strokeWidth={2} />
                  </button>
                </div>
              </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
