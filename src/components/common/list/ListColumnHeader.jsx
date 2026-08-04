import MultiSortHeader from './MultiSortHeader';
import ColumnFilterHeader from '../../table/ColumnFilterHeader';
import './list-infra.css';

/**
 * Shared list column header: multi-sort + optional Excel filter.
 * Modules only pass column metadata — no per-module header chrome.
 */
export default function ListColumnHeader({
  label,
  columnKey,
  sorts,
  onToggleSort,
  sortable = true,
  filterable = false,
  filterOptions = [],
  filterSelected = null,
  openFilterKey,
  setOpenFilterKey,
  onApplyFilter,
  numeric = false,
}) {
  const filter = filterable ? (
    <ColumnFilterHeader
      label={label}
      columnKey={columnKey}
      options={filterOptions}
      selected={filterSelected}
      openKey={openFilterKey}
      setOpenKey={setOpenFilterKey}
      numeric={numeric}
      hideLabel
      onApply={onApplyFilter}
    />
  ) : null;

  return (
    <div className="jarian-list-col-header">
      <MultiSortHeader
        label={label}
        columnKey={columnKey}
        sorts={sorts}
        onToggleSort={onToggleSort}
        sortable={sortable}
        trailing={filter}
      />
    </div>
  );
}
