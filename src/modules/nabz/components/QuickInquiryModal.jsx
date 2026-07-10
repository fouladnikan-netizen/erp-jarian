import { useMemo, useState } from 'react';
import { ORDER_TABS } from '../config';
import { useOrderPipelineView } from '../hooks/useOrderPipelineView';
import { OPERATIONAL_PHASES } from '../phase2Config';
import { getOrderOperationalPhase } from '../phase2Service';
import GatewayHorizontalStepper from './orderProfile/gateway/GatewayHorizontalStepper';
import GatewayDecisionPanel from './orderProfile/gateway/GatewayDecisionPanel';
import ParvaneStagePanel from './orderProfile/operations/ParvaneStagePanel';
import TadarokStagePanel from './orderProfile/operations/TadarokStagePanel';
import TajhizStagePanel from './orderProfile/operations/TajhizStagePanel';
import { GATEWAY_PHASES } from '../gatewayConfig';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import { SUPPLY_CHANNEL_TYPES } from '../inquiryConfig';
import {
  calculateQuotingPreview,
  canCompleteOrderInquiries,
  canCompleteQuoting,
  getEmptyQuickInquiryDraft,
  getMissingTargetMessage,
  getOrderQuoting,
  getTargetInquiry,
  validateQuickInquiryDraft,
} from '../inquiryService';
import { MARGIN_MODES } from '../quotingConfig';
import { listSuppliers } from '../suppliers';
import { shouldShowPishkeshTabs, shouldShowQuotingSection } from '../orderStageService';
import { PISHKESH_MODAL_TABS } from '../proformaConfig';
import { getProformaTerms } from '../proformaService';
import {
  canViewSupplierIdentity,
  DEFAULT_SALE_TYPE,
} from '../constants';
import ProformaTab from './ProformaTab';
import QuotingReadOnlyPanel from './QuotingReadOnlyPanel';
import {
  formatMarginCellValue,
  formatPriceLine,
  InquiryCompact,
  QuotingMatrix,
} from './quickInquiryParts';
import MoneyInput from './MoneyInput';

const BASE_QUICK_TABLE_COLUMNS = [
  { key: 'row', defaultWidth: 52, resizable: false },
  { key: 'name', defaultWidth: 220 },
  { key: 'description', defaultWidth: 260 },
  { key: 'qty', defaultWidth: 72 },
  { key: 'unit', defaultWidth: 72 },
  { key: 'supply', defaultWidth: 300 },
];

const QUOTING_TABLE_COLUMNS = [
  { key: 'margin', defaultWidth: 110 },
  { key: 'sale', defaultWidth: 130 },
  { key: 'total', defaultWidth: 130 },
];

const COLUMN_LABELS = {
  row: 'ردیف',
  name: 'شرح کالا',
  description: 'توضیحات',
  qty: 'مقدار',
  unit: 'واحد',
  supply: 'مدیریت تامین',
  margin: 'حاشیه سود',
  total: 'قیمت کل',
};

function TickIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function InlineQuickForm({ draft, onChange, onSave, onCancel, showSupplier }) {
  const suppliers = listSuppliers();

  return (
    <div className="nabz-inline-inquiry">
      <select
        className="nabz-inline-inquiry__input"
        value={draft.supplyType}
        onChange={(e) => onChange({ ...draft, supplyType: e.target.value })}
        aria-label="نوع تامین"
      >
        {SUPPLY_CHANNEL_TYPES.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      <select
        className="nabz-inline-inquiry__input nabz-inline-inquiry__input--supplier"
        value={draft.supplierId}
        onChange={(e) => onChange({ ...draft, supplierId: Number(e.target.value) || '' })}
        aria-label={showSupplier ? 'نام تامین‌کننده' : 'مرجع تامین'}
      >
        <option value="">{showSupplier ? 'تامین‌کننده...' : 'مرجع تامین...'}</option>
        {suppliers.map((s, index) => (
          <option key={s.id} value={s.id}>
            {showSupplier ? (s.companyName || s.personName) : `تامین‌کننده ${index + 1}`}
          </option>
        ))}
      </select>
      <MoneyInput
        className="nabz-inline-inquiry__input nabz-inline-inquiry__input--price"
        value={draft.unitPrice}
        onChange={(unitPrice) => onChange({ ...draft, unitPrice })}
        placeholder="فی"
        aria-label="قیمت فی"
      />
      <button type="button" className="nabz-inline-inquiry__save" onClick={onSave} aria-label="ذخیره استعلام">
        <TickIcon />
      </button>
      <button type="button" className="nabz-inline-inquiry__cancel" onClick={onCancel} aria-label="انصراف">
        ×
      </button>
    </div>
  );
}

function SupplyStrip({
  item,
  itemIndex,
  isActive,
  onFocus,
  onOpenDraft,
  draftOpen,
  draft,
  onDraftChange,
  onSaveDraft,
  onCancelDraft,
  onSelectTarget,
  allowTargetSelection,
  showQuoting,
  showSupplier,
  lineMarginMode,
  lineMarginInputValue,
  onLineMarginChange,
  linePreview,
}) {
  const inquiries = item.inquiries || [];
  const isLineMarginEditable = lineMarginMode === MARGIN_MODES.LINE_FIXED_RIAL
    || lineMarginMode === MARGIN_MODES.LINE_FIXED_PERCENT;
  const lineMarginPlaceholder = lineMarginMode === MARGIN_MODES.LINE_FIXED_PERCENT ? '%' : 'ریال';

  return (
    <tr
      className={`nabz-quick-table__row${isActive ? ' is-active' : ''}`}
      onClick={() => onFocus(itemIndex)}
    >
      <td>{(itemIndex + 1).toLocaleString('fa-IR')}</td>
      <td className="nabz-quick-table__name">{item.name}</td>
      <td className="nabz-quick-table__desc">{item.description || '—'}</td>
      <td>{item.qty?.toLocaleString('fa-IR') ?? '—'}</td>
      <td>{item.unit || '—'}</td>
      <td className="nabz-quick-table__supply" onClick={(e) => e.stopPropagation()}>
        <div className="nabz-supply-strip">
          {inquiries.map((inq) => (
            <div key={inq.id} className="nabz-supply-strip__unit">
              <InquiryCompact
                inquiry={inq}
                selectable={allowTargetSelection}
                isTarget={getTargetInquiry(item)?.id === inq.id}
                onSelectTarget={onSelectTarget}
                showSupplier={showSupplier}
              />
              {!draftOpen && (
                <button
                  type="button"
                  className="nabz-inquiry-add-btn nabz-inquiry-add-btn--mini"
                  onClick={() => onOpenDraft(itemIndex)}
                  aria-label="افزودن استعلام بعدی"
                >
                  +
                </button>
              )}
            </div>
          ))}
          {draftOpen ? (
            <InlineQuickForm
              draft={draft}
              onChange={onDraftChange}
              onSave={onSaveDraft}
              onCancel={onCancelDraft}
              showSupplier={showSupplier}
            />
          ) : inquiries.length === 0 && (
            <button
              type="button"
              className="nabz-inquiry-add-btn nabz-inquiry-add-btn--inline"
              onClick={() => onOpenDraft(itemIndex)}
              aria-label="افزودن استعلام"
            >
              +
            </button>
          )}
        </div>
      </td>
      {showQuoting && (
        <>
          <td className="nabz-quick-table__margin" onClick={(e) => e.stopPropagation()}>
            {isLineMarginEditable ? (
              lineMarginMode === MARGIN_MODES.LINE_FIXED_RIAL ? (
                <MoneyInput
                  className="nabz-quick-table__margin-input"
                  value={lineMarginInputValue ?? ''}
                  onChange={(next) => onLineMarginChange(itemIndex, next)}
                  placeholder={lineMarginPlaceholder}
                  aria-label="حاشیه سود سطر"
                />
              ) : (
                <input
                  type="number"
                  min="0"
                  className="nabz-quick-table__margin-input"
                  value={lineMarginInputValue ?? ''}
                  onChange={(e) => onLineMarginChange(itemIndex, e.target.value)}
                  placeholder={lineMarginPlaceholder}
                  aria-label="حاشیه سود سطر"
                />
              )
            ) : (
              <span className="nabz-quick-table__margin-badge">
                {formatMarginCellValue(lineMarginMode, linePreview)}
              </span>
            )}
          </td>
          <td className="nabz-quick-table__final">
            {linePreview?.hasTarget && linePreview.saleUnitPrice > 0 ? (
              <div className="nabz-price-line nabz-price-line--emphasis">
                {formatPriceLine(linePreview.saleUnitPrice)}
              </div>
            ) : (
              <span className="nabz-quick-table__muted">—</span>
            )}
          </td>
          <td className="nabz-quick-table__final">
            {linePreview?.hasTarget && linePreview.lineTotal > 0 ? (
              <div className="nabz-price-line nabz-price-line--emphasis">
                {formatPriceLine(linePreview.lineTotal)}
              </div>
            ) : (
              <span className="nabz-quick-table__muted">—</span>
            )}
          </td>
        </>
      )}
    </tr>
  );
}

export default function QuickInquiryModal({
  order,
  focusItemIndex = 0,
  onClose,
  onSaveInquiry,
  onSetTargetInquiry,
  onUpdateQuoting,
  onCompleteInquiry,
  onCompleteQuoting,
  onUpdateProforma,
  onDecisionSuccess,
  onDecisionFailed,
  onUpdateOrder,
}) {
  const pipeline = useOrderPipelineView(order);
  const updateModalOrder = (orderUpdater) => {
    onUpdateOrder?.((prev) => prev.map((item) => {
      if (item.id !== order.id) return item;
      const next = orderUpdater(item);
      pipeline.syncAfterOrderUpdate(next);
      return next;
    }));
  };
  const [activeItemIndex, setActiveItemIndex] = useState(focusItemIndex);
  const [draftItemIndex, setDraftItemIndex] = useState(null);
  const [draft, setDraft] = useState(getEmptyQuickInquiryDraft());
  const [warning, setWarning] = useState('');
  const [pishkeshTab, setPishkeshTab] = useState(PISHKESH_MODAL_TABS.PROFORMA);
  const showPishkesh = shouldShowPishkeshTabs(order);
  const showQuoting = shouldShowQuotingSection(order);
  const showSupplier = canViewSupplierIdentity();
  const activeOperationalPhase = pipeline.operationalViewPhase || getOrderOperationalPhase(order);
  const showParvanePanel = order.status === ORDER_TABS.SUCCESS
    && pipeline.viewMode === 'operations'
    && activeOperationalPhase === OPERATIONAL_PHASES.PARVANE;
  const showTadarokPanel = order.status === ORDER_TABS.SUCCESS
    && pipeline.viewMode === 'operations'
    && activeOperationalPhase === OPERATIONAL_PHASES.TADAROK;
  const showTajhizPanel = order.status === ORDER_TABS.SUCCESS
    && pipeline.viewMode === 'operations'
    && activeOperationalPhase === OPERATIONAL_PHASES.TAJHIZ;
  const tableColumns = useMemo(
    () => (showQuoting ? [...BASE_QUICK_TABLE_COLUMNS, ...QUOTING_TABLE_COLUMNS] : BASE_QUICK_TABLE_COLUMNS),
    [showQuoting],
  );

  const { widths, startResize } = useResizableColumns(
    showQuoting ? 'nabz-quick-inquiry-quoting' : 'nabz-quick-inquiry-basic',
    tableColumns,
  );

  const items = order.items || [];
  const quoting = getOrderQuoting(order);
  const preview = useMemo(() => calculateQuotingPreview(order), [order]);
  const canCompleteInquiry = useMemo(() => canCompleteOrderInquiries(order), [order]);
  const canCompleteQuote = useMemo(() => canCompleteQuoting(order), [order]);
  const missingTargetMessage = showQuoting ? getMissingTargetMessage(order) : '';
  const lineMarginMode = quoting.marginMode;
  const saleType = preview.saleType || order.saleType || DEFAULT_SALE_TYPE;
  const saleColumnLabel = saleType === 'رسمی' ? 'قیمت قبل از مالیات' : 'قیمت فروش';
  const primaryActionLabel = showQuoting ? 'تکمیل مظنه' : 'تکمیل کاوش';
  const primaryActionDisabled = showQuoting ? !canCompleteQuote : !canCompleteInquiry;
  const proformaTerms = getProformaTerms(order);
  const proformaTermsEditable = Boolean(order.proforma?.termsEditable);
  const handlePrimaryAction = () => {
    if (showQuoting) {
      onCompleteQuoting(order.id);
      return;
    }
    onCompleteInquiry(order.id);
  };

  const handleClose = () => {
    if (showQuoting && missingTargetMessage) {
      setWarning(missingTargetMessage);
      return;
    }
    onClose();
  };

  const handleSelectTarget = (itemIndex, inquiryId) => {
    setWarning('');
    onSetTargetInquiry(order.id, itemIndex, inquiryId);
  };

  const handleQuotingPatch = (patch) => {
    if (missingTargetMessage) {
      setWarning(missingTargetMessage);
      return;
    }
    setWarning('');
    onUpdateQuoting(order.id, patch);
  };

  const openDraft = (itemIndex) => {
    setActiveItemIndex(itemIndex);
    setDraftItemIndex(itemIndex);
    setDraft(getEmptyQuickInquiryDraft());
  };

  const cancelDraft = () => {
    setDraftItemIndex(null);
    setDraft(getEmptyQuickInquiryDraft());
  };

  const saveDraft = () => {
    if (draftItemIndex == null) return;
    const validation = validateQuickInquiryDraft(draft);
    if (!validation.valid) return;
    setWarning('');
    onSaveInquiry(order.id, draftItemIndex, draft);
    setDraftItemIndex(null);
    setDraft(getEmptyQuickInquiryDraft());
  };

  return (
    <div className="nabz-picker-overlay nabz-quick-inquiry-overlay" onClick={handleClose} role="presentation">
      <div
        className={`nabz-quick-inquiry-modal${showPishkesh ? ' nabz-quick-inquiry-modal--pishkesh' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="نمایش سریع سفارش"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="nabz-quick-inquiry-modal__header">
          <div className="nabz-quick-inquiry-modal__header-main">
            <h3>نمایش سریع سفارش</h3>
            <p className="nabz-quick-inquiry-modal__order">{order.code}</p>
            <div className="nabz-quick-inquiry-modal__context">
              <strong className="nabz-quick-inquiry-modal__customer">{order.customer}</strong>
              {order.generalNotes ? (
                <p className="nabz-quick-inquiry-modal__general-notes">{order.generalNotes}</p>
              ) : (
                <p className="nabz-quick-inquiry-modal__general-notes nabz-quick-inquiry-modal__general-notes--empty">
                  توضیحات کلی ثبت نشده است.
                </p>
              )}
            </div>
          </div>
          <div className="nabz-quick-inquiry-modal__header-actions">
            {!showPishkesh && (
              <button
                type="button"
                className="btn btn--primary"
                disabled={primaryActionDisabled}
                onClick={handlePrimaryAction}
              >
                {primaryActionLabel}
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={handleClose}
              disabled={showQuoting && Boolean(missingTargetMessage)}
              aria-label="بستن"
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="nabz-quick-inquiry-modal__stepper">
          <GatewayHorizontalStepper
            order={order}
            orderPhase={pipeline.orderPhase}
            viewPhase={pipeline.viewPhase}
            viewMode={pipeline.viewMode}
            operationalPhase={pipeline.operationalPhase}
            operationalViewPhase={pipeline.operationalViewPhase}
            onPhaseChange={pipeline.handlePhaseChange}
            onOperationalPhaseChange={pipeline.handleOperationalPhaseChange}
          />
        </div>

        <div className="nabz-quick-inquiry-modal__body">
          {showParvanePanel ? (
            <ParvaneStagePanel
              order={order}
              operationalViewPhase={activeOperationalPhase}
              compact
              onUpdateOrder={updateModalOrder}
              onOperationalPhaseChange={pipeline.handleOperationalPhaseChange}
              onReturnToGateway={() => pipeline.handlePhaseChange(GATEWAY_PHASES.PISHKESH)}
            />
          ) : showTadarokPanel ? (
            <TadarokStagePanel
              order={order}
              operationalViewPhase={activeOperationalPhase}
              compact
              onUpdateOrder={updateModalOrder}
              onOperationalPhaseChange={pipeline.handleOperationalPhaseChange}
            />
          ) : showTajhizPanel ? (
            <TajhizStagePanel
              order={order}
              operationalViewPhase={activeOperationalPhase}
              compact
              onUpdateOrder={updateModalOrder}
            />
          ) : (
            <>
          {showPishkesh && (
            <GatewayDecisionPanel
              order={order}
              viewPhase={pipeline.viewPhase}
              orderPhase={pipeline.orderPhase}
              onSubmitSuccess={onDecisionSuccess}
              onSubmitFailed={onDecisionFailed}
            />
          )}

          {showPishkesh && (
            <div className="nabz-quick-modal-tabs" role="tablist" aria-label="بخش‌های پیش‌کش">
              <button
                type="button"
                role="tab"
                aria-selected={pishkeshTab === PISHKESH_MODAL_TABS.MOZENE}
                className={`nabz-quick-modal-tabs__btn${pishkeshTab === PISHKESH_MODAL_TABS.MOZENE ? ' is-active' : ''}`}
                onClick={() => setPishkeshTab(PISHKESH_MODAL_TABS.MOZENE)}
              >
                مظنه
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pishkeshTab === PISHKESH_MODAL_TABS.PROFORMA}
                className={`nabz-quick-modal-tabs__btn${pishkeshTab === PISHKESH_MODAL_TABS.PROFORMA ? ' is-active' : ''}`}
                onClick={() => setPishkeshTab(PISHKESH_MODAL_TABS.PROFORMA)}
              >
                پیش‌فاکتور
              </button>
            </div>
          )}

          {showPishkesh ? (
            pishkeshTab === PISHKESH_MODAL_TABS.MOZENE ? (
              <QuotingReadOnlyPanel
                order={order}
                preview={preview}
                quoting={quoting}
                lineMarginMode={lineMarginMode}
                showSupplier={showSupplier}
                saleType={saleType}
              />
            ) : (
              <ProformaTab
                order={order}
                terms={proformaTerms}
                termsEditable={proformaTermsEditable}
                onTermsChange={(terms) => onUpdateProforma(order.id, { terms })}
                onToggleTermsEdit={(enabled) => onUpdateProforma(order.id, { termsEditable: enabled, terms: proformaTerms })}
              />
            )
          ) : (
            <>
          {showQuoting && (
            <QuotingMatrix
              quoting={quoting}
              onChangeMode={(marginMode) => handleQuotingPatch({ marginMode })}
              onChangeOrderValue={(orderMarginValue) => handleQuotingPatch({ orderMarginValue })}
            />
          )}

          <table className="nabz-quick-table data-table--resizable">
            <ResizableColGroup columns={tableColumns} widths={widths} />
            <thead>
              <tr>
                {tableColumns.map((col) => (
                  <ResizableTh
                    key={col.key}
                    columnKey={col.key}
                    resizable={col.resizable !== false}
                    onResizeStart={startResize}
                    className={
                      col.key === 'name' || col.key === 'description'
                        ? `nabz-quick-table__col--${col.key}`
                        : undefined
                    }
                  >
                    {col.key === 'sale' ? saleColumnLabel : COLUMN_LABELS[col.key]}
                  </ResizableTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} className="nabz-items-table__empty">
                    اقلامی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                items.map((item, itemIndex) => (
                  <SupplyStrip
                    key={itemIndex}
                    item={item}
                    itemIndex={itemIndex}
                    isActive={activeItemIndex === itemIndex}
                    onFocus={setActiveItemIndex}
                    onOpenDraft={openDraft}
                    draftOpen={draftItemIndex === itemIndex}
                    draft={draft}
                    onDraftChange={setDraft}
                    onSaveDraft={saveDraft}
                    onCancelDraft={cancelDraft}
                    onSelectTarget={(inquiryId) => handleSelectTarget(itemIndex, inquiryId)}
                    allowTargetSelection={showQuoting}
                    showQuoting={showQuoting}
                    showSupplier={showSupplier}
                    lineMarginMode={lineMarginMode}
                    lineMarginInputValue={preview.lines[itemIndex]?.marginInputValue ?? ''}
                    onLineMarginChange={(idx, value) => handleQuotingPatch({
                      lineMargins: { [idx]: value },
                    })}
                    linePreview={preview.lines[itemIndex]}
                  />
                ))
              )}
            </tbody>
          </table>

        {showQuoting && (
          <footer className="nabz-quick-inquiry-modal__footer nabz-quoting-footer">
            <section className="nabz-quoting-footer__summary">
              <div className="nabz-quoting-footer__billing">
                <div className="nabz-quoting-footer__rows">
                  <div className="nabz-quoting-footer__row">
                    <span>جمع سفارش</span>
                    <strong className="nabz-price-line">{formatPriceLine(preview.subtotal)}</strong>
                  </div>
                  {saleType === 'رسمی' && (
                    <div className="nabz-quoting-footer__row">
                      <span>مالیات ارزش افزوده</span>
                      <strong className="nabz-price-line">{formatPriceLine(preview.vatAmount)}</strong>
                    </div>
                  )}
                  <div className="nabz-quoting-footer__row nabz-quoting-footer__row--grand">
                    <span>جمع کل سفارش</span>
                    <strong className="nabz-price-line">{formatPriceLine(preview.orderTotal)}</strong>
                  </div>
                </div>
              </div>
              <div className="nabz-quoting-footer__profit">
                <span className="nabz-quoting-footer__profit-label">جمع کل سود سفارش</span>
                <strong className="nabz-price-line nabz-quoting-footer__profit-value">
                  {formatPriceLine(preview.totalProfit)}
                </strong>
              </div>
              {warning && (
                <p className="nabz-quoting-footer__warning" role="alert">{warning}</p>
              )}
            </section>
          </footer>
        )}
            </>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
