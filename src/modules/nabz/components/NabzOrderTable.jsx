import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
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

function LinesFilterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  );
}

function SearchMiniIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
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

function isFilterActive(selected) {
  return Array.isArray(selected) && selected.length > 0;
}

function ColumnFilterHeader({
  label,
  columnKey,
  options,
  selected,
  onApply,
  openKey,
  setOpenKey,
}) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const isOpen = openKey === columnKey;
  const hasFilter = isFilterActive(selected);

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState([]);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 240 });

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => String(option).toLowerCase().includes(q));
  }, [options, query]);

  const allVisibleSelected = visibleOptions.length > 0
    && visibleOptions.every((option) => draft.includes(option));

  const someVisibleSelected = visibleOptions.some((option) => draft.includes(option));

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 248;
    const padding = 8;
    let left = rect.right - width;
    left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
    let top = rect.bottom + 6;
    const estimatedHeight = 320;
    if (top + estimatedHeight > window.innerHeight - padding) {
      top = Math.max(padding, rect.top - estimatedHeight - 6);
    }
    setCoords({ top, left, width });
  };

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    setQuery('');
    setDraft(isFilterActive(selected) ? [...selected] : [...options]);
    updatePosition();

    const onScrollOrResize = () => updatePosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
    // Initialize draft only when the popover opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDoc = (event) => {
      const target = event.target;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpenKey(null);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpenKey(null);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, setOpenKey]);

  const toggleOption = (option) => {
    setDraft((prev) => (
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    ));
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setDraft((prev) => prev.filter((item) => !visibleOptions.includes(item)));
      return;
    }
    setDraft((prev) => Array.from(new Set([...prev, ...visibleOptions])));
  };

  const handleApply = () => {
    const next = draft.length === 0 || draft.length === options.length
      ? null
      : draft;
    onApply(next);
    setOpenKey(null);
  };

  const handleClear = () => {
    onApply(null);
    setOpenKey(null);
  };

  const isNumeric = NUMERIC_FILTER_KEYS.has(columnKey);

  return (
    <div className="nabz-col-filter">
      <span className="nabz-col-filter__label font-meem">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className={`nabz-col-filter__trigger${hasFilter ? ' is-active' : ''}${isOpen ? ' is-open' : ''}`}
        aria-label={`فیلتر ${label}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          setOpenKey(isOpen ? null : columnKey);
        }}
      >
        <LinesFilterIcon />
      </button>

      {isOpen && createPortal(
        <div
          ref={panelRef}
          className="nabz-excel-filter"
          role="dialog"
          aria-label={`فیلتر ستون ${label}`}
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="nabz-excel-filter__search">
            <SearchMiniIcon />
            <input
              type="search"
              className="nabz-excel-filter__search-input font-meem"
              placeholder="جستجو..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <label className="nabz-excel-filter__master font-meem">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
              }}
              onChange={toggleAllVisible}
            />
            <span>انتخاب همه</span>
          </label>

          <div className="nabz-excel-filter__list">
            {visibleOptions.length === 0 ? (
              <p className="nabz-excel-filter__empty font-meem">موردی یافت نشد</p>
            ) : (
              visibleOptions.map((option) => (
                <label key={option} className="nabz-excel-filter__option font-meem">
                  <input
                    type="checkbox"
                    checked={draft.includes(option)}
                    onChange={() => toggleOption(option)}
                  />
                  <span className={isNumeric ? 'font-yekan' : 'font-meem'}>{option}</span>
                </label>
              ))
            )}
          </div>

          <div className="nabz-excel-filter__footer">
            <button type="button" className="nabz-excel-filter__clear font-meem" onClick={handleClear}>
              پاک کردن
            </button>
            <button type="button" className="nabz-excel-filter__apply font-meem" onClick={handleApply}>
              اعمال
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
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
    const entries = Object.entries(columnFilters).filter(([, value]) => isFilterActive(value));
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
                      <span className={`nabz-order-status nabz-order-status--${getOrderDisplayStatusKind(order)}`}>
                        {getOrderDisplayStatus(order)}
                      </span>
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
