/**
 * Accessible tablist for profile sections.
 * Visual classes are injected by the caller so existing CSS keeps working.
 *
 * @param {{ id: string, label: string, icon?: import('react').ReactNode }[]} tabs
 * @param {string} activeId
 * @param {(id: string) => void} onChange
 * @param {string | ((tab: object, active: boolean) => string)} tabClassName
 */
export default function ProfileTabs({
  className,
  tabClassName,
  ariaLabel = 'بخش‌های پروفایل',
  tabs = [],
  activeId,
  onChange,
  ...rest
}) {
  const resolveTabClass = (tab, active) => {
    if (typeof tabClassName === 'function') return tabClassName(tab, active);
    if (typeof tabClassName === 'string') {
      return active ? `${tabClassName} is-active` : tabClassName;
    }
    return undefined;
  };

  return (
    <div className={className} role="tablist" aria-label={ariaLabel} {...rest}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={resolveTabClass(tab, active)}
            onClick={() => onChange?.(tab.id)}
          >
            {tab.icon ? (
              <span className="profile-tabs__icon" aria-hidden="true">
                {tab.icon}
              </span>
            ) : null}
            <span className="profile-tabs__label font-meem">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
