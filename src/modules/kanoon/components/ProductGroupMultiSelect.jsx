import { SUPPLIER_PRODUCT_GROUPS } from '../config';

const GROUP_KEYS = Object.keys(SUPPLIER_PRODUCT_GROUPS);

function Field({ label, required, children }) {
  return (
    <label className="kanoon-form__field">
      <span className="kanoon-form__label">
        {label}
        {required && <span className="kanoon-form__required">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function ProductGroupMultiSelect({ value = [], onChange, required = false }) {
  const items = value.length > 0 ? value : [{ group: GROUP_KEYS[0], subgroup: SUPPLIER_PRODUCT_GROUPS[GROUP_KEYS[0]][0] }];

  const updateItem = (index, patch) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const addItem = () => {
    onChange([
      ...items,
      { group: GROUP_KEYS[0], subgroup: SUPPLIER_PRODUCT_GROUPS[GROUP_KEYS[0]][0] },
    ]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="product-groups">
      {items.map((item, index) => {
        const subgroups = SUPPLIER_PRODUCT_GROUPS[item.group] || [];
        return (
          <div key={index} className="product-groups__row">
            <Field label={index === 0 ? 'گروه کالا' : 'گروه کالا'} required={required && index === 0}>
              <select
                value={item.group}
                onChange={(e) => {
                  const group = e.target.value;
                  updateItem(index, { group, subgroup: SUPPLIER_PRODUCT_GROUPS[group][0] });
                }}
                required={required && index === 0}
              >
                {GROUP_KEYS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label={index === 0 ? 'زیرگروه کالا' : 'زیرگروه کالا'} required={required && index === 0}>
              <select
                value={item.subgroup}
                onChange={(e) => updateItem(index, { subgroup: e.target.value })}
                required={required && index === 0}
              >
                {subgroups.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            {items.length > 1 && (
              <button
                type="button"
                className="btn btn--ghost product-groups__remove"
                onClick={() => removeItem(index)}
                aria-label="حذف گروه کالا"
              >
                حذف
              </button>
            )}
          </div>
        );
      })}
      <button type="button" className="btn btn--outline product-groups__add" onClick={addItem}>
        + افزودن گروه کالا
      </button>
    </div>
  );
}

export function formatProductGroups(groups) {
  if (!groups?.length) return '—';
  return groups.map((p) => `${p.group} / ${p.subgroup}`).join(' · ');
}
