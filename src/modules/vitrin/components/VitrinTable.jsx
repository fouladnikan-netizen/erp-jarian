import { useMemo } from 'react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import ColumnFilterHeader from '../../../components/table/ColumnFilterHeader';
import StatusTag from '../../../components/module/StatusTag';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import { useColumnExcelFilters } from '../../../hooks/useColumnExcelFilters';
import VitrinRowActions from './VitrinRowActions';

const VITRIN_COLUMNS = [
  { key: 'check', defaultWidth: 48, resizable: false, filterable: false },
  { key: 'row', defaultWidth: 56, resizable: false, filterable: false },
  { key: 'code', defaultWidth: 110, filterable: true, numeric: true },
  { key: 'title', defaultWidth: 200, filterable: true },
  { key: 'group', defaultWidth: 120, filterable: true },
  { key: 'subgroup', defaultWidth: 120, filterable: true },
  { key: 'unit', defaultWidth: 90, filterable: true },
  { key: 'status', defaultWidth: 110, filterable: true },
  { key: 'actions', defaultWidth: 100, resizable: false, filterable: false },
];

const COLUMN_LABELS = {
  check: '',
  row: 'ردیف',
  code: 'کد کالا',
  title: 'شرح محصول',
  group: 'گروه کالا',
  subgroup: 'زیرگروه کالا',
  unit: 'واحد سنجش',
  status: 'وضعیت',
  actions: 'عملیات',
};

const FILTERABLE_KEYS = VITRIN_COLUMNS.filter((c) => c.filterable !== false).map((c) => c.key);

function getGroupName(groups, groupId) {
  return groups.find((g) => g.id === groupId)?.name || '—';
}

function getSubgroupName(groups, groupId, subgroupId) {
  return groups.find((g) => g.id === groupId)?.subgroups.find((s) => s.id === subgroupId)?.name || '—';
}

function getRawValue(product, key, groups) {
  switch (key) {
    case 'code':
      return product.code || '';
    case 'title':
      return product.title || '';
    case 'group':
      return getGroupName(groups, product.groupId);
    case 'subgroup':
      return getSubgroupName(groups, product.groupId, product.subgroupId);
    case 'unit':
      return product.unit || '';
    case 'status':
      return product.isActive !== false ? 'فعال' : 'غیرفعال';
    default:
      return '';
  }
}

export default function VitrinTable({
  products,
  groups,
  listTitle,
  selectedIds,
  onSelectionChange,
  onTitleClick,
  onEdit,
  onToggleActive,
}) {
  const { widths, startResize } = useResizableColumns('vitrin-products', VITRIN_COLUMNS);
  const {
    columnFilters,
    openFilterKey,
    setOpenFilterKey,
    applyFilter,
    filterRows,
    buildOptions,
  } = useColumnExcelFilters();

  const filterOptions = useMemo(
    () => buildOptions(products, FILTERABLE_KEYS, (row, key) => getRawValue(row, key, groups)),
    [products, groups, buildOptions],
  );

  const visibleProducts = useMemo(
    () => filterRows(products, (row, key) => getRawValue(row, key, groups)),
    [products, groups, filterRows],
  );

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleProducts.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(visibleProducts.map((p) => p.id)));
    }
  };

  return (
    <section className="section-data vitrin-table-section" aria-label="فهرست محصولات">
      <div className="data-table-header">
        <span className="data-table-header__title">{listTitle}</span>
        <span className="data-table-header__count">
          {visibleProducts.length.toLocaleString('fa-IR')} رکورد
        </span>
      </div>
      <div className="data-table-wrap vitrin-table-wrap">
        <table className="data-table vitrin-table jarian-table data-table--resizable">
          <ResizableColGroup columns={VITRIN_COLUMNS} widths={widths} />
          <thead className="vitrin-table__head">
            <tr>
              {VITRIN_COLUMNS.map((col) => (
                <ResizableTh
                  key={col.key}
                  columnKey={col.key}
                  resizable={col.resizable !== false}
                  onResizeStart={startResize}
                  className={`vitrin-table__sticky-th font-meem${
                    col.key === 'check' ? ' vitrin-table__check-col' : ''
                  }${col.key === 'actions' ? ' vitrin-table__actions-col' : ''}`}
                >
                  {col.key === 'check' ? (
                    <input
                      type="checkbox"
                      aria-label="انتخاب همه"
                      checked={visibleProducts.length > 0 && selectedIds.size === visibleProducts.length}
                      onChange={toggleSelectAll}
                    />
                  ) : col.filterable !== false ? (
                    <ColumnFilterHeader
                      label={COLUMN_LABELS[col.key]}
                      columnKey={col.key}
                      options={filterOptions[col.key] || []}
                      selected={columnFilters[col.key] || null}
                      openKey={openFilterKey}
                      setOpenKey={setOpenFilterKey}
                      numeric={Boolean(col.numeric)}
                      onApply={(value) => applyFilter(col.key, value)}
                    />
                  ) : (
                    COLUMN_LABELS[col.key]
                  )}
                </ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleProducts.length === 0 ? (
              <tr>
                <td colSpan={VITRIN_COLUMNS.length}>
                  <div className="empty-state">
                    <p className="font-meem">محصولی در این نما یافت نشد.</p>
                  </div>
                </td>
              </tr>
            ) : (
              visibleProducts.map((product, index) => (
                <tr
                  key={product.id}
                  className={`vitrin-table__row${product.isActive === false ? ' is-inactive' : ''}`}
                >
                  <td className="vitrin-table__check-col">
                    <input
                      type="checkbox"
                      aria-label={`انتخاب ${product.title}`}
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                    />
                  </td>
                  <td className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>
                  <td className="vitrin-table__code font-yekan">{product.code}</td>
                  <td>
                    <button
                      type="button"
                      className="vitrin-table__title-link font-meem"
                      onClick={() => onTitleClick(product)}
                    >
                      {product.title}
                    </button>
                  </td>
                  <td className="font-meem">{getGroupName(groups, product.groupId)}</td>
                  <td className="font-meem">{getSubgroupName(groups, product.groupId, product.subgroupId)}</td>
                  <td className="font-meem">{product.unit}</td>
                  <td>
                    <StatusTag
                      value={product.isActive !== false ? 'tag:active:فعال' : 'tag:danger:غیرفعال'}
                    />
                  </td>
                  <td className="vitrin-table__actions-col">
                    <VitrinRowActions product={product} onEdit={onEdit} onToggleActive={onToggleActive} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
