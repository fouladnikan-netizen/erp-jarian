import { useEffect, useMemo, useRef } from 'react';
import { Eye, Paperclip } from 'lucide-react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import {
  ListColumnHeader,
  ListChrome,
  InfiniteSentinelRow,
} from '../../../components/common/list';
import ListStatusPill from '../../../components/module/ListStatusPill';
import { useColumnExcelFilters } from '../../../hooks/useColumnExcelFilters';
import { useListShell } from '../../../hooks/list';
import '../gahshomar-documents.css';

const STATUS_KIND = {
  'پیش‌نویس': 'draft',
  'صادر شده': 'issued',
  'دریافت شده': 'received',
  'بایگانی': 'archived',
};

const INCOMING_COLUMNS = [
  { key: 'row', title: 'ردیف', defaultWidth: 56, resizable: false, locked: true, sortable: false, filterable: false },
  { key: 'number', title: 'شماره', defaultWidth: 120, locked: true, numeric: true, filterable: true },
  { key: 'date', title: 'تاریخ', defaultWidth: 120, numeric: true, filterable: true },
  { key: 'displayParty', title: 'فرستنده', defaultWidth: 160, filterable: true },
  { key: 'subject', title: 'موضوع', defaultWidth: 220, locked: true, filterable: true },
  { key: 'displayType', title: 'نوع', defaultWidth: 90, filterable: true },
  { key: 'displayStatus', title: 'وضعیت', defaultWidth: 120, filterable: true },
  { key: 'attachment', title: 'پیوست', defaultWidth: 72, resizable: false, filterable: false },
  { key: 'actions', title: 'عملیات', defaultWidth: 88, resizable: false, locked: true, sortable: false, filterable: false },
];

const OUTGOING_COLUMNS = [
  { key: 'row', title: 'ردیف', defaultWidth: 56, resizable: false, locked: true, sortable: false, filterable: false },
  { key: 'number', title: 'شماره', defaultWidth: 120, locked: true, numeric: true, filterable: true },
  { key: 'date', title: 'تاریخ', defaultWidth: 120, numeric: true, filterable: true },
  { key: 'displayParty', title: 'گیرنده', defaultWidth: 160, filterable: true },
  { key: 'subject', title: 'موضوع', defaultWidth: 220, locked: true, filterable: true },
  { key: 'displayStatus', title: 'وضعیت', defaultWidth: 120, filterable: true },
  { key: 'attachment', title: 'پیوست', defaultWidth: 72, resizable: false, filterable: false },
  { key: 'actions', title: 'عملیات', defaultWidth: 88, resizable: false, locked: true, sortable: false, filterable: false },
];

function getRawValue(record, key) {
  if (key === 'attachment') return record.hasAttachments ? 'دارد' : 'ندارد';
  const value = record[key];
  return value == null || value === '' ? '' : String(value);
}

export default function OfficialRecordList({ tab, records, onOpenDetail }) {
  const isIncoming = tab === 'incoming';
  const columnDefinitions = useMemo(
    () => (isIncoming ? INCOMING_COLUMNS : OUTGOING_COLUMNS),
    [isIncoming],
  );
  const filterableKeys = useMemo(
    () => columnDefinitions.filter((col) => col.filterable !== false).map((col) => col.key),
    [columnDefinitions],
  );

  const {
    columnFilters,
    openFilterKey,
    setOpenFilterKey,
    applyFilter,
    clearFilters,
    filterRows,
    buildOptions,
  } = useColumnExcelFilters({ resetKey: tab });

  const filterOptions = useMemo(
    () => buildOptions(records, filterableKeys, getRawValue),
    [records, filterableKeys, buildOptions],
  );

  const filteredRecords = useMemo(
    () => filterRows(records, getRawValue),
    [records, filterRows],
  );

  const sortAccessors = useMemo(() => {
    const map = {};
    columnDefinitions.forEach((col) => {
      if (col.sortable === false) return;
      map[col.key] = (row) => getRawValue(row, col.key);
    });
    return map;
  }, [columnDefinitions]);

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const shell = useListShell({
    listKey: `gahshomar.records.${tab}.table`,
    columnDefinitions,
    rows: filteredRecords,
    sortAccessors,
    sortTypes: { date: 'date' },
    resetKey: tab,
    scrollRef,
    sentinelRef,
  });

  const filtersHydrated = useRef(false);
  useEffect(() => {
    filtersHydrated.current = false;
  }, [tab]);
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

  const emptyTitle = useMemo(
    () => (isIncoming ? 'هنوز نامه‌ای دریافت نکرده‌ایم' : 'هنوز نامه‌ای ارسال نکرده‌ایم'),
    [isIncoming],
  );

  if (!records.length) {
    return (
      <div className="gahshomar-docs__empty gahshomar-docs__empty--section section-data">
        <p className="gahshomar-docs__empty-title font-meem">{emptyTitle}</p>
        <p className="gahshomar-docs__empty-body font-meem">
          مکاتبات رسمی سازمان در این نما نمایش داده می‌شوند.
        </p>
      </div>
    );
  }

  const visibleColumns = shell.visibleColumns;
  const pageRows = shell.visibleRows;
  const colSpan = visibleColumns.length;

  return (
    <section
      className="section-data gahshomar-list kprofile-glass"
      aria-label={isIncoming ? 'فهرست دریافتی' : 'فهرست ارسالی'}
    >
      <div className="data-table-header">
        <span className="data-table-header__title font-meem">
          {isIncoming ? 'نامه‌های دریافتی' : 'نامه‌های ارسالی'}
        </span>
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
      <div className="data-table-wrap gahshomar-docs__table-wrap jarian-list-scroll" ref={scrollRef}>
        <table className="jarian-table gahshomar-docs__table data-table--resizable">
          <ResizableColGroup columns={visibleColumns} widths={shell.widths} />
          <thead>
            <tr>
              {visibleColumns.map((col) => (
                <ResizableTh
                  key={col.key}
                  columnKey={col.key}
                  resizable={col.resizable !== false}
                  onResizeStart={shell.startResize}
                  className="font-meem"
                >
                  {col.key === 'row' || col.key === 'actions' ? (
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
                <td colSpan={colSpan} className="font-meem">
                  موردی با فیلتر فعلی یافت نشد.
                </td>
              </tr>
            ) : (
              pageRows.map((record, index) => (
                <tr key={record.id}>
                  {visibleColumns.map((col) => {
                    if (col.key === 'row') {
                      return (
                        <td key={col.key} className="font-yekan">
                          {(index + 1).toLocaleString('fa-IR')}
                        </td>
                      );
                    }
                    if (col.key === 'number') {
                      return <td key={col.key} className="font-yekan">{record.number || '—'}</td>;
                    }
                    if (col.key === 'date') {
                      return <td key={col.key} className="font-yekan">{record.date || '—'}</td>;
                    }
                    if (col.key === 'displayParty') {
                      return <td key={col.key} className="font-meem">{record.displayParty || '—'}</td>;
                    }
                    if (col.key === 'subject') {
                      return <td key={col.key} className="font-meem">{record.subject || '—'}</td>;
                    }
                    if (col.key === 'displayType') {
                      return <td key={col.key} className="font-meem">{record.displayType || '—'}</td>;
                    }
                    if (col.key === 'displayStatus') {
                      return (
                        <td key={col.key}>
                          <ListStatusPill
                            kind={STATUS_KIND[record.displayStatus] || record.status?.toLowerCase() || 'pending'}
                            label={record.displayStatus || '—'}
                          />
                        </td>
                      );
                    }
                    if (col.key === 'attachment') {
                      return (
                        <td key={col.key} className="font-yekan">
                          {record.hasAttachments ? (
                            <Paperclip size={16} strokeWidth={1.75} aria-label="دارای پیوست" />
                          ) : '—'}
                        </td>
                      );
                    }
                    if (col.key === 'actions') {
                      return (
                        <td key={col.key}>
                          <button
                            type="button"
                            className="gahshomar-list__detail-btn"
                            aria-label="مشاهده جزئیات"
                            onClick={() => onOpenDetail?.(record.id)}
                          >
                            <Eye size={16} strokeWidth={1.75} />
                          </button>
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
