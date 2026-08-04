import { useEffect, useMemo, useState } from 'react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import ColumnFilterHeader, { isColumnFilterActive } from '../../../components/table/ColumnFilterHeader';
import ListStatusPill from '../../../components/module/ListStatusPill';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import { ORDER_TABS } from '../config';
import { formatOrderAmount, formatRegisteredAt } from '../orderCode';
import { UNPRICED_LABEL } from '../constants';
import { countOrderLineItems } from '../inquiryService';
import { getOrderDisplayStatus, getOrderDisplayStatusKind } from '../orderStageService';
import OrderRowActions from './OrderRowActions';
import ProformaRevisionTag from './ProformaRevisionTag';

const NABZ_CURRENT_COLUMNS = [
  { key: 'code', defaultWidth: 140 },
  { key: 'registeredAt', defaultWidth: 150 },
  { key: 'assignee', defaultWidth: 120 },
  { key: 'customer', defaultWidth: 140 },
  { key: 'stage', defaultWidth: 110 },
  { key: 'itemCount', defaultWidth: 90 },
  { key: 'amount', defaultWidth: 120 },
  { key: 'actions', defaultWidth: 100, resizable: false },
];

const NABZ_OTHER_COLUMNS = [
  { key: 'code', defaultWidth: 140 },
  { key: 'registeredAt', defaultWidth: 150 },
  { key: 'assignee', defaultWidth: 120 },
  { key: 'customer', defaultWidth: 140 },
  { key: 'stage', defaultWidth: 110 },
  { key: 'itemCount', defaultWidth: 90 },
  { key: 'amount', defaultWidth: 120 },
];

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
const NUMERIC_FILTER_KEYS = new Set(['code', 'itemCount', 'amount', 'registeredAt']);

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

  const columnDefs = useMemo(
    () => (showProfileAction ? NABZ_CURRENT_COLUMNS : NABZ_OTHER_COLUMNS),
    [showProfileAction],
  );

  const { widths, startResize } = useResizableColumns(`nabz-orders-${tab}`, columnDefs);
  const [columnFilters, setColumnFilters] = useState({});
  const [openFilterKey, setOpenFilterKey] = useState(null);

  useEffect(() => {
    setColumnFilters({});
    setOpenFilterKey(null);
  }, [tab]);

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

  const visibleOrders = useMemo(() => {
    const entries = Object.entries(columnFilters).filter(([, value]) => isColumnFilterActive(value));
    if (!entries.length) return orders;
    return orders.filter((order) => (
      entries.every(([key, values]) => values.includes(getColumnRawValue(order, key)))
    ));
  }, [orders, columnFilters]);

  const colSpan = columnDefs.length;

  return (
    <section className="section-data nabz-table-section" aria-label={listTitle}>
      <div className="data-table-header">
        <span className="data-table-header__title">{listTitle}</span>
        <span className="data-table-header__count">
          {visibleOrders.length.toLocaleString('fa-IR')} رکورد
        </span>
      </div>
      <div className="data-table-wrap nabz-table-wrap">
        <table className="data-table nabz-table jarian-table data-table--resizable">
          {useStandardColumns && (
            <>
              <ResizableColGroup columns={columnDefs} widths={widths} />
              <thead className="nabz-table__head">
                <tr>
                  {columnDefs.map((col) => (
                    <ResizableTh
                      key={col.key}
                      columnKey={col.key}
                      resizable={col.resizable !== false}
                      onResizeStart={startResize}
                      className={`nabz-table__sticky-th${col.key === 'actions' ? ' nabz-table__sticky-th--actions' : ''}${col.key === 'itemCount' ? ' nabz-table__th--center' : ''}`}
                    >
                      {FILTERABLE_KEYS.has(col.key) ? (
                        <ColumnFilterHeader
                          label={COLUMN_LABELS[col.key]}
                          columnKey={col.key}
                          options={filterOptions[col.key] || []}
                          selected={columnFilters[col.key] || null}
                          openKey={openFilterKey}
                          setOpenKey={setOpenFilterKey}
                          numeric={NUMERIC_FILTER_KEYS.has(col.key)}
                          onApply={(value) => {
                            setColumnFilters((prev) => {
                              const next = { ...prev };
                              if (!value) delete next[col.key];
                              else next[col.key] = value;
                              return next;
                            });
                          }}
                        />
                      ) : (
                        COLUMN_LABELS[col.key]
                      )}
                    </ResizableTh>
                  ))}
                </tr>
              </thead>
            </>
          )}
          <tbody>
            {visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>
                  <div className="empty-state">
                    <div className="empty-state__icon">📋</div>
                    <p>سفارشی در این نما یافت نشد.</p>
                  </div>
                </td>
              </tr>
            ) : (
              visibleOrders.map((order) => {
                const rowProps = isCurrentTab
                  ? {
                    className: `nabz-table__row${order.saleType === 'غیر رسمی' ? ' nabz-table__row--informal' : ''}`,
                  }
                  : isSuccessTab
                    ? {
                      className: 'nabz-table__row',
                    }
                    : {
                      className: 'nabz-table__row nabz-table__row--clickable',
                      onClick: () => onOrderClick(order),
                      onKeyDown: (e) => e.key === 'Enter' && onOrderClick(order),
                      tabIndex: 0,
                      role: 'button',
                    };

                return (
                  <tr key={order.id} {...rowProps}>
                    <td className="nabz-table__code font-yekan">
                      <span className="nabz-table__code-wrap">
                        {order.code}
                        <ProformaRevisionTag order={order} className="proforma-revision-tag--table" />
                      </span>
                    </td>
                    <td className="nabz-table__datetime font-yekan">{formatRegisteredAt(order)}</td>
                    <td>{order.assignee}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {order.customerId ? (
                        <button
                          type="button"
                          className="nabz-table__customer-link"
                          onClick={() => onCustomerClick(order.customerId)}
                        >
                          {order.customer}
                        </button>
                      ) : (
                        order.customer
                      )}
                    </td>
                    <td>
                      <ListStatusPill
                        kind={getOrderDisplayStatusKind(order)}
                        label={getOrderDisplayStatus(order)}
                      />
                    </td>
                    <td className="nabz-table__item-count font-yekan">
                      {countOrderLineItems(order).toLocaleString('fa-IR')}
                    </td>
                    <td className="nabz-table__amount">
                      {formatOrderAmount(order) || (
                        <span className="nabz-table__unpriced">{UNPRICED_LABEL}</span>
                      )}
                    </td>
                    {showProfileAction && (
                      <td className="nabz-table__actions-cell" onClick={(e) => e.stopPropagation()}>
                        <OrderRowActions
                          orderCode={order.code}
                          showInquiry={isCurrentTab}
                          onOpenInquiry={() => onOpenInquiryModal?.(order)}
                        />
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
