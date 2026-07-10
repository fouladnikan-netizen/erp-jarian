import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTION_STANDARDS } from '../config';
import { relatedSuppliersByGroup } from '../catalogData';

const ORDER_STAGE_TAG = {
  مظنه: 'active',
  'پیش‌کش': 'pending',
  تحقق: 'success',
  کاوش: 'trial',
  عملیات: 'active',
};

function buildTabs() {
  return [
    { id: 'specs', label: 'مشخصات فنی' },
    { id: 'usage', label: 'در کجا استفاده شده' },
    { id: 'suppliers', label: 'تامین‌کنندگان مرتبط' },
  ];
}

export default function ProductProfileDrawer({ product, groups, onClose, onUpdateProduct }) {
  const tabs = useMemo(() => buildTabs(), []);
  const [activeTab, setActiveTab] = useState('specs');
  const group = groups.find((g) => g.id === product.groupId);
  const subgroup = group?.subgroups.find((s) => s.id === product.subgroupId);
  const specs = product.specs || {};
  const suppliers = relatedSuppliersByGroup[group?.name] || [];

  useEffect(() => {
    setActiveTab('specs');
  }, [product.id]);

  const update = (patch) => onUpdateProduct(product.id, patch);
  const updateSpecs = (key, value) => update({ specs: { ...specs, [key]: value } });

  const toggleStandard = (std) => {
    const current = specs.standards || [];
    const next = current.includes(std)
      ? current.filter((s) => s !== std)
      : [...current, std];
    updateSpecs('standards', next);
  };

  return (
    <div className="vitrin-drawer-overlay" onClick={onClose} role="presentation">
      <aside
        className="vitrin-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`پروفایل ${product.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="vitrin-drawer__header">
          <div>
            <h2 className="vitrin-drawer__title">{product.title}</h2>
            <p className="vitrin-drawer__subtitle">
              کد {product.code}
              {' · '}
              {group?.name}
              {subgroup ? ` / ${subgroup.name}` : ''}
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="vitrin-drawer__tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`vitrin-drawer__tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="vitrin-drawer__body">
          {activeTab === 'specs' && (
            <div className="vitrin-profile-panel">
              <label className="vitrin-form__field">
                <span className="vitrin-form__label">سایز / ابعاد</span>
                <input
                  type="text"
                  className="vitrin-profile-panel__edit"
                  value={specs.size || ''}
                  onChange={(e) => updateSpecs('size', e.target.value)}
                />
              </label>
              <label className="vitrin-form__field">
                <span className="vitrin-form__label">ضخامت</span>
                <input
                  type="text"
                  className="vitrin-profile-panel__edit"
                  value={specs.thickness || ''}
                  onChange={(e) => updateSpecs('thickness', e.target.value)}
                />
              </label>
              <label className="vitrin-form__field">
                <span className="vitrin-form__label">وزن استاندارد هر واحد</span>
                <input
                  type="text"
                  className="vitrin-profile-panel__edit"
                  value={specs.unitWeight || ''}
                  onChange={(e) => updateSpecs('unitWeight', e.target.value)}
                />
              </label>
              <div className="vitrin-form__field">
                <span className="vitrin-form__label">استانداردهای تولید</span>
                <div className="vitrin-standards">
                  {PRODUCTION_STANDARDS.map((std) => (
                    <button
                      key={std}
                      type="button"
                      className={`vitrin-chip vitrin-chip--std${(specs.standards || []).includes(std) ? ' is-active' : ''}`}
                      onClick={() => toggleStandard(std)}
                    >
                      {std}
                    </button>
                  ))}
                </div>
              </div>
              {product.description && (
                <p className="vitrin-profile-panel__notes">{product.description}</p>
              )}
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="vitrin-profile-panel">
              {(product.relatedOrders || []).length ? (
                <div className="vitrin-usage-cards">
                  {product.relatedOrders.map((order) => {
                    const stageTag = ORDER_STAGE_TAG[order.stage] || 'pending';
                    return (
                      <Link
                        key={order.id}
                        to={`/nabz?order=${encodeURIComponent(order.id)}`}
                        className="vitrin-usage-card"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="vitrin-usage-card__id">{order.id}</span>
                        <span className="vitrin-usage-card__customer">{order.customer}</span>
                        <span className={`tag tag--${stageTag}`}>{order.stage}</span>
                        <span className="vitrin-usage-card__date">{order.registeredAt}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="vitrin-profile-panel__empty">این محصول هنوز در سفارشی استفاده نشده است.</p>
              )}
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="vitrin-profile-panel">
              {suppliers.length ? (
                <ul className="vitrin-supplier-list">
                  {suppliers.map((s) => (
                    <li key={s.name} className="vitrin-supplier-list__item">
                      <span className="vitrin-supplier-list__name">{s.name}</span>
                      <span className="vitrin-supplier-list__meta">{s.type}</span>
                      <span className="vitrin-supplier-list__assignee">کاشف: {s.assignee}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="vitrin-profile-panel__empty">
                  تامین‌کننده‌ای با این گروه کالا در کانون ثبت نشده است.
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
