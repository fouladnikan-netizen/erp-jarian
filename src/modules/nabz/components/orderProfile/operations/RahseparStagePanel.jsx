import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { getFulfilledPurchaseRows } from '../../../shippingService';
import { isOrderQcComplete } from '../../../qcInspectionConfig';
import { getOrderOperationalPhase } from '../../../phase2Service';
import {
  assignDriverToItems,
  buildSooratBarPayloadForAssignment,
  confirmItemsReady,
  finalizeRahseparOrder,
  getAllLoadItems,
  LOAD_ITEM_STATUS,
  LOAD_ITEM_STATUS_LABEL,
  registerItemScaleWeight,
  updateItemScaleWeight,
} from '../../../rahseparLoadingService';
import PrintableSooratBar from './PrintableSooratBar';
import './RahseparStagePanel.css';

export function computeIsQcComplete(order) {
  return isOrderQcComplete(order, getFulfilledPurchaseRows(order));
}

export function getSelectedRahseparLines(lines) {
  return (lines || []).filter((line) => line.selected);
}

function formatFaNumber(value) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('fa-IR');
}

const PRODUCT_ROW_STYLE = [
  'display: flex !important',
  'flex-direction: row !important',
  'align-items: center !important',
  'gap: 8px !important',
  'white-space: nowrap !important',
  'width: 100% !important',
  'min-width: 0 !important',
  'background: transparent !important',
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

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrintPackingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9V3h12v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="6" y="14" width="12" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function StatusBadge({ status, awaitingReadyConfirm = false }) {
  const tone = status === LOAD_ITEM_STATUS.LOADING
    ? 'is-loading'
    : status === LOAD_ITEM_STATUS.DISPATCHED
      ? 'is-dispatched'
      : status === LOAD_ITEM_STATUS.PREPARING
        ? (awaitingReadyConfirm ? 'is-awaiting' : 'is-preparing')
        : 'is-ready';
  return (
    <span className={`rahsepar-stage__status ${tone}`}>
      {LOAD_ITEM_STATUS_LABEL[status] || 'آماده'}
    </span>
  );
}

function AssignDriverModal({ open, selectedCount, onClose, onConfirm, onSendSms }) {
  const [driverName, setDriverName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [freightFare, setFreightFare] = useState('');
  const [assigned, setAssigned] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDriverName('');
    setLicensePlate('');
    setPhone('');
    setNationalId('');
    setFreightFare('');
    setAssigned(false);
    setSmsSent(false);
  }, [open]);

  if (!open) return null;

  const payload = { driverName, licensePlate, phone, nationalId, freightFare };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (assigned) return;
    const ok = onConfirm?.(payload);
    if (ok) setAssigned(true);
  };

  const handleSendSms = () => {
    if (!assigned) return;
    onSendSms?.(payload);
    setSmsSent(true);
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
        aria-labelledby="rahsepar-assign-title"
      >
        <header className="rahsepar-dispatch-modal__header">
          <div>
            <h3 id="rahsepar-assign-title" className="rahsepar-dispatch-modal__title">
              تخصیص راننده
            </h3>
            <p className="rahsepar-dispatch-modal__subtitle">
              {assigned
                ? 'تخصیص ذخیره شد — در صورت نیاز پیامک بفرستید'
                : (
                  <>
                    {selectedCount.toLocaleString('fa-IR')}
                    {' '}
                    قلم انتخاب‌شده — ابتدا تخصیص، سپس پیامک
                  </>
                )}
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
          {assigned ? (
            <div className="rahsepar-dispatch-modal__success" role="status">
              راننده در سیستم ثبت شد. حالا می‌توانید پیامک بفرستید یا فرم را ببندید.
            </div>
          ) : null}

          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">نام راننده</span>
            <input
              type="text"
              className="rahsepar-stage__input font-meem"
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              placeholder="نام و نام خانوادگی"
              autoComplete="off"
              autoFocus={!assigned}
              readOnly={assigned}
              disabled={assigned}
            />
          </label>
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">شماره ملی راننده</span>
            <input
              type="text"
              inputMode="numeric"
              className="rahsepar-stage__input font-yekan"
              value={nationalId}
              onChange={(event) => setNationalId(event.target.value)}
              placeholder="کد ملی ۱۰ رقمی"
              autoComplete="off"
              readOnly={assigned}
              disabled={assigned}
            />
          </label>
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">شماره پلاک</span>
            <input
              type="text"
              className="rahsepar-stage__input font-yekan"
              value={licensePlate}
              onChange={(event) => setLicensePlate(event.target.value)}
              placeholder="مثلاً ۱۲ب۳۴۵ ایران ۶۷"
              autoComplete="off"
              readOnly={assigned}
              disabled={assigned}
            />
          </label>
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">شماره تماس</span>
            <input
              type="tel"
              className="rahsepar-stage__input font-yekan"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="۰۹۱۲…"
              autoComplete="off"
              readOnly={assigned}
              disabled={assigned}
            />
          </label>
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">کرایه</span>
            <input
              type="text"
              inputMode="decimal"
              className="rahsepar-stage__input font-yekan"
              value={freightFare}
              onChange={(event) => setFreightFare(event.target.value)}
              placeholder="ریال"
              autoComplete="off"
              readOnly={assigned}
              disabled={assigned}
            />
          </label>

          <footer className="rahsepar-dispatch-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>
              {assigned ? 'بستن' : 'انصراف'}
            </button>
            <button
              type="button"
              className="btn btn--outline rahsepar-dispatch-modal__sms-btn"
              onClick={handleSendSms}
              disabled={!assigned}
              title={assigned ? undefined : 'ابتدا تخصیص را تأیید کنید'}
            >
              {smsSent ? 'پیامک ارسال شد' : 'ارسال پیامک'}
            </button>
            {!assigned ? (
              <button type="submit" className="btn btn--primary">
                تأیید تخصیص
              </button>
            ) : null}
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
  readOnly = false,
}) {
  const loadItems = useMemo(() => getAllLoadItems(order), [order]);
  const readyItems = useMemo(
    () => loadItems.filter((item) => item.status === LOAD_ITEM_STATUS.READY),
    [loadItems],
  );
  const preparingItems = useMemo(
    () => loadItems.filter((item) => item.status === LOAD_ITEM_STATUS.PREPARING),
    [loadItems],
  );
  const awaitingConfirmItems = useMemo(
    () => loadItems.filter((item) => item.awaitingReadyConfirm),
    [loadItems],
  );
  const readyIds = useMemo(() => readyItems.map((item) => item.id), [readyItems]);
  const awaitingConfirmIds = useMemo(
    () => awaitingConfirmItems.map((item) => item.id),
    [awaitingConfirmItems],
  );
  const loadingIds = useMemo(
    () => loadItems
      .filter((item) => item.status === LOAD_ITEM_STATUS.LOADING)
      .map((item) => item.id),
    [loadItems],
  );
  const preparingCount = preparingItems.length;
  const readyCount = readyItems.length;
  const loadingCount = loadingIds.length;
  const dispatchedCount = loadItems.filter(
    (item) => item.status === LOAD_ITEM_STATUS.DISPATCHED,
  ).length;
  const allDispatched = loadItems.length > 0
    && preparingCount === 0
    && readyCount === 0
    && loadingCount === 0;

  const [selectedIds, setSelectedIds] = useState([]);
  const [draftWeights, setDraftWeights] = useState({});
  const [draftFees, setDraftFees] = useState({});
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [editingScaleIds, setEditingScaleIds] = useState(() => new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [printJob, setPrintJob] = useState(null);
  const toastTimerRef = useRef(null);
  const notifiedDeliveryKeyRef = useRef('');

  const selectedCount = selectedIds.length;
  const canAssign = selectedCount > 0;
  const allReadySelected = readyIds.length > 0
    && readyIds.every((id) => selectedIds.includes(id));
  const someReadySelected = selectedCount > 0 && !allReadySelected;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => readyIds.includes(id)));
  }, [readyIds]);

  useEffect(() => {
    setDraftWeights((prev) => {
      const next = {};
      loadingIds.forEach((id) => {
        if (prev[id] != null && prev[id] !== '') next[id] = prev[id];
      });
      return next;
    });
    setDraftFees((prev) => {
      const next = {};
      loadingIds.forEach((id) => {
        if (prev[id] != null && prev[id] !== '') next[id] = prev[id];
      });
      return next;
    });
  }, [loadingIds]);

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 3200);
  };

  // نوتیفیکیشن کاشف وقتی زمان تحویل بار فرا رسیده
  useEffect(() => {
    if (!awaitingConfirmIds.length) {
      notifiedDeliveryKeyRef.current = '';
      return;
    }
    const key = awaitingConfirmIds.slice().sort().join('|');
    if (notifiedDeliveryKeyRef.current === key) return;
    notifiedDeliveryKeyRef.current = key;
    const countLabel = awaitingConfirmIds.length.toLocaleString('fa-IR');
    showToast(`کاشف پوشش: زمان تحویل ${countLabel} قلم فرا رسیده — تأیید آمادگی لازم است`);
  }, [awaitingConfirmIds]);

  const toggleItem = (id, status) => {
    if (readOnly) return;
    if (status !== LOAD_ITEM_STATUS.READY) return;
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const toggleSelectAllReady = () => {
    if (readOnly) return;
    setSelectedIds(allReadySelected ? [] : [...readyIds]);
  };

  const toggleHistory = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmReady = (itemIds) => {
    if (readOnly) return;
    const result = confirmItemsReady(order, itemIds);
    if (!result.accepted) {
      showToast(result.reason || 'امکان تأیید آمادگی وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    showToast('وضعیت به «آماده» تغییر کرد');
  };

  const handleAssignConfirm = (payload) => {
    if (readOnly) return false;
    const result = assignDriverToItems(order, {
      selectedItemIds: selectedIds,
      ...payload,
    });
    if (!result.accepted) {
      showToast(result.reason || 'امکان تخصیص راننده وجود ندارد.');
      return false;
    }
    onUpdateOrder?.(() => result.order);
    setSelectedIds([]);
    // فرم باز می‌ماند تا کاربر بتواند پیامک بفرستد
    showToast('راننده تخصیص داده شد — می‌توانید پیامک بفرستید');
    return true;
  };

  const handleAssignSms = (payload) => {
    const driver = String(payload?.driverName || '').trim();
    const plate = String(payload?.licensePlate || '').trim();
    const phone = String(payload?.phone || '').trim();
    const nationalId = String(payload?.nationalId || '').trim();
    const fare = String(payload?.freightFare || '').trim();
    if (!driver || !plate || !phone || !nationalId || !fare) {
      showToast('اطلاعات راننده برای پیامک ناقص است.');
      return;
    }
    // Placeholder for future SMS gateway — فقط بعد از تخصیص موفق فراخوانی می‌شود
    showToast('ارسال پیامک آماده اتصال به سامانه پیامکی است.');
  };

  const commitScaleWeight = (itemId, rawWeight, rawFee) => {
    if (readOnly) return;
    const weightValue = String(rawWeight ?? draftWeights[itemId] ?? '').trim();
    const feeValue = String(rawFee ?? draftFees[itemId] ?? '').trim();
    if (!weightValue) {
      showToast('ابتدا وزن باسکول را وارد کنید.');
      return;
    }
    if (!feeValue) {
      showToast('هزینه بارگیری را هم وارد کنید، سپس ثبت کنید.');
      return;
    }
    const result = registerItemScaleWeight(order, {
      itemId,
      scaleWeight: weightValue,
      loadingFee: feeValue,
    });
    if (!result.accepted) {
      showToast(result.reason || 'امکان ثبت باسکول وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    setDraftWeights((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setDraftFees((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    showToast('باسکول و هزینه بارگیری ثبت شد — وضعیت: ارسال‌شده');
  };

  const saveEditedScale = (item, rawWeight, rawFee) => {
    if (readOnly) return;
    const weightValue = String(
      rawWeight ?? draftWeights[item.id] ?? item.scaleWeight ?? '',
    ).trim();
    const feeValue = String(
      rawFee ?? draftFees[item.id] ?? item.loadingFee ?? '',
    ).trim();
    const result = updateItemScaleWeight(order, {
      itemId: item.id,
      scaleWeight: weightValue,
      loadingFee: feeValue,
    });
    if (!result.accepted) {
      showToast(result.reason || 'امکان ویرایش باسکول وجود ندارد.');
      return;
    }
    setDraftWeights((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setDraftFees((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setEditingScaleIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    if (result.unchanged) return;
    onUpdateOrder?.(() => result.order);
    showToast('وزن باسکول ویرایش شد');
  };

  const startEditScale = (item) => {
    setDraftWeights((prev) => ({
      ...prev,
      [item.id]: item.scaleWeight != null ? String(item.scaleWeight) : '',
    }));
    setDraftFees((prev) => ({
      ...prev,
      [item.id]: item.loadingFee != null ? String(item.loadingFee) : '',
    }));
    setEditingScaleIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-rahsepar-edit-weight="${item.id}"]`)?.focus?.();
    });
  };

  const cancelEditScale = (itemId) => {
    setDraftWeights((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setDraftFees((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setEditingScaleIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const focusFeeInput = (itemId) => {
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-rahsepar-fee="${itemId}"]`)?.focus?.();
    });
  };

  const weightDraftValue = (item) => (
    draftWeights[item.id] !== undefined
      ? draftWeights[item.id]
      : (item.scaleWeight != null ? String(item.scaleWeight) : '')
  );

  const feeDraftValue = (item) => (
    draftFees[item.id] !== undefined
      ? draftFees[item.id]
      : (item.loadingFee != null ? String(item.loadingFee) : '')
  );

  const handleFinalize = () => {
    if (readOnly) return;
    const result = finalizeRahseparOrder(order);
    if (!result.accepted) {
      window.alert(result.reason || 'امکان نهایی‌سازی وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    onOperationalPhaseChange?.(getOrderOperationalPhase(result.order));
  };

  /**
   * صدور صورت‌بار فقط برای اقلام همان تخصیص راننده.
   * چاپ را مستقیم از کلیک اجرا می‌کنیم (نه useEffect) تا StrictMode تایمر را لغو نکند.
   */
  const handlePrintPackingList = (assignmentId) => {
    const payload = buildSooratBarPayloadForAssignment(order, assignmentId);
    if (!payload.accepted) {
      showToast(payload.reason || 'امکان صدور صورت‌بار وجود ندارد.');
      return;
    }

    flushSync(() => {
      setPrintJob({
        lines: payload.lines,
        logistics: payload.logistics,
        meta: payload.meta,
      });
    });

    document.body.classList.add('rahsepar-printing');
    window.requestAnimationFrame(() => {
      try {
        window.print();
      } finally {
        document.body.classList.remove('rahsepar-printing');
        setPrintJob(null);
      }
    });
  };

  return (
    <section className={`rahsepar-stage font-meem${compact ? ' rahsepar-stage--compact' : ''}${readOnly ? ' is-readonly' : ''}`}>
      <header className="rahsepar-stage__head">
        <div>
          <h2 className="rahsepar-stage__title">رهسپار — بارگیری و ارسال</h2>
          <p className="rahsepar-stage__subtitle">
            یک جدول واحد — تخصیص راننده، سپس ورود وزن باسکول در همان ردیف
          </p>
          {readOnly ? (
            <p className="rahsepar-stage__readonly-hint" role="status">
              🔒 سفارش بایگانی شده — فقط خواندنی
            </p>
          ) : null}
        </div>
        <div className="rahsepar-stage__head-meta">
          <span className="rahsepar-stage__pill">
            آماده‌سازی:
            {' '}
            <strong className="font-yekan">{preparingCount.toLocaleString('fa-IR')}</strong>
          </span>
          <span className="rahsepar-stage__pill">
            آماده:
            {' '}
            <strong className="font-yekan">{readyCount.toLocaleString('fa-IR')}</strong>
          </span>
          <span className="rahsepar-stage__pill">
            بارگیری:
            {' '}
            <strong className="font-yekan">{loadingCount.toLocaleString('fa-IR')}</strong>
          </span>
          <span className="rahsepar-stage__pill">
            ارسال‌شده:
            {' '}
            <strong className="font-yekan">{dispatchedCount.toLocaleString('fa-IR')}</strong>
          </span>
        </div>
      </header>

      {awaitingConfirmItems.length > 0 && !readOnly ? (
        <div className="rahsepar-stage__ready-banner" role="status">
          <div className="rahsepar-stage__ready-banner-text">
            <strong>اعلان کاشف پوشش</strong>
            <p>
              زمان تحویل بار برای
              {' '}
              <span className="font-yekan">{awaitingConfirmItems.length.toLocaleString('fa-IR')}</span>
              {' '}
              قلم فرا رسیده است. پس از تأیید، وضعیت به «آماده» تغییر می‌کند.
            </p>
          </div>
          <button
            type="button"
            className="rahsepar-stage__ready-confirm-btn"
            onClick={() => handleConfirmReady(awaitingConfirmIds)}
          >
            تأیید آمادگی همه
          </button>
        </div>
      ) : null}

      {allDispatched && !readOnly ? (
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
      ) : !readOnly ? (
        <div className="rahsepar-stage__toolbar">
          <button
            type="button"
            className="rahsepar-stage__dispatch-btn"
            disabled={!canAssign}
            onClick={() => setAssignOpen(true)}
          >
            تخصیص راننده
            {canAssign ? (
              <span className="font-yekan">
                (
                {selectedCount.toLocaleString('fa-IR')}
                )
              </span>
            ) : null}
          </button>
          <p className="rahsepar-stage__toolbar-hint">
            اقلام آماده را انتخاب و راننده تخصیص دهید؛ وزن باسکول و هزینه بارگیری را وارد کنید، سپس با Enter یا دکمه ثبت نهایی کنید.
          </p>
        </div>
      ) : null}

      <div className="rahsepar-stage__table-wrap">
        <table className="rahsepar-stage__table jarian-table">
          <thead>
            <tr>
              <th className="rahsepar-stage__col--select" scope="col">
                <input
                  type="checkbox"
                  className="rahsepar-stage__checkbox"
                  checked={allReadySelected && readyIds.length > 0}
                  ref={(el) => {
                    if (el) el.indeterminate = someReadySelected;
                  }}
                  onChange={toggleSelectAllReady}
                  disabled={readyIds.length === 0 || allDispatched}
                  aria-label="انتخاب همه آماده"
                />
              </th>
              <th scope="col">ردیف</th>
              <th scope="col">شرح کالا</th>
              <th scope="col">مقدار</th>
              <th scope="col">واحد</th>
              <th scope="col">نام انبار</th>
              <th scope="col">حواله انبار</th>
              <th scope="col">وزن باسکول</th>
              <th scope="col">هزینه بارگیری</th>
              <th scope="col">وضعیت</th>
              <th scope="col">جزئیات</th>
            </tr>
          </thead>
          <tbody>
            {loadItems.length === 0 ? (
              <tr>
                <td colSpan={11} className="rahsepar-stage__empty">
                  قلم خریدشده‌ای برای بارگیری وجود ندارد.
                </td>
              </tr>
            ) : (
              loadItems.map((item, index) => {
                const isPreparing = item.status === LOAD_ITEM_STATUS.PREPARING;
                const isReady = item.status === LOAD_ITEM_STATUS.READY;
                const isLoading = item.status === LOAD_ITEM_STATUS.LOADING;
                const isDispatched = item.status === LOAD_ITEM_STATUS.DISPATCHED;
                const isEditingScale = isDispatched && editingScaleIds.has(item.id);
                const checked = selectedIds.includes(item.id);
                const expanded = expandedIds.has(item.id);
                const assignment = item.assignment;
                const dispatch = item.dispatch;

                return (
                  <Fragment key={item.id || `rahsepar-row-${index}`}>
                    <tr
                      className={[
                        'rahsepar-stage__data-row',
                        index % 2 === 0 ? 'is-zebra-odd' : 'is-zebra-even',
                        isPreparing ? 'is-preparing' : '',
                        isReady ? 'is-ready' : '',
                        isLoading ? 'is-loading' : '',
                        isDispatched ? 'is-dispatched' : '',
                        isEditingScale ? 'is-editing-scale' : '',
                        checked ? 'is-selected' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <td className="rahsepar-stage__col--select">
                        {isReady ? (
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
                      <td className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>
                      <td className="jarian-td-product">
                        <RahseparProductInline name={item.name} description={item.description} />
                      </td>
                      <td className="font-yekan">{formatFaNumber(item.qty)}</td>
                      <td>{item.unit || '—'}</td>
                      <td>{item.warehouseName || '—'}</td>
                      <td className="font-yekan">{item.warehouseVoucherCode || '—'}</td>
                      <td>
                        {isLoading || isEditingScale ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            data-rahsepar-edit-weight={isEditingScale ? item.id : undefined}
                            className={`rahsepar-stage__cell-input font-yekan ${
                              isEditingScale
                                ? 'rahsepar-stage__cell-input--editable'
                                : 'rahsepar-stage__cell-input--active'
                            }`}
                            value={isEditingScale ? weightDraftValue(item) : (draftWeights[item.id] ?? '')}
                            onChange={(event) => {
                              const value = event.target.value;
                              setDraftWeights((prev) => ({ ...prev, [item.id]: value }));
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Escape' && isEditingScale) {
                                event.preventDefault();
                                cancelEditScale(item.id);
                                return;
                              }
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                if (isEditingScale) {
                                  focusFeeInput(item.id);
                                  return;
                                }
                                focusFeeInput(item.id);
                              }
                            }}
                            placeholder="کیلوگرم"
                            aria-label={`${isEditingScale ? 'ویرایش' : ''} وزن باسکول ${item.name}`.trim()}
                          />
                        ) : (
                          <span className="font-yekan">{formatFaNumber(item.scaleWeight)}</span>
                        )}
                      </td>
                      <td>
                        {isLoading ? (
                          <div className="rahsepar-stage__fee-cell">
                            <input
                              type="text"
                              inputMode="decimal"
                              data-rahsepar-fee={item.id}
                              className="rahsepar-stage__cell-input rahsepar-stage__cell-input--active font-yekan"
                              value={draftFees[item.id] ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setDraftFees((prev) => ({ ...prev, [item.id]: value }));
                              }}
                              onBlur={() => {
                                const weightValue = String(draftWeights[item.id] ?? '').trim();
                                const feeValue = String(draftFees[item.id] ?? '').trim();
                                if (!weightValue || !feeValue) return;
                                commitScaleWeight(item.id, weightValue, feeValue);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  commitScaleWeight(
                                    item.id,
                                    draftWeights[item.id],
                                    draftFees[item.id],
                                  );
                                }
                              }}
                              placeholder="ریال"
                              aria-label={`هزینه بارگیری ${item.name}`}
                            />
                            {(String(draftWeights[item.id] ?? '').trim()
                              && String(draftFees[item.id] ?? '').trim()) ? (
                              <button
                                type="button"
                                className="rahsepar-stage__commit-btn"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => commitScaleWeight(
                                  item.id,
                                  draftWeights[item.id],
                                  draftFees[item.id],
                                )}
                                aria-label="ثبت وزن و هزینه بارگیری"
                                title="ثبت"
                              >
                                <CheckIcon />
                              </button>
                            ) : null}
                          </div>
                        ) : isEditingScale ? (
                          <div className="rahsepar-stage__fee-cell">
                            <input
                              type="text"
                              inputMode="decimal"
                              data-rahsepar-fee={item.id}
                              className="rahsepar-stage__cell-input rahsepar-stage__cell-input--editable font-yekan"
                              value={feeDraftValue(item)}
                              onChange={(event) => {
                                const value = event.target.value;
                                setDraftFees((prev) => ({ ...prev, [item.id]: value }));
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  cancelEditScale(item.id);
                                  return;
                                }
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  saveEditedScale(
                                    item,
                                    weightDraftValue(item),
                                    feeDraftValue(item),
                                  );
                                }
                              }}
                              placeholder="ریال"
                              aria-label={`ویرایش هزینه بارگیری ${item.name}`}
                            />
                            <button
                              type="button"
                              className="rahsepar-stage__commit-btn"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => saveEditedScale(
                                item,
                                weightDraftValue(item),
                                feeDraftValue(item),
                              )}
                              aria-label="ذخیره ویرایش باسکول"
                              title="ذخیره"
                            >
                              <CheckIcon />
                            </button>
                          </div>
                        ) : (
                          <span className="font-yekan">{formatFaNumber(item.loadingFee)}</span>
                        )}
                      </td>
                      <td>
                        <div className="rahsepar-stage__status-cell">
                          <StatusBadge
                            status={item.status}
                            awaitingReadyConfirm={item.awaitingReadyConfirm}
                          />
                          {item.awaitingReadyConfirm ? (
                            <button
                              type="button"
                              className="rahsepar-stage__row-ready-btn"
                              onClick={() => handleConfirmReady([item.id])}
                            >
                              تأیید آمادگی
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        {isDispatched ? (
                          <div className="rahsepar-stage__details-actions">
                            <button
                              type="button"
                              className={`rahsepar-stage__history-btn${expanded ? ' is-open' : ''}`}
                              onClick={() => toggleHistory(item.id)}
                              aria-expanded={expanded}
                              aria-label={expanded ? 'بستن جزئیات' : 'نمایش جزئیات'}
                              title={expanded ? 'بستن جزئیات' : 'نمایش جزئیات'}
                            >
                              <ChevronDownIcon />
                            </button>
                            <button
                              type="button"
                              className={`rahsepar-stage__edit-btn${isEditingScale ? ' is-active' : ''}`}
                              onClick={() => (
                                isEditingScale
                                  ? cancelEditScale(item.id)
                                  : startEditScale(item)
                              )}
                              aria-label={isEditingScale ? 'بستن ویرایش' : 'ویرایش وزن باسکول'}
                              title={isEditingScale ? 'بستن ویرایش' : 'ویرایش وزن باسکول'}
                            >
                              <PencilIcon />
                            </button>
                            {assignment?.assignmentId || dispatch?.sessionId ? (
                              <button
                                type="button"
                                className="rahsepar-stage__print-btn"
                                onClick={() => handlePrintPackingList(
                                  assignment?.assignmentId || dispatch?.sessionId,
                                )}
                                aria-label="صدور صورت‌بار این راننده"
                                title="صدور صورت‌بار"
                              >
                                <PrintPackingIcon />
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="rahsepar-stage__history-muted">—</span>
                        )}
                      </td>
                    </tr>
                    {isDispatched && expanded && (dispatch || assignment) ? (
                      <tr className="rahsepar-stage__history-row">
                        <td colSpan={11}>
                          <div className="rahsepar-stage__history-detail">
                            <div>
                              <span className="rahsepar-stage__history-label">ارسال</span>
                              <strong className="font-yekan">
                                {assignment?.dispatchedAt || dispatch?.recordedAt || '—'}
                              </strong>
                            </div>
                            <div>
                              <span className="rahsepar-stage__history-label">راننده</span>
                              <strong>{assignment?.driverName || dispatch?.driverName || '—'}</strong>
                            </div>
                            <div>
                              <span className="rahsepar-stage__history-label">پلاک</span>
                              <strong className="font-yekan">
                                {assignment?.licensePlate || dispatch?.licensePlate || '—'}
                              </strong>
                            </div>
                            <div>
                              <span className="rahsepar-stage__history-label">تماس</span>
                              <strong className="font-yekan">
                                {assignment?.phone || '—'}
                              </strong>
                            </div>
                            <div>
                              <span className="rahsepar-stage__history-label">شماره ملی</span>
                              <strong className="font-yekan">
                                {assignment?.nationalId || '—'}
                              </strong>
                            </div>
                            <div>
                              <span className="rahsepar-stage__history-label">کرایه</span>
                              <strong className="font-yekan">
                                {formatFaNumber(assignment?.freightFare)}
                              </strong>
                            </div>
                            {(assignment?.assignmentId || dispatch?.sessionId) ? (
                              <div className="rahsepar-stage__history-detail--action">
                                <button
                                  type="button"
                                  className="rahsepar-stage__sooratbar-btn"
                                  onClick={() => handlePrintPackingList(
                                    assignment?.assignmentId || dispatch?.sessionId,
                                  )}
                                >
                                  <PrintPackingIcon />
                                  صدور صورت‌بار
                                </button>
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

      <AssignDriverModal
        open={assignOpen}
        selectedCount={selectedCount}
        onClose={() => setAssignOpen(false)}
        onConfirm={handleAssignConfirm}
        onSendSms={handleAssignSms}
      />

      {printJob ? (
        <PrintableSooratBar
          order={order}
          lines={printJob.lines}
          logistics={printJob.logistics}
          meta={printJob.meta}
        />
      ) : null}

      {toast ? (
        <div className="rahsepar-stage__toast" role="status">
          {toast}
        </div>
      ) : null}
    </section>
  );
}
