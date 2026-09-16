import { ORDER_TABS, ORDER_TAB_META, VIEW_MODES } from '../config';
import ListFilterBar from '../../../components/module/ListFilterBar';

const DEFAULT_TABS = [
  { id: ORDER_TABS.CURRENT, label: ORDER_TAB_META[ORDER_TABS.CURRENT].label },
  { id: ORDER_TABS.SUCCESS, label: ORDER_TAB_META[ORDER_TABS.SUCCESS].label },
  { id: ORDER_TABS.FAILED, label: ORDER_TAB_META[ORDER_TABS.FAILED].label },
  { id: ORDER_TABS.CLOSED, label: ORDER_TAB_META[ORDER_TABS.CLOSED].label },
];

/**
 * Nabz Row 3 — status tabs + list/kanban view controls.
 */
export default function NabzToolbar({
  tabs = DEFAULT_TABS,
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  showViewToggle,
}) {
  const toggleVisible = showViewToggle ?? (
    activeTab !== ORDER_TABS.FAILED && activeTab !== ORDER_TABS.CLOSED
  );
  const isList = viewMode === VIEW_MODES.LIST;

  return (
    <ListFilterBar className="nabz-toolbar" ariaLabel="وضعیت و نمایش سفارشات">
      {tabs.length > 0 && (
        <div className="nabz-tabs" role="tablist" aria-label="وضعیت سفارشات">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`nabz-tabs__btn font-meem${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <span className="list-filter-bar__spacer" aria-hidden="true" />

      <div className="nabz-toolbar__controls">
        {toggleVisible && (
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
