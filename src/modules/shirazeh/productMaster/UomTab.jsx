import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useUomStore } from '../../../stores/useUomStore';

/** UOM Registry + conversions (Shirazeh, DDL-24e). Registry-governed — no hardcoded unit enum. */
export default function UomTab({ canManage }) {
  const uoms = useUomStore((s) => s.uoms);
  const conversions = useUomStore((s) => s.conversions);
  const fetchAll = useUomStore((s) => s.fetchAll);
  const createUom = useUomStore((s) => s.createUom);
  const createConversion = useUomStore((s) => s.createConversion);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [fromUomId, setFromUomId] = useState('');
  const [toUomId, setToUomId] = useState('');
  const [numerator, setNumerator] = useState('1');
  const [denominator, setDenominator] = useState('1');
  const [isExact, setIsExact] = useState(false);
  const [convError, setConvError] = useState('');

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  async function handleCreateUom(e) {
    e.preventDefault();
    setFormError('');
    if (!code.trim() || !name.trim()) return;
    setBusy(true);
    try {
      await createUom({ code: code.trim().toUpperCase(), nameFa: name.trim() });
      setCode(''); setName('');
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'ثبت واحد اندازه‌گیری ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateConversion(e) {
    e.preventDefault();
    setConvError('');
    if (!fromUomId || !toUomId) return;
    setBusy(true);
    try {
      await createConversion({
        fromUomId, toUomId, numerator: Number(numerator), denominator: Number(denominator), isExact,
      });
      setFromUomId(''); setToUomId(''); setNumerator('1'); setDenominator('1'); setIsExact(false);
    } catch (err) {
      setConvError(err?.response?.data?.message || err?.message || 'ثبت ضریب تبدیل ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shirazeh-pm__body">
      <div className="shirazeh-pm__col">
        <h3 className="shirazeh-pm__col-title">واحدهای اندازه‌گیری</h3>
        {canManage && (
          <form className="shirazeh-pm__create" onSubmit={handleCreateUom}>
            <input className="shirazeh-pm__input" dir="ltr" placeholder="کد (مثلاً: KG)" value={code} onChange={(e) => setCode(e.target.value)} />
            <input className="shirazeh-pm__input" placeholder="نام (مثلاً: کیلوگرم)" value={name} onChange={(e) => setName(e.target.value)} />
            <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
              <Plus size={14} /> افزودن
            </button>
          </form>
        )}
        {formError && <div className="shirazeh-pm__form-error">{formError}</div>}
        <div className="shirazeh-pm__list">
          {uoms.length === 0 && <div className="shirazeh-pm__empty">واحدی ثبت نشده است.</div>}
          {uoms.map((u) => (
            <div key={u.id} className={`shirazeh-pm__item ${!u.isActive ? 'shirazeh-pm__item--inactive' : ''}`}>
              <span className="shirazeh-pm__code">{u.code}</span>
              <span className="shirazeh-pm__item-name">{u.nameFa}</span>
            </div>
          ))}
        </div>
      </div>

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
        {convError && <div className="shirazeh-pm__form-error">{convError}</div>}

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
    </div>
  );
}
