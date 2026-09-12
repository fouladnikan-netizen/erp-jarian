import { useEffect, useMemo, useRef } from 'react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import {
  ListColumnHeader,
  ListChrome,
  ListSelectionBar,
  InfiniteSentinelRow,
} from '../../../components/common/list';
import StatusTag from '../../../components/module/StatusTag';
import { useColumnExcelFilters } from '../../../hooks/useColumnExcelFilters';
import { useListShell } from '../../../hooks/list';
import VitrinRowActions from './VitrinRowActions';
import { formatProductSizeDisplay, getProductSizeNumber } from '../productSize';

const COLUMN_LABELS = {
  check: 'انتخاب',
  row: 'ردیف',
  name: 'شرح کالا',
  size: 'سایز',
  group: 'گروه کالا',
  category: 'دسته کالا',
  productType: 'نوع کالا',
  brand: 'برند',
  status: 'وضعیت',
  actions: 'عملیات',
};

const VITRIN_COLUMN_DEFS = [
  { key: 'check', title: COLUMN_LABELS.check, defaultWidth: 52, resizable: false, locked: true, sortable: false, filterable: false },
  { key: 'row', title: COLUMN_LABELS.row, defaultWidth: 56, resizable: false, locked: true, sortable: false, filterable: false },
  { key: 'name', title: COLUMN_LABELS.name, defaultWidth: 280, locked: true, filterable: true },
  { key: 'size', title: COLUMN_LABELS.size, defaultWidth: 88, filterable: true, numeric: true },
  { key: 'group', title: COLUMN_LABELS.group, defaultWidth: 110, filterable: true },
  { key: 'category', title: COLUMN_LABELS.category, defaultWidth: 110, filterable: true },
  { key: 'productType', title: COLUMN_LABELS.productType, defaultWidth: 120, filterable: true },
  { key: 'brand', title: COLUMN_LABELS.brand, defaultWidth: 120, filterable: true },
  { key: 'status', title: COLUMN_LABELS.status, defaultWidth: 100, filterable: true },
  { key: 'actions', title: COLUMN_LABELS.actions, defaultWidth: 110, resizable: false, locked: true, sortable: false, filterable: false },
];

const FILTERABLE_KEYS = VITRIN_COLUMN_DEFS.filter((c) => c.filterable !== false).map((c) => c.key);

function getRawValue(product, key) {
  switch (key) {
    case 'name':
      return product.displayNameOverride || product.generatedName || '';
    case 'size':
      return formatProductSizeDisplay(product);
    case 'group':
      return product.groupName || '—';
    case 'category':
      return product.categoryName || '—';
    case 'productType':
      return product.productTypeName || '—';
    case 'brand':
      return product.brandName || '—';
    case 'status':
      return product.lifecycleStatus === 'INACTIVE' ? 'غیرفعال' : 'فعال';
    default:
      return '';
  }
}

export default function VitrinTable({
  products,
  listTitle,
  emptyHint,
  selectedIds,
  onSelectionChange,
  onTitleClick,
  onToggleActive,
  onDelete,
}) {
  const {
    columnFilters,
    openFilterKey,
    setOpenFilterKey,
    applyFilter,
    clearFilters,
    filterRows,
    buildOptions,
  } = useColumnExcelFilters();

  const getValue = (row, key) => getRawValue(row, key);

  const filterOptions = useMemo(
    () => buildOptions(products, FILTERABLE_KEYS, getValue),
    [products, buildOptions],
  );

  const filteredProducts = useMemo(
    () => filterRows(products, getValue),
    [products, filterRows],
  );

  const sortAccessors = useMemo(() => {
    const map = {};
    FILTERABLE_KEYS.forEach((key) => { map[key] = (row) => getRawValue(row, key); });
    map.size = (row) => getProductSizeNumber(row);
    return map;
  }, []);

  const sortTypes = useMemo(() => ({ size: 'number' }), []);
  const defaultSorts = useMemo(() => [{ key: 'size', dir: 'asc' }], []);

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const shell = useListShell({
    listKey: 'vitrin.products.table',
    columnDefinitions: VITRIN_COLUMN_DEFS,
    rows: filteredProducts,
    sortAccessors,
    sortTypes,
    defaultSorts,
    scrollRef,
    sentinelRef,
  });

  const filtersHydrated = useRef(false);
  useEffect(() => {
    if (!shell.ready || filtersHydrated.current) return;
    filtersHydrated.current = true;
    Object.entries(shell.savedFilters || {}).forEach(([key, value]) => applyFilter(key, value));
  }, [shell.ready, shell.savedFilters, applyFilter]);

  const handleApplyFilter = (key, value) => {
    applyFilter(key, value);
    const next = { ...columnFilters };
    if (!value) delete next[key];
    else next[key] = value;
    shell.setFilters(next);
  };

  const visibleColumns = shell.visibleColumns;
  const pageRows = shell.visibleRows;
  const colSpan = visibleColumns.length;

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleSelectAll = () => {
    if (pageRows.length > 0 && pageRows.every((p) => selectedIds.has(p.id))) {
      const next = new Set(selectedIds);
      pageRows.forEach((p) => next.delete(p.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      pageRows.forEach((p) => next.add(p.id));
      onSelectionChange(next);
    }
  };

  const pageAllSelected = pageRows.length > 0 && pageRows.every((p) => selectedIds.has(p.id));

  return (
    <section className="section-data vitrin-table-section" aria-label="فهرست کالاهای مرجع">
      <div className="data-table-header">
        <span className="data-table-header__title">{listTitle}</span>
        <div className="data-table-header__tools">
          <ListChrome
            columns={shell.columns}
            setColumnVisible={shell.setColumnVisible}
            reorderColumns={shell.reorderColumns}
            resetColumns={shell.resetColumns}
            onResetPreferences={async () => {
              await shell.resetPreferences();
              clearFilters();
            }}
          />
        </div>
      </div>
      <ListSelectionBar
        selectedCount={selectedIds.size}
        totalCount={shell.sortedRows.length}
        onClear={() => onSelectionChange(new Set())}
      />
      <div className="data-table-wrap vitrin-table-wrap jarian-list-scroll" ref={scrollRef}>
        <table className="data-table vitrin-table jarian-table data-table--resizable">
          <ResizableColGroup columns={visibleColumns} widths={shell.widths} />
          <thead className="vitrin-table__head">
            <tr>
              {visibleColumns.map((col) => (
                <ResizableTh
                  key={col.key}
                  columnKey={col.key}
                  resizable={col.resizable !== false}
                  onResizeStart={shell.startResize}
                  className={`vitrin-table__sticky-th font-meem${
                    col.key === 'check' ? ' vitrin-table__check-col' : ''
                  }${col.key === 'actions' ? ' vitrin-table__actions-col' : ''}`}
                >
                  {col.key === 'check' ? (
                    <input
                      type="checkbox"
                      aria-label="انتخاب همه"
                      checked={pageAllSelected}
                      onChange={toggleSelectAll}
                    />
                  ) : col.key === 'row' || col.key === 'actions' ? (
                    col.title
                  ) : (
                    <ListColumnHeader
                      label={col.title}
                      columnKey={col.key}
                      sorts={shell.sorts}
                      onToggleSort={shell.toggleSort}
                      sortable={col.sortable !== false}
                      filterable={col.filterable !== false}
                      filterOptions={filterOptions[col.key] || []}
                      filterSelected={columnFilters[col.key] || null}
                      openFilterKey={openFilterKey}
                      setOpenFilterKey={setOpenFilterKey}
                      numeric={Boolean(col.numeric)}
                      onApplyFilter={(value) => handleApplyFilter(col.key, value)}
                    />
                  )}
                </ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>
                  <div className="empty-state">
                    <p className="font-meem">{emptyHint || 'کالایی در این نما یافت نشد.'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((product, index) => (
                <tr
                  key={product.id}
                  className={`vitrin-table__row${product.lifecycleStatus === 'INACTIVE' ? ' is-inactive' : ''}`}
                >
                  {visibleColumns.map((col) => {
                    if (col.key === 'check') {
                      return (
                        <td key={col.key} className="vitrin-table__check-col">
                          <input
                            type="checkbox"
                            aria-label={`انتخاب ${product.generatedName}`}
                            checked={selectedIds.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                          />
                        </td>
                      );
                    }
                    if (col.key === 'row') {
                      return <td key={col.key} className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>;
                    }
                    if (col.key === 'name') {
                      return (
                        <td key={col.key}>
                          <button type="button" className="vitrin-table__title-link font-meem" onClick={() => onTitleClick(product)}>
                            {product.displayNameOverride || product.generatedName}
                          </button>
                        </td>
                      );
                    }
                    if (col.key === 'size') {
                      return <td key={col.key} className="font-vazir">{formatProductSizeDisplay(product)}</td>;
                    }
                    if (col.key === 'group') return <td key={col.key} className="font-meem">{product.groupName || '—'}</td>;
                    if (col.key === 'category') return <td key={col.key} className="font-meem">{product.categoryName || '—'}</td>;
                    if (col.key === 'productType') return <td key={col.key} className="font-meem">{product.productTypeName || '—'}</td>;
                    if (col.key === 'brand') return <td key={col.key} className="font-meem">{product.brandName || '—'}</td>;
                    if (col.key === 'status') {
                      return (
                        <td key={col.key}>
                          <StatusTag value={product.lifecycleStatus !== 'INACTIVE' ? 'tag:active:فعال' : 'tag:danger:غیرفعال'} />
                        </td>
                      );
                    }
                    if (col.key === 'actions') {
                      return (
                        <td key={col.key} className="vitrin-table__actions-col">
                          <VitrinRowActions product={product} onToggleActive={onToggleActive} onDelete={onDelete} />
                        </td>
                      );
                    }
                    return <td key={col.key}>—</td>;
                  })}
                </tr>
              ))
            )}
            <InfiniteSentinelRow
              show={shell.showInfiniteSentinel}
              sentinelRef={sentinelRef}
              colSpan={colSpan}
              hasMore={shell.infinite?.hasMore}
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}
