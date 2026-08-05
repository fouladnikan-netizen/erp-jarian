import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Pause, Play } from 'lucide-react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import {
  ListColumnHeader,
  ListChrome,
  ListSelectionBar,
  InfiniteSentinelRow,
} from '../../../components/common/list';
import ListStatusPill from '../../../components/module/ListStatusPill';
import { useColumnExcelFilters } from '../../../hooks/useColumnExcelFilters';
import { useListShell } from '../../../hooks/list';
import { CAMPAIGN_STATUS } from '../domain';
import {
  MOWJ_CAMPAIGN_COLUMNS,
  getCampaignCellRaw,
  getCampaignStatusPillKind,
} from '../columns';

const FILTERABLE_KEYS = MOWJ_CAMPAIGN_COLUMNS
  .filter((col) => col.filterable !== false && col.key !== 'check' && col.key !== 'row' && col.key !== 'actions')
  .map((col) => col.key);

function canToggleRun(status) {
  return status === CAMPAIGN_STATUS.RUNNING || status === CAMPAIGN_STATUS.PAUSED;
}

/**
 * Unified campaign list — Law #004 (useListShell + ListChrome + Infinite Loading).
 */
export default function MowjCampaignTable({
  campaigns,
  listTitle = 'کمپین‌ها',
  onOpenDetail,
  onToggleStatus,
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const {
    columnFilters,
    openFilterKey,
    setOpenFilterKey,
    applyFilter,
    clearFilters,
    filterRows,
    buildOptions,
  } = useColumnExcelFilters();

  const filterOptions = useMemo(
    () => buildOptions(campaigns, FILTERABLE_KEYS, getCampaignCellRaw),
    [campaigns, buildOptions],
  );

  const filteredCampaigns = useMemo(
    () => filterRows(campaigns, getCampaignCellRaw),
    [campaigns, filterRows],
  );

  const sortAccessors = useMemo(() => {
    const map = {};
    FILTERABLE_KEYS.forEach((key) => {
      map[key] = (row) => getCampaignCellRaw(row, key);
    });
    return map;
  }, []);

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const shell = useListShell({
    listKey: 'mowj.campaigns.table',
    columnDefinitions: MOWJ_CAMPAIGN_COLUMNS,
    rows: filteredCampaigns,
    sortAccessors,
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
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (pageRows.length > 0 && pageRows.every((c) => selectedIds.has(c.id))) {
      const next = new Set(selectedIds);
      pageRows.forEach((c) => next.delete(c.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      pageRows.forEach((c) => next.add(c.id));
      setSelectedIds(next);
    }
  };

  const pageAllSelected = pageRows.length > 0 && pageRows.every((c) => selectedIds.has(c.id));

  return (
    <section className="section-data mowj-table-section" aria-label="فهرست کمپین‌های موج">
      <div className="data-table-header">
        <span className="data-table-header__title font-meem">{listTitle}</span>
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
        onClear={() => setSelectedIds(new Set())}
      />

      <div className="data-table-wrap mowj-table-wrap jarian-list-scroll" ref={scrollRef}>
        <table className="data-table mowj-table jarian-table data-table--resizable">
          <ResizableColGroup columns={visibleColumns} widths={shell.widths} />
          <thead>
            <tr>
              {visibleColumns.map((col) => (
                <ResizableTh
                  key={col.key}
                  columnKey={col.key}
                  resizable={col.resizable !== false}
                  onResizeStart={shell.startResize}
                  className={`font-meem${
                    col.key === 'check' ? ' mowj-table__check-col' : ''
                  }${col.key === 'actions' ? ' mowj-table__actions-col' : ''}`}
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
                    <p className="font-meem">کمپینی با این فیلتر یافت نشد.</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((campaign, index) => (
                <tr key={campaign.id}>
                  {visibleColumns.map((col) => {
                    if (col.key === 'check') {
                      return (
                        <td key={col.key} className="mowj-table__check-col">
                          <input
                            type="checkbox"
                            aria-label={`انتخاب ${campaign.name}`}
                            checked={selectedIds.has(campaign.id)}
                            onChange={() => toggleSelect(campaign.id)}
                          />
                        </td>
                      );
                    }
                    if (col.key === 'row') {
                      return (
                        <td key={col.key} className="jarian-td-row font-yekan">
                          {(index + 1).toLocaleString('fa-IR')}
                        </td>
                      );
                    }
                    if (col.key === 'name') {
                      return (
                        <td key={col.key} className="mowj-td-name">
                          <button
                            type="button"
                            className="mowj-link-name font-meem"
                            onClick={() => onOpenDetail?.(campaign)}
                          >
                            {campaign.name}
                          </button>
                        </td>
                      );
                    }
                    if (col.key === 'purpose') {
                      return (
                        <td key={col.key}>
                          <span className="mowj-type-chip font-meem">{campaign.purposeLabel}</span>
                        </td>
                      );
                    }
                    if (col.key === 'campaignType') {
                      return (
                        <td key={col.key} className="font-meem">{campaign.campaignTypeLabel}</td>
                      );
                    }
                    if (col.key === 'channel') {
                      return (
                        <td key={col.key} className="font-meem">{campaign.channelLabel}</td>
                      );
                    }
                    if (col.key === 'status') {
                      return (
                        <td key={col.key}>
                          <ListStatusPill
                            kind={getCampaignStatusPillKind(campaign.status)}
                            label={campaign.statusLabel || campaign.status}
                          />
                        </td>
                      );
                    }
                    if (col.key === 'kpi') {
                      return (
                        <td key={col.key} className="font-meem">{campaign.kpiLabel}</td>
                      );
                    }
                    if (col.key === 'actions') {
                      return (
                        <td key={col.key} className="mowj-table__actions-col">
                          <div className="mowj-row-actions">
                            <button
                              type="button"
                              className="mowj-icon-btn"
                              title="جزئیات"
                              aria-label="مشاهده جزئیات کمپین"
                              onClick={() => onOpenDetail?.(campaign)}
                            >
                              <Eye size={15} strokeWidth={1.75} />
                            </button>
                            {canToggleRun(campaign.status) ? (
                              <button
                                type="button"
                                className="mowj-icon-btn"
                                title={campaign.status === CAMPAIGN_STATUS.RUNNING ? 'توقف' : 'ادامه'}
                                aria-label={
                                  campaign.status === CAMPAIGN_STATUS.RUNNING
                                    ? 'توقف کمپین'
                                    : 'ادامه کمپین'
                                }
                                onClick={() => onToggleStatus?.(campaign)}
                              >
                                {campaign.status === CAMPAIGN_STATUS.RUNNING
                                  ? <Pause size={15} strokeWidth={1.75} />
                                  : <Play size={15} strokeWidth={1.75} />}
                              </button>
                            ) : null}
                          </div>
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
