import { useEffect, useState } from 'react';
import { Plus, Link2 } from 'lucide-react';
import { useAttributeDefinitionsStore } from '../../../stores/useAttributeDefinitionsStore';
import { useProductTaxonomyStore } from '../../../stores/useProductTaxonomyStore';

const DATA_TYPES = ['STRING', 'DECIMAL', 'INTEGER', 'BOOLEAN', 'ENUM', 'DATE', 'REFERENCE'];
const ATTRIBUTE_ROLES = [
  { value: 'MASTER_ONLY', label: 'فقط مرجع (شناسایی‌کننده محصول)' },
  { value: 'TRANSACTION_OVERRIDE_ALLOWED', label: 'مرجع با امکان تغییر در تراکنش' },
  { value: 'TRANSACTION_ONLY', label: 'فقط تراکنشی (هرگز روی محصول مرجع)' },
];

/**
 * Attribute Definitions (centralized, reusable — Shirazeh) + Product Type
 * schema binding (DDL-24c). Selecting a Product Type in the Taxonomy tab
 * feeds `selectedTypeId` here so the schema panel shows its effective,
 * inherited Attribute Schema.
 */
export default function AttributesTab({ canManage, selectedTypeId }) {
  const definitions = useAttributeDefinitionsStore((s) => s.definitions);
  const schemaByType = useAttributeDefinitionsStore((s) => s.schemaByType);
  const fetchAll = useAttributeDefinitionsStore((s) => s.fetchAll);
  const fetchSchemaForType = useAttributeDefinitionsStore((s) => s.fetchSchemaForType);
  const createDefinition = useAttributeDefinitionsStore((s) => s.createDefinition);
  const bindAttribute = useAttributeDefinitionsStore((s) => s.bindAttribute);
  const types = useProductTaxonomyStore((s) => s.types);

  const [code, setCode] = useState('');
  const [nameFa, setNameFa] = useState('');
  const [dataType, setDataType] = useState('DECIMAL');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [bindDefId, setBindDefId] = useState('');
  const [bindRole, setBindRole] = useState('MASTER_ONLY');
  const [bindRequired, setBindRequired] = useState(true);
  const [bindIdentity, setBindIdentity] = useState(true);
  const [bindDisplay, setBindDisplay] = useState(true);
  const [bindError, setBindError] = useState('');

  useEffect(() => { void fetchAll(); }, [fetchAll]);
  useEffect(() => { if (selectedTypeId) void fetchSchemaForType(selectedTypeId); }, [selectedTypeId, fetchSchemaForType]);

  const selectedType = types.find((t) => t.id === selectedTypeId);
  const schema = schemaByType[selectedTypeId] || [];

  async function handleCreateDefinition(e) {
    e.preventDefault();
    setFormError('');
    if (!code.trim() || !nameFa.trim()) return;
    setBusy(true);
    try {
      await createDefinition({ code: code.trim(), nameFa: nameFa.trim(), dataType });
      setCode('');
      setNameFa('');
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'ثبت تعریف ویژگی ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  async function handleBind(e) {
    e.preventDefault();
    setBindError('');
    if (!bindDefId || !selectedTypeId) return;
    if (bindRole === 'TRANSACTION_ONLY' && bindIdentity) {
      setBindError('ویژگی فقط‌تراکنشی نمی‌تواند شناسایی‌کننده محصول باشد.');
      return;
    }
    setBusy(true);
    try {
      await bindAttribute({
        productTypeId: selectedTypeId, attributeDefinitionId: bindDefId,
        attributeRole: bindRole, isRequired: bindRequired, isIdentityRelevant: bindIdentity, isDisplayRelevant: bindDisplay,
      });
      setBindDefId('');
    } catch (err) {
      setBindError(err?.response?.data?.message || err?.message || 'اتصال ویژگی به نوع کالا ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  const boundDefIds = new Set(schema.map((e) => e.definition.id));
  const unboundDefinitions = definitions.filter((d) => !boundDefIds.has(d.id) && d.isActive !== false);

  return (
    <div className="shirazeh-pm__body">
      <div className="shirazeh-pm__col">
        <h3 className="shirazeh-pm__col-title">تعاریف ویژگی (مرکزی و قابل استفاده مجدد)</h3>
        {canManage && (
          <form className="shirazeh-pm__create" onSubmit={handleCreateDefinition} style={{ flexWrap: 'wrap' }}>
            <input className="shirazeh-pm__input" dir="ltr" placeholder="کد لاتین (مثلاً: thickness)" value={code} onChange={(e) => setCode(e.target.value)} />
            <input className="shirazeh-pm__input" placeholder="نام فارسی (مثلاً: ضخامت)" value={nameFa} onChange={(e) => setNameFa(e.target.value)} />
            <select className="shirazeh-pm__select" value={dataType} onChange={(e) => setDataType(e.target.value)}>
              {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
              <Plus size={14} /> افزودن
            </button>
          </form>
        )}
        {formError && <div className="shirazeh-pm__form-error">{formError}</div>}
        <div className="shirazeh-pm__list">
          {definitions.length === 0 && <div className="shirazeh-pm__empty">تعریف ویژگی ثبت نشده است.</div>}
          {definitions.map((d) => (
            <div key={d.id} className={`shirazeh-pm__item ${!d.isActive ? 'shirazeh-pm__item--inactive' : ''}`}>
              <span className="shirazeh-pm__code">{d.dataType}</span>
              <span className="shirazeh-pm__item-name">{d.nameFa} <span style={{ opacity: 0.6 }}>({d.code})</span></span>
            </div>
          ))}
        </div>
      </div>

      <div className="shirazeh-pm__schema-panel">
        <h3 className="shirazeh-pm__col-title">
          شمای ویژگی نوع کالا {selectedType ? `— ${selectedType.name}` : '(از تب طبقه‌بندی، یک نوع کالا انتخاب کنید)'}
        </h3>

        {selectedTypeId && (
          <>
            {canManage && (
              <form className="shirazeh-pm__create" onSubmit={handleBind} style={{ flexWrap: 'wrap' }}>
                <select className="shirazeh-pm__select" value={bindDefId} onChange={(e) => setBindDefId(e.target.value)}>
                  <option value="">— انتخاب ویژگی —</option>
                  {unboundDefinitions.map((d) => <option key={d.id} value={d.id}>{d.nameFa}</option>)}
                </select>
                <select className="shirazeh-pm__select" value={bindRole} onChange={(e) => setBindRole(e.target.value)}>
                  {ATTRIBUTE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={bindRequired} onChange={(e) => setBindRequired(e.target.checked)} /> الزامی
                </label>
                <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={bindIdentity} onChange={(e) => setBindIdentity(e.target.checked)} disabled={bindRole === 'TRANSACTION_ONLY'} /> شناسایی‌کننده هویت
                </label>
                <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={bindDisplay} onChange={(e) => setBindDisplay(e.target.checked)} /> در نام نمایشی
                </label>
                <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy || !bindDefId}>
                  <Link2 size={14} /> اتصال به نوع کالا
                </button>
              </form>
            )}
            {bindError && <div className="shirazeh-pm__form-error">{bindError}</div>}

            <table className="jarian-table shirazeh-pm__table">
              <thead>
                <tr>
                  <th>ردیف</th>
                  <th>ویژگی</th>
                  <th>نوع داده</th>
                  <th>نقش</th>
                  <th>الزامی</th>
                  <th>هویت</th>
                  <th>نمایشی</th>
                </tr>
              </thead>
              <tbody>
                {schema.map(({ binding, definition }, index) => (
                  <tr key={binding.id}>
                    <td>{(index + 1).toLocaleString('fa-IR')}</td>
                    <td>{definition.nameFa}</td>
                    <td className="shirazeh-pm__code">{definition.dataType}</td>
                    <td>{ATTRIBUTE_ROLES.find((r) => r.value === binding.attributeRole)?.label || binding.attributeRole}</td>
                    <td>{binding.isRequired ? 'بله' : 'خیر'}</td>
                    <td>{binding.isIdentityRelevant ? 'بله' : 'خیر'}</td>
                    <td>{binding.isDisplayRelevant ? 'بله' : 'خیر'}</td>
                  </tr>
                ))}
                {schema.length === 0 && (
                  <tr><td colSpan={7} className="shirazeh-pm__empty">هنوز ویژگی‌ای به این نوع کالا متصل نشده است.</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
