import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useUomStore } from '../../../stores/useUomStore';
import { useJarianNotice } from '../../../context/JarianNoticeContext';
import { suggestUomCode } from '../../../domain/productMaster/suggestLatinName';
import { filterByQuery } from '../../../domain/productMaster/structureSearch';
import ProductMasterAlert, { productMasterErrorMessage } from './ProductMasterAlert';
import useSuggestedLatin from './useSuggestedLatin';

/** UOM Registry + conversions (Shirazeh, DDL-24e). Registry-governed — no hardcoded unit enum. */
export default function UomTab({ canManage, showConversions = true, filterQuery = '' }) {
  const uoms = useUomStore((s) => s.uoms);
  const conversions = useUomStore((s) => s.conversions);
  const fetchAll = useUomStore((s) => s.fetchAll);
  const createUom = useUomStore((s) => s.createUom);
  const updateUom = useUomStore((s) => s.updateUom);
  const deleteUom = useUomStore((s) => s.deleteUom);
  const createConversion = useUomStore((s) => s.createConversion);
  const { confirm } = useJarianNotice();

  const [name, setName] = useState('');
  const suggestedCode = useSuggestedLatin(name, suggestUomCode);
  const [busy, setBusy] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCodeLocked, setEditCodeLocked] = useState(false);

  const [fromUomId, setFromUomId] = useState('');
  const [toUomId, setToUomId] = useState('');
  const [numerator, setNumerator] = useState('1');
  const [denominator, setDenominator] = useState('1');
  const [isExact, setIsExact] = useState(false);

  useEffect(() => { void fetchAll({ includeConversions: showConversions }); }, [fetchAll, showConversions]);

  const visibleUoms = filterByQuery(uoms, filterQuery, (item) => [item.nameFa, item.code]);

  async function handleCreateUom(e) {
    e.preventDefault();
    setAlertMessage('');
    if (!suggestedCode.value.trim() || !name.trim()) return;
    setBusy(true);
    try {
      await createUom({ code: suggestedCode.value.trim(), nameFa: name.trim() });
      suggestedCode.reset();
      setName('');
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ثبت واحد اندازه‌گیری ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(uom) {
    setAlertMessage('');
    setEditingId(uom.id);
    setEditName(uom.nameFa || '');
    setEditCode(uom.code || '');
    setEditCodeLocked(Boolean(uom.code));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditCode('');
    setEditCodeLocked(false);
  }

  async function saveEdit(uom) {
    const nextName = editName.trim();
    const nextCode = editCode.trim();
    if (!nextName) {
      setAlertMessage('نام فارسی واحد را وارد کنید.');
      return;
    }
    if (!nextCode) {
      setAlertMessage('کد لاتین واحد را وارد کنید (مثلاً KG).');
      return;
    }
    if (nextName === (uom.nameFa || '') && nextCode.toUpperCase() === (uom.code || '')) {
      cancelEdit();
      return;
    }
    setBusy(true);
    setAlertMessage('');
    try {
      await updateUom(uom.id, { nameFa: nextName, code: nextCode });
      cancelEdit();
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ویرایش واحد اندازه‌گیری ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteUom(uom) {
    const ok = await confirm({
      title: 'حذف',
      entity: uom.nameFa,
      message: 'این واحد اندازه‌گیری حذف شود؟',
      hint: 'اگر در کالا یا ویژگی استفاده شده باشد، حذف انجام نمی‌شود.',
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setAlertMessage('');
    try {
      await deleteUom(uom.id);
      if (editingId === uom.id) cancelEdit();
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'حذف واحد اندازه‌گیری ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateConversion(e) {
    e.preventDefault();
    setAlertMessage('');
    if (!fromUomId || !toUomId) return;
    setBusy(true);
    try {
      await createConversion({
        fromUomId, toUomId, numerator: Number(numerator), denominator: Number(denominator), isExact,
      });
      setFromUomId(''); setToUomId(''); setNumerator('1'); setDenominator('1'); setIsExact(false);
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ثبت ضریب تبدیل ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shirazeh-pm__body">
      <ProductMasterAlert message={alertMessage} onClose={() => setAlertMessage('')} />
      <div className="shirazeh-pm__col">
        <h3 className="shirazeh-pm__col-title">واحدهای اندازه‌گیری</h3>
        {canManage && (
          <form className="shirazeh-pm__create" onSubmit={handleCreateUom}>
            <input className="shirazeh-pm__input" placeholder="نام فارسی (مثلاً: کیلوگرم)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="shirazeh-pm__input" dir="ltr" placeholder="کد لاتین (پیشنهاد)" value={suggestedCode.value} onChange={(e) => suggestedCode.onChange(e.target.value)} />
            <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
              <Plus size={14} /> افزودن
            </button>
          </form>
        )}
        <div className="shirazeh-pm__list">
          {visibleUoms.length === 0 && <div className="shirazeh-pm__empty">واحدی ثبت نشده است.</div>}
          {visibleUoms.map((u) => {
            const isEditing = editingId === u.id;
            return (
              <div key={u.id} className={`shirazeh-pm__item ${!u.isActive ? 'shirazeh-pm__item--inactive' : ''}`}>
                {isEditing ? (
                  <div className="shirazeh-pm__item-edit">
                    <input
                      className="shirazeh-pm__input"
                      value={editName}
                      onChange={(e) => {
                        const next = e.target.value;
                        setEditName(next);
                        if (!editCodeLocked) setEditCode(suggestUomCode(next));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void saveEdit(u);
                        }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      aria-label="نام فارسی"
                    />
                    <input
                      className="shirazeh-pm__input"
                      dir="ltr"
                      value={editCode}
                      onChange={(e) => {
                        const next = e.target.value;
                        setEditCode(next);
                        setEditCodeLocked(next.trim() !== '');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void saveEdit(u);
                        }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      placeholder="کد لاتین"
                      aria-label="کد لاتین"
                    />
                    <button
                      type="button"
                      className="shirazeh-pm__icon-btn"
                      disabled={busy}
                      onClick={() => { void saveEdit(u); }}
                      aria-label="ذخیره"
                      title="ذخیره"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      className="shirazeh-pm__icon-btn"
                      disabled={busy}
                      onClick={cancelEdit}
                      aria-label="انصراف"
                      title="انصراف"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="shirazeh-pm__code">{u.code}</span>
                    <span className="shirazeh-pm__item-name">{u.nameFa}</span>
                  </>
                )}
                {canManage && !isEditing && (
                  <div className="shirazeh-pm__item-actions">
                    <button
                      type="button"
                      className="shirazeh-pm__icon-btn"
                      disabled={busy}
                      onClick={() => startEdit(u)}
                      aria-label="ویرایش واحد"
                      title="ویرایش"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="shirazeh-pm__icon-btn shirazeh-pm__icon-btn--danger"
                      disabled={busy}
                      onClick={() => { void handleDeleteUom(u); }}
                      aria-label="حذف واحد"
                      title="حذف"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showConversions ? (
      <div className="shirazeh-pm__schema-panel">
        <h3 className="shirazeh-pm__col-title">ضرایب تبدیل واحد</h3>
        {canManage && (
          <form className="shirazeh-pm__create" onSubmit={handleCreateConversion} style={{ flexWrap: 'wrap' }}>
            <select className="shirazeh-pm__select" value={fromUomId} onChange={(e) => setFromUomId(e.target.value)}>
              <option value="">— از واحد —</option>
              {uoms.map((u) => <option key={u.id} value={u.id}>{u.nameFa}</option>)}
            </select>
            <select className="shirazeh-pm__select" value={toUomId} onChange={(e) => setToUomId(e.target.value)}>
              <option value="">— به واحد —</option>
              {uoms.map((u) => <option key={u.id} value={u.id}>{u.nameFa}</option>)}
            </select>
            <input className="shirazeh-pm__input" type="number" step="any" placeholder="صورت" value={numerator} onChange={(e) => setNumerator(e.target.value)} style={{ flex: '0 0 90px' }} />
            <input className="shirazeh-pm__input" type="number" step="any" placeholder="مخرج" value={denominator} onChange={(e) => setDenominator(e.target.value)} style={{ flex: '0 0 90px' }} />
            <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={isExact} onChange={(e) => setIsExact(e.target.checked)} /> دقیق (نه تقریبی)
            </label>
            <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy || !fromUomId || !toUomId}>
              <Plus size={14} /> افزودن ضریب
            </button>
          </form>
        )}

        <table className="jarian-table shirazeh-pm__table">
          <thead>
            <tr>
              <th>ردیف</th>
              <th>از واحد</th>
              <th>به واحد</th>
              <th>نسبت</th>
              <th>دقت</th>
            </tr>
          </thead>
          <tbody>
            {conversions.map((c, index) => {
              const from = uoms.find((u) => u.id === c.fromUomId);
              const to = uoms.find((u) => u.id === c.toUomId);
              return (
                <tr key={c.id}>
                  <td>{(index + 1).toLocaleString('fa-IR')}</td>
                  <td>{from?.nameFa || c.fromUomId}</td>
                  <td>{to?.nameFa || c.toUomId}</td>
                  <td className="shirazeh-pm__code">{c.numerator}/{c.denominator}</td>
                  <td>{c.isExact ? 'دقیق' : 'تقریبی'}</td>
                </tr>
              );
            })}
            {conversions.length === 0 && (
              <tr><td colSpan={5} className="shirazeh-pm__empty">ضریب تبدیلی ثبت نشده است.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      ) : null}
    </div>
  );
}
