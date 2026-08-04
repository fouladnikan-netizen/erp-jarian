import { useEffect, useMemo, useRef } from 'react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import {
  ListColumnHeader,
  ListPagination,
  ListChrome,
  VirtualSpacerRows,
  VirtualSpacerBottom,
  InfiniteSentinelRow,
} from '../../../components/common/list';
import StatusTag from '../../../components/module/StatusTag';
import { useColumnExcelFilters } from '../../../hooks/useColumnExcelFilters';
import { useListShell } from '../../../hooks/list';
import VitrinRowActions from './VitrinRowActions';

const COLUMN_LABELS = {
  check: 'انتخاب',
  row: 'ردیف',
  code: 'کد کالا',
  title: 'شرح محصول',
  group: 'گروه کالا',
  subgroup: 'زیرگروه کالا',
  unit: 'واحد سنجش',
  status: 'وضعیت',
  actions: 'عملیات',
};

const VITRIN_COLUMN_DEFS = [
  { key: 'check', title: COLUMN_LABELS.check, defaultWidth: 48, resizable: false, locked: true, sortable: false, filterable: false },
  { key: 'row', title: COLUMN_LABELS.row, defaultWidth: 56, resizable: false, locked: true, sortable: false, filterable: false },
  { key: 'code', title: COLUMN_LABELS.code, defaultWidth: 110, locked: true, filterable: true, numeric: true },
  { key: 'title', title: COLUMN_LABELS.title, defaultWidth: 200, locked: true, filterable: true },
  { key: 'group', title: COLUMN_LABELS.group, defaultWidth: 120, filterable: true },
  { key: 'subgroup', title: COLUMN_LABELS.subgroup, defaultWidth: 120, filterable: true },
  { key: 'unit', title: COLUMN_LABELS.unit, defaultWidth: 90, filterable: true },
  { key: 'status', title: COLUMN_LABELS.status, defaultWidth: 110, filterable: true },
  { key: 'actions', title: COLUMN_LABELS.actions, defaultWidth: 100, resizable: false, locked: true, sortable: false, filterable: false },
];

const FILTERABLE_KEYS = VITRIN_COLUMN_DEFS.filter((c) => c.filterable !== false).map((c) => c.key);

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
  const {
    columnFilters,
    openFilterKey,
    setOpenFilterKey,
    applyFilter,
    filterRows,
    buildOptions,
  } = useColumnExcelFilters();

  const getValue = (row, key) => getRawValue(row, key, groups);

  const filterOptions = useMemo(
    () => buildOptions(products, FILTERABLE_KEYS, getValue),
    [products, groups, buildOptions],
  );

  const filteredProducts = useMemo(
    () => filterRows(products, getValue),
    [products, groups, filterRows],
  );

  const sortAccessors = useMemo(() => {
    const map = {};
    FILTERABLE_KEYS.forEach((key) => {
      map[key] = (row) => getRawValue(row, key, groups);
    });
    return map;
  }, [groups]);

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const shell = useListShell({
    listKey: 'vitrin.products.table',
    columnDefinitions: VITRIN_COLUMN_DEFS,
    rows: filteredProducts,
    sortAccessors,
    getExportValue: getValue,
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
    <section className="section-data vitrin-table-section" aria-label="فهرست محصولات">
      <div className="data-table-header">
        <span className="data-table-header__title">{listTitle}</span>
        <span className="data-table-header__count">
          {shell.sortedRows.length.toLocaleString('fa-IR')} رکورد
        </span>
        <div className="data-table-header__tools">
          <ListChrome
            columns={shell.columns}
            setColumnVisible={shell.setColumnVisible}
            reorderColumns={shell.reorderColumns}
            resetColumns={shell.resetColumns}
            exportColumns={shell.exportColumns}
            exportRows={shell.exportRows}
            getExportValue={shell.getExportValue}
            filenameBase="vitrin-products"
            sheetName="محصولات"
            viewMode={shell.viewMode}
            setViewMode={shell.setViewMode}
            onResetPreferences={shell.resetPreferences}
          />
        </div>
      </div>
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
            <VirtualSpacerRows virtual={shell.virtual} colSpan={colSpan} />
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>
                  <div className="empty-state">
                    <p className="font-meem">محصولی در این نما یافت نشد.</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((product, index) => (
                <tr
                  key={product.id}
                  className={`vitrin-table__row${product.isActive === false ? ' is-inactive' : ''}`}
                >
                  {visibleColumns.map((col) => {
                    if (col.key === 'check') {
                      return (
                        <td key={col.key} className="vitrin-table__check-col">
                          <input
                            type="checkbox"
                            aria-label={`انتخاب ${product.title}`}
                            checked={selectedIds.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                          />
                        </td>
                      );
                    }
                    if (col.key === 'row') {
                      const rowNo = shell.virtual
                        ? shell.virtual.startIndex + index + 1
                        : (shell.pagination?.rangeStart || 1) + index;
                      return (
                        <td key={col.key} className="font-yekan">
                          {rowNo.toLocaleString('fa-IR')}
                        </td>
                      );
                    }
                    if (col.key === 'code') {
                      return <td key={col.key} className="vitrin-table__code font-yekan">{product.code}</td>;
                    }
                    if (col.key === 'title') {
                      return (
                        <td key={col.key}>
                          <button
                            type="button"
                            className="vitrin-table__title-link font-meem"
                            onClick={() => onTitleClick(product)}
                          >
                            {product.title}
                          </button>
                        </td>
                      );
                    }
                    if (col.key === 'group') {
                      return <td key={col.key} className="font-meem">{getGroupName(groups, product.groupId)}</td>;
                    }
                    if (col.key === 'subgroup') {
                      return (
                        <td key={col.key} className="font-meem">
                          {getSubgroupName(groups, product.groupId, product.subgroupId)}
                        </td>
                      );
                    }
                    if (col.key === 'unit') {
                      return <td key={col.key} className="font-meem">{product.unit}</td>;
                    }
                    if (col.key === 'status') {
                      return (
                        <td key={col.key}>
                          <StatusTag
                            value={product.isActive !== false ? 'tag:active:فعال' : 'tag:danger:غیرفعال'}
                          />
                        </td>
                      );
                    }
                    if (col.key === 'actions') {
                      return (
                        <td key={col.key} className="vitrin-table__actions-col">
                          <VitrinRowActions product={product} onEdit={onEdit} onToggleActive={onToggleActive} />
                        </td>
                      );
                    }
                    return <td key={col.key}>—</td>;
                  })}
                </tr>
              ))
            )}
            <VirtualSpacerBottom virtual={shell.virtual} colSpan={colSpan} />
            <InfiniteSentinelRow
              show={shell.showInfiniteSentinel}
              sentinelRef={sentinelRef}
              colSpan={colSpan}
              hasMore={shell.infinite?.hasMore}
            />
          </tbody>
        </table>
      </div>
      {shell.showPagination && shell.pagination ? (
        <ListPagination {...shell.pagination} />
      ) : null}
    </section>
  );
}
