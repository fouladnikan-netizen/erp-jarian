import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { useColumnExcelFilters } from '../../../hooks/useColumnExcelFilters';
import { useListShell } from '../../../hooks/list';
import StatusTag from '../../../components/module/StatusTag';
import { BEHAVIORAL_STATUS, ENTITY_TYPES } from '../config';
import {
  TABLE_COLUMNS,
  getViewKey,
  getCellValue,
  getDisplayName,
  getActivityLink,
  getLatestInteraction,
} from '../columns';
import { filterContacts } from '../kpi';
import RowQuickActions from './RowQuickActions';
import OrderPulseTally from './OrderPulseTally';

function LastActivityCell({ contact }) {
  const label = getCellValue(contact, 'lastActivity');
  const href = getActivityLink(contact);
  if (!label || label === '—' || !href) {
    return <span className="kanoon-table__muted">—</span>;
  }
  const latest = getLatestInteraction(contact);
  return (
    <Link
      to={href}
      className="kanoon-table__activity-link"
      title={latest?.summary || 'مشاهده آخرین پویش'}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </Link>
  );
}

function WarmCell({ col, contact, entityType, onOrderFallback }) {
  if (col.key === 'orderPulse' && entityType === ENTITY_TYPES.CUSTOMER) {
    return <OrderPulseTally contact={contact} onFallbackClick={onOrderFallback} />;
  }
  if (col.key === 'openInquiries' && entityType === ENTITY_TYPES.SUPPLIER) {
    const count = getCellValue(contact, 'openInquiries');
    if (!count) return <span className="kanoon-table__muted">—</span>;
    return (
      <span className="tag tag--pending">
        {count.toLocaleString('fa-IR')} استعلام
      </span>
    );
  }
  if (col.key === 'interactionValue' || col.key === 'supplyVolume') {
    return <span className="kanoon-table__warm-value">{getCellValue(contact, col.key)}</span>;
  }
  if (col.key === 'contactAge') {
    return <span className="kanoon-table__relative-time">{getCellValue(contact, col.key)}</span>;
  }
  if (col.key === 'lastActivity') {
    return <LastActivityCell contact={contact} />;
  }
  return null;
}

export default function KanoonTable({
  contacts,
  entityType,
  personType,
  audienceFilter = null,
  search,
  columnFilters = {},
  selectedIds,
  onSelectionChange,
  onNameClick,
  onQuickActivity,
  onQuickOrder,
  onToggleActive,
  onOrderFallback,
}) {
  const viewKey = getViewKey(entityType, personType);
  const baseColumns = TABLE_COLUMNS[viewKey];
  const nameKey = personType === 'legal' ? 'companyName' : 'personName';
  const warmKeys = new Set([
    'interactionValue', 'orderPulse', 'supplyVolume', 'openInquiries', 'contactAge', 'lastActivity',
  ]);

  const columnDefinitions = useMemo(() => [
    { key: 'check', title: 'انتخاب', defaultWidth: 48, resizable: false, locked: true, sortable: false, filterable: false },
    ...baseColumns.map((col) => ({
      ...col,
      title: col.label,
      defaultWidth: col.width ?? 120,
      locked: col.key === 'row' || col.key === nameKey,
    })),
    { key: 'actions', title: 'عملیات', defaultWidth: 110, resizable: false, locked: true, sortable: false, filterable: false },
  ], [baseColumns, nameKey]);

  const {
    openFilterKey,
    setOpenFilterKey,
    applyFilter,
    filterRows,
    buildOptions,
    columnFilters: excelFilters,
  } = useColumnExcelFilters({ resetKey: viewKey });

  const getExcelRaw = (contact, key) => {
    if (key === 'behavioralStatus') {
      return BEHAVIORAL_STATUS[contact.behavioralStatus]?.label || '';
    }
    const value = getCellValue(contact, key);
    return value == null || value === '' || value === '—' ? '' : String(value);
  };

  const baseFiltered = useMemo(
    () => filterContacts(contacts, {
      entityType,
      personType,
      search,
      columnFilters,
      audienceFilter,
    }),
    [contacts, entityType, personType, search, columnFilters, audienceFilter],
  );

  const filterableKeys = useMemo(
    () => baseColumns.filter((col) => col.filterable !== false && col.key !== 'row').map((col) => col.key),
    [baseColumns],
  );

  const filterOptions = useMemo(
    () => buildOptions(baseFiltered, filterableKeys, getExcelRaw),
    [baseFiltered, filterableKeys, buildOptions],
  );

  const filtered = useMemo(
    () => filterRows(baseFiltered, getExcelRaw),
    [baseFiltered, filterRows],
  );

  const sortAccessors = useMemo(() => {
    const map = {};
    baseColumns.forEach((col) => {
      if (col.key === 'row') return;
      map[col.key] = (row) => {
        if (col.key === 'behavioralStatus') {
          return BEHAVIORAL_STATUS[row.behavioralStatus]?.label || '';
        }
        return getCellValue(row, col.key);
      };
    });
    return map;
  }, [baseColumns]);

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const shell = useListShell({
    listKey: `kanoon.contacts.${viewKey}.table`,
    columnDefinitions,
    rows: filtered,
    sortAccessors,
    getExportValue: getExcelRaw,
    resetKey: viewKey,
    scrollRef,
    sentinelRef,
  });

  const filtersHydrated = useRef(false);
  useEffect(() => {
    filtersHydrated.current = false;
  }, [viewKey]);

  useEffect(() => {
    if (!shell.ready || filtersHydrated.current) return;
    filtersHydrated.current = true;
    const saved = shell.savedFilters || {};
    Object.entries(saved).forEach(([key, value]) => applyFilter(key, value));
  }, [shell.ready, shell.savedFilters, applyFilter]);

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
    if (pageRows.length > 0 && pageRows.every((c) => selectedIds.has(c.id))) {
      const next = new Set(selectedIds);
      pageRows.forEach((c) => next.delete(c.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      pageRows.forEach((c) => next.add(c.id));
      onSelectionChange(next);
    }
  };

  const pageAllSelected = pageRows.length > 0 && pageRows.every((c) => selectedIds.has(c.id));

  const tableTitle =
    entityType === ENTITY_TYPES.CUSTOMER
      ? personType === 'legal'
        ? 'مشتریان حقوقی'
        : 'مشتریان حقیقی'
      : personType === 'legal'
        ? 'تامین‌کنندگان حقوقی'
        : 'تامین‌کنندگان حقیقی';

  const handleApplyFilter = (key, value) => {
    applyFilter(key, value);
    const next = { ...excelFilters };
    if (!value) delete next[key];
    else next[key] = value;
    shell.setFilters(next);
  };

  const resizeColumns = visibleColumns.map((col) => ({
    key: col.key,
    defaultWidth: col.defaultWidth,
    resizable: col.resizable,
  }));

  return (
    <section className="section-data kanoon-table-section" aria-label="فهرست مخاطبین">
      <div className="data-table-header">
        <span className="data-table-header__title">{tableTitle}</span>
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
            filenameBase={`kanoon-${viewKey}`}
            sheetName="مخاطبین"
            viewMode={shell.viewMode}
            setViewMode={shell.setViewMode}
            onResetPreferences={shell.resetPreferences}
          />
        </div>
      </div>
      <div className="data-table-wrap kanoon-table-wrap jarian-list-scroll" ref={scrollRef}>
        <table className="data-table kanoon-table data-table--resizable">
          <ResizableColGroup columns={resizeColumns} widths={shell.widths} />
          <thead className="kanoon-table__head">
            <tr>
              {visibleColumns.map((col) => {
                if (col.key === 'check') {
                  return (
                    <ResizableTh
                      key={col.key}
                      columnKey="check"
                      resizable={false}
                      className="kanoon-table__check-col kanoon-table__sticky-th"
                    >
                      <input
                        type="checkbox"
                        aria-label="انتخاب همه"
                        checked={pageAllSelected}
                        onChange={toggleSelectAll}
                      />
                    </ResizableTh>
                  );
                }
                if (col.key === 'actions') {
                  return (
                    <ResizableTh
                      key={col.key}
                      columnKey="actions"
                      resizable={false}
                      className="kanoon-table__actions-col kanoon-table__sticky-th"
                    >
                      عملیات
                    </ResizableTh>
                  );
                }
                if (col.key === 'row') {
                  return (
                    <ResizableTh
                      key={col.key}
                      columnKey={col.key}
                      onResizeStart={shell.startResize}
                      className="kanoon-table__sticky-th font-meem"
                    >
                      {col.title}
                    </ResizableTh>
                  );
                }
                return (
                  <ResizableTh
                    key={col.key}
                    columnKey={col.key}
                    onResizeStart={shell.startResize}
                    className="kanoon-table__sticky-th font-meem"
                  >
                    <ListColumnHeader
                      label={col.title}
                      columnKey={col.key}
                      sorts={shell.sorts}
                      onToggleSort={shell.toggleSort}
                      sortable={col.sortable !== false}
                      filterable={col.filterable !== false}
                      filterOptions={filterOptions[col.key] || []}
                      filterSelected={excelFilters[col.key] || null}
                      openFilterKey={openFilterKey}
                      setOpenFilterKey={setOpenFilterKey}
                      onApplyFilter={(value) => handleApplyFilter(col.key, value)}
                    />
                  </ResizableTh>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <VirtualSpacerRows virtual={shell.virtual} colSpan={colSpan} />
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>
                  <div className="empty-state">
                    <div className="empty-state__icon">📋</div>
                    <p>مخاطبی در این نما یافت نشد.</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((contact, index) => (
                <tr
                  key={contact.id}
                  data-id={contact.id}
                  className={`kanoon-table__row${contact.isActive === false ? ' is-inactive' : ''}`}
                >
                  {visibleColumns.map((col) => {
                    if (col.key === 'check') {
                      return (
                        <td key={col.key} className="kanoon-table__check-col">
                          <input
                            type="checkbox"
                            aria-label={`انتخاب ${getDisplayName(contact)}`}
                            checked={selectedIds.has(contact.id)}
                            onChange={() => toggleSelect(contact.id)}
                          />
                        </td>
                      );
                    }
                    if (col.key === 'actions') {
                      return (
                        <td key={col.key} className="kanoon-table__actions-col">
                          <RowQuickActions
                            contact={contact}
                            onActivity={onQuickActivity}
                            onOrder={onQuickOrder}
                            onEdit={onNameClick}
                            onToggleActive={onToggleActive}
                          />
                        </td>
                      );
                    }
                    if (col.key === 'row') {
                      const rowNo = shell.virtual
                        ? shell.virtual.startIndex + index + 1
                        : (shell.pagination?.rangeStart || 1) + index;
                      return <td key={col.key}>{rowNo.toLocaleString('fa-IR')}</td>;
                    }
                    if (col.key === nameKey) {
                      return (
                        <td key={col.key}>
                          <button
                            type="button"
                            className="kanoon-table__name-link"
                            onClick={() => onNameClick(contact)}
                          >
                            {getCellValue(contact, col.key)}
                          </button>
                        </td>
                      );
                    }
                    if (col.key === 'behavioralStatus') {
                      const meta = BEHAVIORAL_STATUS[contact.behavioralStatus];
                      return (
                        <td key={col.key}>
                          {meta ? (
                            <StatusTag value={`tag:${meta.tag}:${meta.label}`} />
                          ) : '—'}
                        </td>
                      );
                    }
                    if (warmKeys.has(col.key)) {
                      const warm = WarmCell({ col, contact, entityType, onOrderFallback });
                      if (warm) return <td key={col.key}>{warm}</td>;
                    }
                    return <td key={col.key}>{getCellValue(contact, col.key) || '—'}</td>;
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
