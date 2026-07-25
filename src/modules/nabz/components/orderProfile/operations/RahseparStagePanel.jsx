import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { getFulfilledPurchaseRows } from '../../../shippingService';
import { isOrderQcComplete } from '../../../qcInspectionConfig';
import { getOrderOperationalPhase } from '../../../phase2Service';
import {
  finalizeRahseparOrder,
  getAllLoadItems,
  LOAD_ITEM_STATUS,
  recordLoadingSession,
} from '../../../rahseparLoadingService';
import './RahseparStagePanel.css';

export function computeIsQcComplete(order) {
  return isOrderQcComplete(order, getFulfilledPurchaseRows(order));
}

export function getSelectedRahseparLines(lines) {
  return (lines || []).filter((line) => line.selected);
}

function formatFaNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('fa-IR');
}

/** Force horizontal name | description — bypasses parent CSS inheritance */
const PRODUCT_ROW_STYLE = [
  'display: flex !important',
  'flex-direction: row !important',
  'align-items: center !important',
  'gap: 8px !important',
  'white-space: nowrap !important',
  'width: 100% !important',
  'min-width: 0 !important',
].join('; ');

const PRODUCT_NAME_STYLE = [
  'font-size: 14px !important',
  'font-weight: bold !important',
  'color: #000000 !important',
  'white-space: nowrap !important',
  'flex-shrink: 0 !important',
].join('; ');

const PRODUCT_SEP_STYLE = [
  'color: #B8BFCA !important',
  'font-size: 14px !important',
  'flex-shrink: 0 !important',
].join('; ');

const PRODUCT_DESC_STYLE = [
  'font-size: 12px !important',
  'color: #666666 !important',
  'white-space: nowrap !important',
  'overflow: hidden !important',
  'text-overflow: ellipsis !important',
  'min-width: 0 !important',
].join('; ');

const PRODUCT_TD_STYLE = [
  'display: flex !important',
  'align-items: center !important',
  'justify-content: flex-start !important',
  'text-align: right !important',
  'vertical-align: middle !important',
  'white-space: nowrap !important',
].join('; ');

function applyForcedStyle(node, cssText) {
  if (node) node.setAttribute('style', cssText);
}

function RahseparProductInline({ name, description }) {
  const productName = String(name || '').trim() || '—';
  const detail = String(description || '').trim();

  return (
    <div ref={(node) => applyForcedStyle(node, PRODUCT_ROW_STYLE)}>
      <span ref={(node) => applyForcedStyle(node, PRODUCT_NAME_STYLE)}>
        {productName}
      </span>
      {detail ? (
        <>
          <span ref={(node) => applyForcedStyle(node, PRODUCT_SEP_STYLE)}>|</span>
          <span ref={(node) => applyForcedStyle(node, PRODUCT_DESC_STYLE)} title={detail}>
            {detail}
          </span>
        </>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }) {
  const isPending = status === LOAD_ITEM_STATUS.PENDING;
  return (
    <span className={`rahsepar-stage__status${isPending ? ' is-pending' : ' is-dispatched'}`}>
      {isPending ? 'در انتظار' : 'ارسال‌شده'}
    </span>
  );
}

function DispatchModal({
  open,
  selectedCount,
  defaultBatchWeight,
  onClose,
  onConfirm,
}) {
  const [driverName, setDriverName] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [batchWeight, setBatchWeight] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setDriverName('');
    setVehicle('');
    setBatchWeight(defaultBatchWeight ? String(defaultBatchWeight) : '');
    setDescription('');
  }, [open, defaultBatchWeight]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onConfirm?.({
      driverName,
      licensePlate: vehicle,
      vehicle,
      batchWeight,
      description,
    });
  };

  return (
    <div className="rahsepar-dispatch-modal" role="presentation">
      <button
        type="button"
        className="rahsepar-dispatch-modal__backdrop"
        aria-label="بستن"
        onClick={onClose}
      />
      <div
        className="rahsepar-dispatch-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rahsepar-dispatch-title"
      >
        <header className="rahsepar-dispatch-modal__header">
          <div>
            <h3 id="rahsepar-dispatch-title" className="rahsepar-dispatch-modal__title">
              ارسال انتخاب‌شده
            </h3>
            <p className="rahsepar-dispatch-modal__subtitle">
              {selectedCount.toLocaleString('fa-IR')}
              {' '}
              قلم انتخاب شده — راننده، وسیله و وزن نوبت را وارد کنید
            </p>
          </div>
          <button
            type="button"
            className="rahsepar-dispatch-modal__close"
            onClick={onClose}
            aria-label="بستن"
          >
            ×
          </button>
        </header>

        <form className="rahsepar-dispatch-modal__form" onSubmit={handleSubmit}>
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">نام راننده</span>
            <input
              type="text"
              className="rahsepar-stage__input font-meem"
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              placeholder="نام و نام خانوادگی"
              autoComplete="off"
              autoFocus
            />
          </label>
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">وسیله / پلاک</span>
            <input
              type="text"
              className="rahsepar-stage__input font-yekan"
              value={vehicle}
              onChange={(event) => setVehicle(event.target.value)}
              placeholder="مثلاً ۱۲ب۳۴۵ ایران ۶۷"
              autoComplete="off"
            />
          </label>
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">وزن نوبت</span>
            <input
              type="text"
              inputMode="decimal"
              className="rahsepar-stage__input font-yekan"
              value={batchWeight}
              onChange={(event) => setBatchWeight(event.target.value)}
              placeholder="کیلوگرم"
              autoComplete="off"
            />
          </label>
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">توضیح (اختیاری)</span>
            <input
              type="text"
              className="rahsepar-stage__input font-meem"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="یادداشت کوتاه"
              autoComplete="off"
            />
          </label>

          <footer className="rahsepar-dispatch-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>
              انصراف
            </button>
            <button type="submit" className="btn btn--primary">
              تأیید ارسال
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default function RahseparStagePanel({
  order,
  onUpdateOrder,
  onOperationalPhaseChange,
  compact = false,
}) {
  const loadItems = useMemo(() => getAllLoadItems(order), [order]);
  const pendingItems = useMemo(
    () => loadItems.filter((item) => item.status === LOAD_ITEM_STATUS.PENDING),
    [loadItems],
  );
  const pendingIds = useMemo(() => pendingItems.map((item) => item.id), [pendingItems]);
  const pendingCount = pendingItems.length;
  const allDispatched = loadItems.length > 0 && pendingCount === 0;

  const [selectedIds, setSelectedIds] = useState([]);
  const [scaleWeights, setScaleWeights] = useState({});
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);

  const selectedPendingItems = useMemo(
    () => pendingItems
      .filter((item) => selectedIds.includes(item.id))
      .map((item) => ({
        ...item,
        scaleWeight: scaleWeights[item.id] ?? '',
      })),
    [pendingItems, selectedIds, scaleWeights],
  );

  const selectedCount = selectedPendingItems.length;
  const canDispatch = selectedCount > 0;
  const allPendingSelected = pendingIds.length > 0
    && pendingIds.every((id) => selectedIds.includes(id));
  const somePendingSelected = selectedCount > 0 && !allPendingSelected;

  const defaultBatchWeight = useMemo(() => {
    const sum = selectedPendingItems.reduce((acc, item) => {
      const num = Number(String(item.scaleWeight || '').replace(/,/g, ''));
      return Number.isFinite(num) && num > 0 ? acc + num : acc;
    }, 0);
    return sum > 0 ? sum : '';
  }, [selectedPendingItems]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => pendingIds.includes(id)));
    setScaleWeights((prev) => {
      const next = {};
      pendingIds.forEach((id) => {
        if (prev[id] != null && prev[id] !== '') next[id] = prev[id];
      });
      return next;
    });
  }, [pendingIds]);

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2800);
  };

  const toggleItem = (id, status) => {
    if (status !== LOAD_ITEM_STATUS.PENDING) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        setScaleWeights((weights) => {
          const next = { ...weights };
          delete next[id];
          return next;
        });
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds([...pendingIds]);
  };

  const updateScaleWeight = (id, value) => {
    setScaleWeights((prev) => ({ ...prev, [id]: value }));
  };

  const toggleHistory = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDispatchModal = () => {
    if (!canDispatch) return;
    const missingWeight = selectedPendingItems.find((item) => {
      const num = Number(String(item.scaleWeight || '').replace(/,/g, ''));
      return !item.scaleWeight || !Number.isFinite(num) || num <= 0;
    });
    if (missingWeight) {
      showToast(`وزن باسکول «${missingWeight.name}» را وارد کنید.`);
      return;
    }
    setDispatchOpen(true);
  };

  const handleConfirmDispatch = (payload) => {
    const result = recordLoadingSession(order, {
      selectedItems: selectedPendingItems,
      ...payload,
    });
    if (!result.accepted) {
      showToast(result.reason || 'امکان ارسال وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    setSelectedIds([]);
    setScaleWeights({});
    setDispatchOpen(false);
    showToast('اقلام انتخاب‌شده ارسال شدند.');
  };

  const handleFinalize = () => {
    const result = finalizeRahseparOrder(order);
    if (!result.accepted) {
      window.alert(result.reason || 'امکان نهایی‌سازی وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    onOperationalPhaseChange?.(getOrderOperationalPhase(result.order));
  };

  return (
    <section className={`rahsepar-stage font-meem${compact ? ' rahsepar-stage--compact' : ''}`}>
      <header className="rahsepar-stage__head">
        <div>
          <h2 className="rahsepar-stage__title">رهسپار — بارگیری و ارسال</h2>
          <p className="rahsepar-stage__subtitle">
            همه اقلام در یک جدول — در انتظار یا ارسال‌شده
          </p>
        </div>
        <div className="rahsepar-stage__head-meta">
          <span className="rahsepar-stage__pill">
            در انتظار:
            {' '}
            <strong className="font-yekan">{pendingCount.toLocaleString('fa-IR')}</strong>
          </span>
          <span className="rahsepar-stage__pill">
            ارسال‌شده:
            {' '}
            <strong className="font-yekan">
              {(loadItems.length - pendingCount).toLocaleString('fa-IR')}
            </strong>
          </span>
        </div>
      </header>

      {allDispatched ? (
        <div className="rahsepar-stage__finalize-banner">
          <p className="rahsepar-stage__finalize-text">
            همه اقلام ارسال شده‌اند. می‌توانید سفارش را نهایی کنید.
          </p>
          <button
            type="button"
            className="rahsepar-stage__finalize-btn"
            onClick={handleFinalize}
          >
            نهایی‌سازی سفارش
          </button>
        </div>
      ) : (
        <div className="rahsepar-stage__toolbar">
          <button
            type="button"
            className="rahsepar-stage__dispatch-btn"
            disabled={!canDispatch}
            onClick={openDispatchModal}
          >
            ارسال انتخاب‌شده
            {canDispatch ? (
              <span className="font-yekan">
                (
                {selectedCount.toLocaleString('fa-IR')}
                )
              </span>
            ) : null}
          </button>
          <p className="rahsepar-stage__toolbar-hint">
            اقلام در انتظار را انتخاب کنید، وزن باسکول را وارد کنید، سپس ارسال کنید.
          </p>
        </div>
      )}

      <div className="rahsepar-stage__table-wrap">
        <table className="rahsepar-stage__table jarian-table">
          <thead>
            <tr>
              <th className="rahsepar-stage__col--select" scope="col">
                <input
                  type="checkbox"
                  className="rahsepar-stage__checkbox"
                  checked={allPendingSelected && pendingIds.length > 0}
                  ref={(el) => {
                    if (el) el.indeterminate = somePendingSelected;
                  }}
                  onChange={toggleSelectAllPending}
                  disabled={pendingIds.length === 0 || allDispatched}
                  aria-label="انتخاب همه در انتظار"
                />
              </th>
              <th scope="col">ردیف</th>
              <th scope="col">شرح کالا</th>
              <th scope="col">مقدار</th>
              <th scope="col">واحد</th>
              <th scope="col">وزن پیش‌فاکتور</th>
              <th scope="col">وزن باسکول</th>
              <th scope="col">وضعیت</th>
              <th scope="col">سوابق</th>
            </tr>
          </thead>
          <tbody>
            {loadItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="rahsepar-stage__empty">
                  قلم خریدشده‌ای برای بارگیری وجود ندارد.
                </td>
              </tr>
            ) : (
              loadItems.map((item, index) => {
                const isPending = item.status === LOAD_ITEM_STATUS.PENDING;
                const checked = selectedIds.includes(item.id);
                const expanded = expandedIds.has(item.id);
                const dispatch = item.dispatch;

                return (
                  <Fragment key={item.id}>
                    <tr
                      className={[
                        isPending ? 'is-pending' : 'is-dispatched',
                        checked ? 'is-selected' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <td className="rahsepar-stage__col--select">
                        {isPending ? (
                          <input
                            type="checkbox"
                            className="rahsepar-stage__checkbox"
                            checked={checked}
                            onChange={() => toggleItem(item.id, item.status)}
                            aria-label={`انتخاب ${item.name}`}
                          />
                        ) : (
                          <span className="rahsepar-stage__check-placeholder" aria-hidden="true" />
                        )}
                      </td>
                      <td>{(index + 1).toLocaleString('fa-IR')}</td>
                      <td
                        className="jarian-td-product"
                        ref={(node) => applyForcedStyle(node, PRODUCT_TD_STYLE)}
                      >
                        <RahseparProductInline name={item.name} description={item.description} />
                      </td>
                      <td>{formatFaNumber(item.qty)}</td>
                      <td>{item.unit}</td>
                      <td>
                        <span className="font-yekan">{formatFaNumber(item.preInvoiceWeightKg)}</span>
                      </td>
                      <td>
                        {isPending ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            className="rahsepar-stage__cell-input font-yekan"
                            value={scaleWeights[item.id] ?? ''}
                            onChange={(event) => updateScaleWeight(item.id, event.target.value)}
                            placeholder="کیلوگرم"
                            aria-label={`وزن باسکول ${item.name}`}
                          />
                        ) : (
                          <span className="font-yekan">
                            {formatFaNumber(dispatch?.itemWeight ?? item.scaleWeight)}
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        {isPending ? (
                          <span className="rahsepar-stage__history-muted">—</span>
                        ) : (
                          <button
                            type="button"
                            className={`rahsepar-stage__history-btn${expanded ? ' is-open' : ''}`}
                            onClick={() => toggleHistory(item.id)}
                            aria-expanded={expanded}
                          >
                            {expanded ? 'بستن' : 'جزئیات'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {!isPending && expanded && dispatch ? (
                      <tr className="rahsepar-stage__history-row is-dispatched">
                        <td colSpan={9}>
                          <div className="rahsepar-stage__history-detail">
                            <div>
                              <span className="rahsepar-stage__history-label">تاریخ</span>
                              <strong className="font-yekan">{dispatch.recordedAt || '—'}</strong>
                            </div>
                            <div>
                              <span className="rahsepar-stage__history-label">راننده</span>
                              <strong>{dispatch.driverName || '—'}</strong>
                            </div>
                            <div>
                              <span className="rahsepar-stage__history-label">وسیله / پلاک</span>
                              <strong className="font-yekan">
                                {dispatch.licensePlate || dispatch.vehicle || '—'}
                              </strong>
                            </div>
                            <div>
                              <span className="rahsepar-stage__history-label">وزن قلم</span>
                              <strong className="font-yekan">
                                {formatFaNumber(dispatch.itemWeight)}
                              </strong>
                            </div>
                            <div>
                              <span className="rahsepar-stage__history-label">وزن نوبت</span>
                              <strong className="font-yekan">
                                {formatFaNumber(dispatch.batchWeight)}
                              </strong>
                            </div>
                            {dispatch.description ? (
                              <div className="rahsepar-stage__history-detail--wide">
                                <span className="rahsepar-stage__history-label">توضیح</span>
                                <strong>{dispatch.description}</strong>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <DispatchModal
        open={dispatchOpen}
        selectedCount={selectedCount}
        defaultBatchWeight={defaultBatchWeight}
        onClose={() => setDispatchOpen(false)}
        onConfirm={handleConfirmDispatch}
      />

      {toast ? (
        <div className="rahsepar-stage__toast" role="status">
          {toast}
        </div>
      ) : null}
    </section>
  );
}
