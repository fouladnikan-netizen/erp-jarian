import { ORDER_TABS, ORDER_TAB_META, VIEW_MODES } from '../config';
import ListFilterBar from '../../../components/module/ListFilterBar';

const TAB_ORDER = [ORDER_TABS.CURRENT, ORDER_TABS.SUCCESS, ORDER_TABS.FAILED];

/**
 * Nabz Row 3 — status tabs + list/kanban view controls.
 */
export default function NabzToolbar({
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
}) {
  const showViewToggle = activeTab !== ORDER_TABS.FAILED;
  const isList = viewMode === VIEW_MODES.LIST;

  return (
    <ListFilterBar className="nabz-toolbar" ariaLabel="وضعیت و نمایش سفارشات">
      <div className="nabz-tabs" role="tablist" aria-label="وضعیت سفارشات">
        {TAB_ORDER.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`nabz-tabs__btn font-meem${activeTab === tab ? ' is-active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            {ORDER_TAB_META[tab].label}
          </button>
        ))}
      </div>

      <span className="list-filter-bar__spacer" aria-hidden="true" />

      <div className="nabz-toolbar__controls">
        {showViewToggle && (
          <div
            className={`nabz-segment${isList ? ' nabz-segment--list' : ' nabz-segment--kanban'}`}
            role="group"
            aria-label="حالت نمایش"
          >
            <span className="nabz-segment__pill" aria-hidden="true" />
            <button
              type="button"
              className={`nabz-segment__btn font-meem${isList ? ' is-active' : ''}`}
              aria-pressed={isList}
              onClick={() => onViewModeChange(VIEW_MODES.LIST)}
            >
              لیستی
            </button>
            <button
              type="button"
              className={`nabz-segment__btn font-meem${!isList ? ' is-active' : ''}`}
              aria-pressed={!isList}
              onClick={() => onViewModeChange(VIEW_MODES.KANBAN)}
            >
              کارتی
            </button>
          </div>
        )}
      </div>
    </ListFilterBar>
  );
}
