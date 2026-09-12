import { Activity, ChevronDown, Search } from 'lucide-react';
import { usePermissionsStore } from '../store/permissionsStore';
import { groupPermissionCatalog } from './rolePermissionDraft';
import PermissionsActionBar from './PermissionsActionBar';
import './permissions.css';

function GlassToggle({ checked, onChange, id }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      className={[
        'perm-toggle',
        checked ? 'perm-toggle--on' : 'perm-toggle--off',
      ].filter(Boolean).join(' ')}
      onClick={onChange}
    >
      <span className="perm-toggle__knob" aria-hidden="true" />
    </button>
  );
}

function ActionRow({ permission }) {
  const enabled = usePermissionsStore((s) => s.isEnabled(permission.code));
  const togglePermission = usePermissionsStore((s) => s.togglePermission);
  const isPending = usePermissionsStore((s) =>
    Object.prototype.hasOwnProperty.call(s.pendingChanges, permission.code));

  return (
    <div
      className={[
        'perm-action-row',
        isPending ? 'perm-action-row--pending' : '',
        permission.isSensitive ? 'perm-action-row--sensitive' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="perm-action-row__label-wrap">
        <div>
          <p className="perm-action-row__label font-meem">{permission.labelFa}</p>
          <p className="perm-action-row__type font-yekan">
            {permission.code}
            {permission.action ? ` · ${permission.action}` : ''}
          </p>
        </div>
        {permission.isSensitive ? (
          <span className="perm-sensitive-badge font-meem">دسترسی حساس</span>
        ) : null}
      </div>

      <div className="perm-action-row__controls">
        <GlassToggle
          id={`perm-toggle-${permission.code.replace(/[^a-z0-9-]/gi, '-')}`}
          checked={enabled}
          onChange={() => togglePermission(permission.code)}
        />
      </div>
    </div>
  );
}

function ModuleCard({ group }) {
  const expandedModuleId = usePermissionsStore((s) => s.expandedModuleId);
  const toggleModule = usePermissionsStore((s) => s.toggleModule);
  const expanded = expandedModuleId === group.resourceId;

  return (
    <div className={`perm-module${expanded ? ' perm-module--expanded' : ''}`}>
      <button
        type="button"
        className="perm-module__hit"
        aria-expanded={expanded}
        onClick={() => toggleModule(group.resourceId)}
      >
        <span className="perm-module__icon" aria-hidden="true">
          <Activity size={18} strokeWidth={1.75} />
        </span>
        <span className="perm-module__copy">
          <span className="perm-module__name font-meem">{group.resourceName}</span>
          <span className="perm-module__meta font-yekan">
            {group.permissions.length.toLocaleString('fa-IR')}
            {' '}
            دسترسی
          </span>
        </span>
        <ChevronDown
          className={`perm-module__chevron${expanded ? ' perm-module__chevron--open' : ''}`}
          size={16}
          strokeWidth={1.75}
        />
      </button>

      <div
        className={`perm-module__panel${expanded ? ' perm-module__panel--open' : ''}`}
        aria-hidden={!expanded}
      >
        <div className="perm-module__panel-inner">
          <section className="perm-resource">
            <div className="perm-resource__actions">
              {group.permissions.map((permission) => (
                <ActionRow key={permission.code} permission={permission} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function CategorySection({ group }) {
  return (
    <section className="perm-category" aria-label={group.category}>
      <h3 className="perm-category__title font-meem">{group.category}</h3>
      <div className="perm-category__resources">
        {group.resources.map((resource) => (
          <ModuleCard key={resource.resourceId} group={resource} />
        ))}
      </div>
    </section>
  );
}

/**
 * Permission matrix bound to Backend structured catalog + role_permissions.
 */
export default function PermissionMatrix() {
  const catalog = usePermissionsStore((s) => s.catalog);
  const permissionQuery = usePermissionsStore((s) => s.permissionQuery);
  const setPermissionQuery = usePermissionsStore((s) => s.setPermissionQuery);
  const groups = groupPermissionCatalog(catalog, permissionQuery);

  return (
    <div className="perm-matrix" dir="rtl">
      <header className="perm-matrix__header">
        <div>
          <h2 className="perm-matrix__title font-meem">ماتریس دسترسی‌ها</h2>
          <p className="perm-matrix__subtitle font-meem">
            دسترسی نقش انتخاب‌شده از سامانه خوانده می‌شود و با تأیید صریح ذخیره می‌گردد
          </p>
        </div>
        <label className="perm-search">
          <span className="perm-search__icon" aria-hidden="true">
            <Search size={16} strokeWidth={1.75} />
          </span>
          <input
            type="search"
            className="perm-search__input font-meem"
            placeholder="جستجوی دسترسی، دسته یا کد"
            value={permissionQuery}
            onChange={(event) => setPermissionQuery(event.target.value)}
            aria-label="جستجوی دسترسی"
          />
        </label>
      </header>

      <div className="perm-matrix__modules">
        {groups.length === 0 ? (
          <p className="perm-matrix__empty font-meem">دسترسی‌ای با این جستجو یافت نشد.</p>
        ) : (
          groups.map((group) => (
            <CategorySection key={group.category} group={group} />
          ))
        )}
      </div>

      <PermissionsActionBar />
    </div>
  );
}
