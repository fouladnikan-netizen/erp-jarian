import { useMemo, useRef, useState } from 'react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import {
  ListColumnHeader,
  ListChrome,
  InfiniteSentinelRow,
} from '../../../components/common/list';
import ListStatusPill from '../../../components/module/ListStatusPill';
import { useListShell } from '../../../hooks/list';
import { isColumnFilterActive } from '../../../components/table/ColumnFilterHeader';
import { ORDER_TABS } from '../config';
import { formatOrderAmount, formatRegisteredAt } from '../orderCode';
import { UNPRICED_LABEL } from '../constants';
import { countOrderLineItems } from '../inquiryService';
import { getOrderDisplayStatus, getOrderDisplayStatusKind } from '../orderStageService';
import OrderRowActions from './OrderRowActions';
import ProformaRevisionTag from './ProformaRevisionTag';

const COLUMN_LABELS = {
  code: 'شماره سفارش',
  registeredAt: 'تاریخ و زمان ثبت',
  assignee: 'شوالیه ثبت‌کننده',
  customer: 'نام مشتری',
  stage: 'وضعیت سفارش',
  itemCount: 'تعداد آیتم‌ها',
  amount: 'مبلغ کل سفارش',
  actions: 'عملیات',
};

const FILTERABLE_KEYS = new Set(['code', 'registeredAt', 'assignee', 'customer', 'stage', 'itemCount', 'amount']);
const SORTABLE_KEYS = new Set(['code', 'registeredAt', 'assignee', 'customer', 'stage', 'itemCount', 'amount']);
const NUMERIC_FILTER_KEYS = new Set(['code', 'itemCount', 'amount', 'registeredAt']);

function buildColumnDefinitions(showActions) {
  const cols = [
    { key: 'code', title: COLUMN_LABELS.code, defaultWidth: 140, locked: true },
    { key: 'registeredAt', title: COLUMN_LABELS.registeredAt, defaultWidth: 150 },
    { key: 'assignee', title: COLUMN_LABELS.assignee, defaultWidth: 120 },
    { key: 'customer', title: COLUMN_LABELS.customer, defaultWidth: 140 },
    { key: 'stage', title: COLUMN_LABELS.stage, defaultWidth: 110 },
    { key: 'itemCount', title: COLUMN_LABELS.itemCount, defaultWidth: 90 },
    { key: 'amount', title: COLUMN_LABELS.amount, defaultWidth: 120 },
  ];
  if (showActions) {
    cols.push({
      key: 'actions',
      title: COLUMN_LABELS.actions,
      defaultWidth: 100,
      resizable: false,
      locked: true,
      sortable: false,
      filterable: false,
    });
  }
  return cols;
}

function getColumnRawValue(order, key) {
  switch (key) {
    case 'code':
      return order.code || '';
    case 'registeredAt':
      return formatRegisteredAt(order);
    case 'assignee':
      return order.assignee || '';
    case 'customer':
      return order.customer || '';
    case 'stage':
      return getOrderDisplayStatus(order);
    case 'itemCount':
      return String(countOrderLineItems(order));
    case 'amount':
      return formatOrderAmount(order) || UNPRICED_LABEL;
    default:
      return '';
  }
}

function getSortValue(order, key) {
  switch (key) {
    case 'itemCount':
      return countOrderLineItems(order);
    case 'amount': {
      const raw = order.totalAmount ?? order.amount ?? order.total;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case 'registeredAt':
      return order.registeredAt || order.createdAt || formatRegisteredAt(order);
    default:
      return getColumnRawValue(order, key);
  }
}

function renderNabzCell(col, order, ctx) {
  switch (col.key) {
    case 'code':
      return (
        <td key={col.key} className="nabz-table__code font-yekan">
          <span className="nabz-table__code-wrap">
            {order.code}
            <ProformaRevisionTag order={order} className="proforma-revision-tag--table" />
          </span>
        </td>
      );
    case 'registeredAt':
      return (
        <td key={col.key} className="nabz-table__datetime font-yekan">
          {formatRegisteredAt(order)}
        </td>
      );
    case 'assignee':
      return <td key={col.key}>{order.assignee}</td>;
    case 'customer':
      return (
        <td key={col.key} onClick={(e) => e.stopPropagation()}>
          {order.customerId ? (
            <button
              type="button"
              className="nabz-table__customer-link"
              onClick={() => ctx.onCustomerClick(order.customerId)}
            >
              {order.customer}
            </button>
          ) : (
            order.customer
          )}
        </td>
      );
    case 'stage':
      return (
        <td key={col.key}>
          <ListStatusPill
            kind={getOrderDisplayStatusKind(order)}
            label={getOrderDisplayStatus(order)}
          />
        </td>
      );
    case 'itemCount':
      return (
        <td key={col.key} className="nabz-table__item-count font-yekan">
          {countOrderLineItems(order).toLocaleString('fa-IR')}
        </td>
      );
    case 'amount':
      return (
        <td key={col.key} className="nabz-table__amount">
          {formatOrderAmount(order) || (
            <span className="nabz-table__unpriced">{UNPRICED_LABEL}</span>
          )}
        </td>
      );
    case 'actions':
      return (
        <td key={col.key} className="nabz-table__actions-cell" onClick={(e) => e.stopPropagation()}>
          <OrderRowActions
            orderCode={order.code}
            showInquiry={ctx.isCurrentTab}
            onOpenInquiry={() => ctx.onOpenInquiryModal?.(order)}
          />
        </td>
      );
    default:
      return <td key={col.key}>—</td>;
  }
}

export default function NabzOrderTable({
  orders,
  tab,
  listTitle,
  onOrderClick,
  onCustomerClick,
  onOpenInquiryModal,
}) {
  const isCurrentTab = tab === ORDER_TABS.CURRENT;
  const isSuccessTab = tab === ORDER_TABS.SUCCESS;
  const showProfileAction = isCurrentTab || isSuccessTab;
  const useStandardColumns = tab === ORDER_TABS.CURRENT || tab === ORDER_TABS.FAILED || tab === ORDER_TABS.SUCCESS;

  const columnDefinitions = useMemo(
    () => buildColumnDefinitions(showProfileAction),
    [showProfileAction],
  );

  const sortAccessors = useMemo(() => {
    const map = {};
    SORTABLE_KEYS.forEach((key) => {
      map[key] = (row) => getSortValue(row, key);
    });
    return map;
  }, []);

  const [columnFilters, setColumnFilters] = useState({});
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [filterEpoch, setFilterEpoch] = useState(tab);
  const [filtersHydratedFor, setFiltersHydratedFor] = useState(null);

  if (filterEpoch !== tab) {
    setFilterEpoch(tab);
    setColumnFilters({});
    setOpenFilterKey(null);
    setFiltersHydratedFor(null);
  }

  const filteredOrders = useMemo(() => {
    const entries = Object.entries(columnFilters).filter(([, value]) => isColumnFilterActive(value));
    if (!entries.length) return orders;
    return orders.filter((order) => (
      entries.every(([key, values]) => values.includes(getColumnRawValue(order, key)))
    ));
  }, [orders, columnFilters]);

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const shell = useListShell({
    listKey: `nabz.orders.${tab}.table`,
    columnDefinitions,
    rows: filteredOrders,
    sortAccessors,
    sortTypes: {
      itemCount: 'number',
      amount: 'number',
      registeredAt: 'date',
    },
    resetKey: tab,
    scrollRef,
    sentinelRef,
  });

  if (shell.ready && filtersHydratedFor !== tab) {
    setFiltersHydratedFor(tab);
    if (shell.savedFilters && Object.keys(shell.savedFilters).length) {
      setColumnFilters(shell.savedFilters);
    }
  }

  const applyFilter = (key, value) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!value) delete next[key];
      else next[key] = value;
      shell.setFilters(next);
      return next;
    });
  };

  const filterOptions = useMemo(() => {
    const map = {};
    FILTERABLE_KEYS.forEach((key) => {
      const values = new Set();
      orders.forEach((order) => {
        const value = getColumnRawValue(order, key);
        if (value) values.add(value);
      });
      map[key] = Array.from(values).sort((a, b) => String(a).localeCompare(String(b), 'fa'));
    });
    return map;
  }, [orders]);

  const visibleColumns = shell.visibleColumns;
  const colSpan = Math.max(visibleColumns.length, 1);
  const pageRows = shell.visibleRows;
  const rowCtx = {
    onCustomerClick,
    onOpenInquiryModal,
    isCurrentTab,
  };

  return (
    <section className="section-data nabz-table-section" aria-label={listTitle}>
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
              setColumnFilters({});
              setOpenFilterKey(null);
            }}
          />
        </div>
      </div>
      <div className="data-table-wrap nabz-table-wrap jarian-list-scroll" ref={scrollRef}>
        <table className="data-table nabz-table jarian-table data-table--resizable">
          {useStandardColumns && (
            <>
              <ResizableColGroup columns={visibleColumns} widths={shell.widths} />
              <thead className="nabz-table__head">
                <tr>
                  {visibleColumns.map((col) => (
                    <ResizableTh
                      key={col.key}
                      columnKey={col.key}
                      resizable={col.resizable !== false}
                      onResizeStart={shell.startResize}
                      className={`nabz-table__sticky-th${col.key === 'actions' ? ' nabz-table__sticky-th--actions' : ''}${col.key === 'itemCount' ? ' nabz-table__th--center' : ''}`}
                    >
                      {col.key === 'actions' ? (
                        col.title
                      ) : (
                        <ListColumnHeader
                          label={col.title}
                          columnKey={col.key}
                          sorts={shell.sorts}
                          onToggleSort={shell.toggleSort}
                          sortable={SORTABLE_KEYS.has(col.key)}
                          filterable={FILTERABLE_KEYS.has(col.key)}
                          filterOptions={filterOptions[col.key] || []}
                          filterSelected={columnFilters[col.key] || null}
                          openFilterKey={openFilterKey}
                          setOpenFilterKey={setOpenFilterKey}
                          numeric={NUMERIC_FILTER_KEYS.has(col.key)}
                          onApplyFilter={(value) => applyFilter(col.key, value)}
                        />
                      )}
                    </ResizableTh>
                  ))}
                </tr>
              </thead>
            </>
          )}
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>
                  <div className="empty-state">
                    <div className="empty-state__icon">📋</div>
                    <p>سفارشی در این نما یافت نشد.</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((order) => {
                const rowProps = isCurrentTab
                  ? {
                    className: `nabz-table__row${order.saleType === 'غیر رسمی' ? ' nabz-table__row--informal' : ''}`,
                  }
                  : isSuccessTab
                    ? { className: 'nabz-table__row' }
                    : {
                      className: 'nabz-table__row nabz-table__row--clickable',
                      onClick: () => onOrderClick(order),
                      onKeyDown: (e) => e.key === 'Enter' && onOrderClick(order),
                      tabIndex: 0,
                      role: 'button',
                    };

                return (
                  <tr key={order.id} {...rowProps}>
                    {visibleColumns.map((col) => renderNabzCell(col, order, rowCtx))}
                  </tr>
                );
              })
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
