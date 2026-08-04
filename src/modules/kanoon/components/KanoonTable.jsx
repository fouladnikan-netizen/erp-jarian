import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import ColumnFilterHeader from '../../../components/table/ColumnFilterHeader';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import { useColumnExcelFilters } from '../../../hooks/useColumnExcelFilters';
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
import { filterContacts, sortContacts } from '../kpi';
import RowQuickActions from './RowQuickActions';
import OrderPulseTally from './OrderPulseTally';

function SortIcon({ active, dir }) {
  return (
    <span className={`kanoon-table__sort${active ? ' is-active' : ''}`} aria-hidden="true">
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );
}

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
  const columns = TABLE_COLUMNS[viewKey];
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const tableColumnDefs = useMemo(() => [
    { key: 'check', defaultWidth: 48, resizable: false },
    ...columns.map((col) => ({ key: col.key, defaultWidth: col.width ?? 120 })),
    { key: 'actions', defaultWidth: 110, resizable: false },
  ], [columns]);

  const { widths, startResize } = useResizableColumns(`kanoon-${viewKey}`, tableColumnDefs);
  const {
    columnFilters: excelFilters,
    openFilterKey,
    setOpenFilterKey,
    applyFilter,
    filterRows,
    buildOptions,
  } = useColumnExcelFilters({ resetKey: viewKey });

  const filterableKeys = useMemo(
    () => columns.filter((col) => col.filterable !== false && col.key !== 'row').map((col) => col.key),
    [columns],
  );

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

  const filterOptions = useMemo(
    () => buildOptions(baseFiltered, filterableKeys, getExcelRaw),
    [baseFiltered, filterableKeys, buildOptions],
  );

  const filtered = useMemo(
    () => filterRows(baseFiltered, getExcelRaw),
    [baseFiltered, filterRows],
  );

  const sorted = useMemo(
    () => sortContacts(filtered, sortKey, sortDir, getCellValue),
    [filtered, sortKey, sortDir],
  );

  const toggleSort = (key) => {
    if (!key || key === 'row') return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sorted.map((c) => c.id)));
    }
  };

  const nameKey = personType === 'legal' ? 'companyName' : 'personName';
  const warmKeys = new Set([
    'interactionValue', 'orderPulse', 'supplyVolume', 'openInquiries', 'contactAge', 'lastActivity',
  ]);

  const tableTitle =
    entityType === ENTITY_TYPES.CUSTOMER
      ? personType === 'legal'
        ? 'مشتریان حقوقی'
        : 'مشتریان حقیقی'
      : personType === 'legal'
        ? 'تامین‌کنندگان حقوقی'
        : 'تامین‌کنندگان حقیقی';

  return (
    <section className="section-data kanoon-table-section" aria-label="فهرست مخاطبین">
      <div className="data-table-header">
        <span className="data-table-header__title">{tableTitle}</span>
        <span className="data-table-header__count">
          {sorted.length.toLocaleString('fa-IR')} رکورد
        </span>
      </div>
      <div className="data-table-wrap kanoon-table-wrap">
        <table className="data-table kanoon-table data-table--resizable">
          <ResizableColGroup columns={tableColumnDefs} widths={widths} />
          <thead className="kanoon-table__head">
            <tr>
              <ResizableTh
                columnKey="check"
                resizable={false}
                className="kanoon-table__check-col kanoon-table__sticky-th"
              >
                <input
                  type="checkbox"
                  aria-label="انتخاب همه"
                  checked={sorted.length > 0 && selectedIds.size === sorted.length}
                  onChange={toggleSelectAll}
                />
              </ResizableTh>
              {columns.map((col) => (
                <ResizableTh
                  key={col.key}
                  columnKey={col.key}
                  onResizeStart={startResize}
                  className="kanoon-table__sticky-th font-meem"
                >
                  {col.filterable !== false && col.key !== 'row' ? (
                    <div className="kanoon-table__th-with-filter">
                      <ColumnFilterHeader
                        label={col.label}
                        columnKey={col.key}
                        options={filterOptions[col.key] || []}
                        selected={excelFilters[col.key] || null}
                        openKey={openFilterKey}
                        setOpenKey={setOpenFilterKey}
                        onApply={(value) => applyFilter(col.key, value)}
                      />
                      {col.sortable ? (
                        <button
                          type="button"
                          className="kanoon-table__th-btn kanoon-table__th-btn--sort-only"
                          onClick={() => toggleSort(col.key)}
                          aria-label={`مرتب‌سازی ${col.label}`}
                        >
                          <SortIcon active={sortKey === col.key} dir={sortDir} />
                        </button>
                      ) : null}
                    </div>
                  ) : col.sortable ? (
                    <button
                      type="button"
                      className="kanoon-table__th-btn"
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </button>
                  ) : (
                    col.label
                  )}
                </ResizableTh>
              ))}
              <ResizableTh
                columnKey="actions"
                resizable={false}
                className="kanoon-table__actions-col kanoon-table__sticky-th"
              >
                عملیات
              </ResizableTh>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2}>
                  <div className="empty-state">
                    <div className="empty-state__icon">📋</div>
                    <p>مخاطبی در این نما یافت نشد.</p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((contact, index) => (
                <tr
                  key={contact.id}
                  data-id={contact.id}
                  className={`kanoon-table__row${contact.isActive === false ? ' is-inactive' : ''}`}
                >
                  <td className="kanoon-table__check-col">
                    <input
                      type="checkbox"
                      aria-label={`انتخاب ${getDisplayName(contact)}`}
                      checked={selectedIds.has(contact.id)}
                      onChange={() => toggleSelect(contact.id)}
                    />
                  </td>
                  {columns.map((col) => {
                    if (col.key === 'row') {
                      return <td key={col.key}>{(index + 1).toLocaleString('fa-IR')}</td>;
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
                          ) : (
                            '—'
                          )}
                        </td>
                      );
                    }
                    if (warmKeys.has(col.key)) {
                      const warm = WarmCell({ col, contact, entityType, onOrderFallback });
                      if (warm) return <td key={col.key}>{warm}</td>;
                    }
                    return <td key={col.key}>{getCellValue(contact, col.key) || '—'}</td>;
                  })}
                  <td className="kanoon-table__actions-col">
                    <RowQuickActions
                      contact={contact}
                      onActivity={onQuickActivity}
                      onOrder={onQuickOrder}
                      onEdit={onNameClick}
                      onToggleActive={onToggleActive}
                    />
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
