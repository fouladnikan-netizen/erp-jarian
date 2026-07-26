import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ORDER_TABS } from '../config';
import { useOrderPipelineView } from '../hooks/useOrderPipelineView';
import { OPERATIONAL_PHASES } from '../phase2Config';
import { getOrderOperationalPhase } from '../phase2Service';
import GatewayHorizontalStepper from './orderProfile/gateway/GatewayHorizontalStepper';
import GatewayDecisionPanel from './orderProfile/gateway/GatewayDecisionPanel';
import ParvaneStagePanel from './orderProfile/operations/ParvaneStagePanel';
import TadarokStagePanel from './orderProfile/operations/TadarokStagePanel';
import RahseparStagePanel from './orderProfile/operations/RahseparStagePanel';
import SaranjamStagePanel from './orderProfile/operations/SaranjamStagePanel';
import { isOrderArchived } from '../saranjamSettlementService';
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
  inquiryToQuickDraft,
  validateQuickInquiryDraft,
} from '../inquiryService';
import { MARGIN_MODES } from '../quotingConfig';
import { listSuppliers } from '../suppliers';
import {
  getLatestProformaVersion,
  getProformaTerms,
  issueProforma,
  updateProforma as reviseProforma,
} from '../proformaService';
import {
  openStoredProformaPreview,
  PROFORMA_SEND_MESSAGE_TYPE,
  PROFORMA_SIGNED_MESSAGE_TYPE,
} from '../proformaPrint';
import {
  appendSignedProformaRecord,
  archivePreviousSignedProforma,
} from '../orderProfileService';
import { sendProformaToCustomer } from '../gatewayLifecycleService';
import { hasGatewayDecision } from '../gatewayDecisionService';
import { isGatewayLivePhase, getGatewayPhaseIndex } from '../gatewayService';
import {
  canEditInquiryPrices,
  canEditProfitMargin,
} from '../orderEditPermissions';
import {
  canViewSupplierIdentity,
  DEFAULT_SALE_TYPE,
} from '../constants';
import { toDisplayOrderCode } from '../orderCode';
import { getOrderDisplayStatus, getOrderDisplayStatusKind } from '../orderStageService';
import { getCustomerById } from '../customers';
import ProformaTab from './ProformaTab';
import ProformaHeaderActions from './ProformaHeaderActions';
import QuotingReadOnlyPanel from './QuotingReadOnlyPanel';
import {
  formatMarginCellValue,
  formatPriceLine,
  InquiryCompact,
  LineMarginCell,
  QuotingMatrix,
  SalePriceColumnHeader,
} from './quickInquiryParts';
import MoneyInput from './MoneyInput';
import {
  JarianMoney,
  JarianProductCell,
} from '../../../components/jarian/JarianPresentation';

const BASE_QUICK_TABLE_COLUMNS = [
  { key: 'row', defaultWidth: 52, resizable: false },
  { key: 'name', defaultWidth: 280 },
  { key: 'qty', defaultWidth: 72 },
  { key: 'unit', defaultWidth: 72 },
  { key: 'supply', defaultWidth: 220 },
];

const EXPAND_TABLE_COLUMN = { key: 'expand', defaultWidth: 48, resizable: false };

const QUOTING_TABLE_COLUMNS = [
  { key: 'margin', defaultWidth: 160 },
  { key: 'sale', defaultWidth: 130 },
  { key: 'total', defaultWidth: 130 },
];

const COLUMN_LABELS = {
  row: 'ردیف',
  name: 'شرح کالا',
  qty: 'مقدار',
  unit: 'واحد',
  supply: 'قیمت استعلامی',
  expand: '',
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

function ChevronIcon({ expanded }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={`nabz-quick-expand__icon${expanded ? ' is-expanded' : ''}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function InlineQuickForm({ draft, onChange, onSave, onCancel, showSupplier }) {
  const suppliers = listSuppliers();

  return (
    <div className="nabz-inline-inquiry nabz-inline-inquiry--labeled">
      <div className="nabz-inline-inquiry__labels" aria-hidden="true">
        <span>نوع تامین</span>
        <span>{showSupplier ? 'نام تامین‌کننده' : 'مرجع تامین'}</span>
        <span>قیمت</span>
        <span>توضیحات</span>
        <span />
      </div>
      <div className="nabz-inline-inquiry__fields">
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
          placeholder="قیمت"
          aria-label="قیمت"
        />
        <input
          type="text"
          className="nabz-inline-inquiry__input nabz-inline-inquiry__input--notes"
          value={draft.notes || ''}
          onChange={(e) => onChange({ ...draft, notes: e.target.value })}
          placeholder="اختیاری"
          aria-label="توضیحات استعلام"
        />
        <div className="nabz-inline-inquiry__actions">
          <button type="button" className="nabz-inline-inquiry__save" onClick={onSave} aria-label="ذخیره استعلام">
            <TickIcon />
          </button>
          <button type="button" className="nabz-inline-inquiry__cancel" onClick={onCancel} aria-label="انصراف">
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

function SupplyStrip({
  item,
  itemIndex,
  isActive,
  isExpanded,
  totalCols,
  onFocus,
  onToggleExpand,
  onOpenDraft,
  onEditInquiry,
  draftOpen,
  editingInquiryId,
  draft,
  onDraftChange,
  onSaveDraft,
  onCancelDraft,
  onSelectTarget,
  allowTargetSelection,
  showQuoting,
  showSupplier,
  canManage = true,
  canEditMargins = false,
  lineMarginMode,
  lineMarginInputValue,
  lineMarginDraftValue,
  onLineMarginDraftChange,
  onLineMarginSave,
  lineMarginSaved = false,
  linePreview,
}) {
  const inquiries = item.inquiries || [];
  const targetInquiry = getTargetInquiry(item);
  const isLineMarginEditable = canEditMargins && (
    lineMarginMode === MARGIN_MODES.LINE_FIXED_RIAL
    || lineMarginMode === MARGIN_MODES.LINE_FIXED_PERCENT
  );
  const lineMarginUnit = lineMarginMode === MARGIN_MODES.LINE_FIXED_PERCENT ? 'percent' : 'rial';
  const marginFieldValue = lineMarginDraftValue ?? lineMarginInputValue ?? '';

  return (
    <>
      <tr
        className={`nabz-quick-table__row nabz-quick-table__row--master${isActive ? ' is-active' : ''}${isExpanded ? ' is-expanded' : ''}`}
        onClick={() => onFocus(itemIndex)}
      >
        <td>{(itemIndex + 1).toLocaleString('fa-IR')}</td>
        <td className="nabz-quick-table__name jarian-td-product">
          <JarianProductCell name={item.name} description={item.description} />
        </td>
        <td>{item.qty?.toLocaleString('fa-IR') ?? '—'}</td>
        <td>{item.unit || '—'}</td>
        <td className="nabz-quick-table__supply" onClick={(e) => e.stopPropagation()}>
          <div className="nabz-quick-supply-cell">
            {targetInquiry ? (
              <InquiryCompact
                inquiry={targetInquiry}
                selectable={false}
                isTarget
                showSupplier={showSupplier}
                readOnly
                flat
              />
            ) : (
              canManage && !draftOpen && <span className="nabz-quick-table__muted">—</span>
            )}
            {canManage && !draftOpen && (
              <button
                type="button"
                className="nabz-inquiry-add-btn nabz-inquiry-add-btn--mini"
                onClick={() => onOpenDraft(itemIndex)}
                aria-label={inquiries.length === 0 ? 'ثبت استعلام' : 'ثبت استعلام مجدد'}
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
                <LineMarginCell
                  value={marginFieldValue}
                  unit={lineMarginUnit}
                  saved={lineMarginSaved}
                  onValueChange={(next) => onLineMarginDraftChange(itemIndex, next)}
                  onSave={() => onLineMarginSave(itemIndex, marginFieldValue)}
                />
              ) : (
                <span className="nabz-quick-table__margin-badge">
                  {formatMarginCellValue(lineMarginMode, linePreview)}
                </span>
              )}
            </td>
            <td className="nabz-quick-table__final jarian-td-money">
              {linePreview?.hasTarget && linePreview.saleUnitPrice > 0 ? (
                <JarianMoney amount={linePreview.saleUnitPrice} emphasis />
              ) : (
                <span className="nabz-quick-table__muted">—</span>
              )}
            </td>
            <td className="nabz-quick-table__final jarian-td-money">
              {linePreview?.hasTarget && linePreview.lineTotal > 0 ? (
                <JarianMoney amount={linePreview.lineTotal} emphasis />
              ) : (
                <span className="nabz-quick-table__muted">—</span>
              )}
            </td>
          </>
        )}
        <td className="nabz-quick-table__expand" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="nabz-quick-expand__btn"
            onClick={() => onToggleExpand(itemIndex)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'بستن استعلام‌ها' : 'نمایش استعلام‌ها'}
          >
            <ChevronIcon expanded={isExpanded} />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="nabz-quick-table__subrow">
          <td colSpan={totalCols}>
            <div className="nabz-quick-subrow" onClick={(e) => e.stopPropagation()}>
              {inquiries.length > 0 && (
                <div className="nabz-quick-subrow__list">
                  {inquiries.map((inq, inquiryIndex) => (
                    draftOpen && editingInquiryId === inq.id ? (
                      <InlineQuickForm
                        key={inq.id}
                        draft={draft}
                        onChange={onDraftChange}
                        onSave={onSaveDraft}
                        onCancel={onCancelDraft}
                        showSupplier={showSupplier}
                      />
                    ) : (
                      <div key={inq.id} className="nabz-quick-subrow__item">
                        <InquiryCompact
                          inquiry={inq}
                          inquiryIndex={inquiryIndex}
                          selectable={allowTargetSelection && (canManage || canEditMargins)}
                          isTarget={targetInquiry?.id === inq.id}
                          onSelectTarget={onSelectTarget}
                          showSupplier={showSupplier}
                          flat
                          showNotes
                          onEdit={canManage && !draftOpen
                            ? (inquiryId) => onEditInquiry(itemIndex, inquiryId)
                            : undefined}
                        />
                      </div>
                    )
                  ))}
                </div>
              )}

              {canManage && draftOpen && editingInquiryId == null && (
                <InlineQuickForm
                  draft={draft}
                  onChange={onDraftChange}
                  onSave={onSaveDraft}
                  onCancel={onCancelDraft}
                  showSupplier={showSupplier}
                />
              )}

              {inquiries.length === 0 && !(canManage && draftOpen) && (
                <p className="nabz-quick-subrow__empty">هنوز استعلامی ثبت نشده است.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function QuickInquiryModal({
  order,
  focusItemIndex = 0,
  onClose,
  onSaveInquiry,
  onUpdateInquiry,
  onSetTargetInquiry,
  onUpdateQuoting,
  onCompleteInquiry,
  onCompleteQuoting,
  onUpdateProforma,
  onDecisionSuccess,
  onDecisionFailed,
  onUpdateOrder,
}) {
  const navigate = useNavigate();
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
  const [expandedItems, setExpandedItems] = useState(() => new Set());
  const [draftItemIndex, setDraftItemIndex] = useState(null);
  const [editingInquiryId, setEditingInquiryId] = useState(null);
  const [draft, setDraft] = useState(getEmptyQuickInquiryDraft());
  const [warning, setWarning] = useState('');
  const isGatewayView = pipeline.viewMode === 'gateway';
  const viewPhase = pipeline.viewPhase;
  const orderPhase = pipeline.orderPhase;
  const isLivePhase = isGatewayLivePhase(orderPhase, viewPhase);
  const showPishkesh = isGatewayView && viewPhase === GATEWAY_PHASES.PISHKESH;
  const showQuoting = isGatewayView && viewPhase === GATEWAY_PHASES.MOZENE;
  const showKavosh = isGatewayView && viewPhase === GATEWAY_PHASES.KAVOSH;
  const showQuotingEditable = showQuoting
    && order.status === ORDER_TABS.CURRENT
    && getGatewayPhaseIndex(orderPhase) >= getGatewayPhaseIndex(GATEWAY_PHASES.MOZENE);
  const showSupplier = canViewSupplierIdentity();
  // ویرایش استعلام فقط برای سفارش جاری؛ سفارش‌های موفق صرفاً نمایشی‌اند
  const canManageInquiries = canEditInquiryPrices()
    && order.status === ORDER_TABS.CURRENT
    && (showKavosh || (showQuoting && isLivePhase));
  const canManageQuoting = showQuotingEditable && canEditProfitMargin();
  const showDecisionPanel = showPishkesh && (
    hasGatewayDecision(order) || Boolean(order.proforma?.signed)
  );
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [marginDrafts, setMarginDrafts] = useState({});
  const activeOperationalPhase = pipeline.operationalViewPhase || getOrderOperationalPhase(order);
  const showParvanePanel = order.status === ORDER_TABS.SUCCESS
    && pipeline.viewMode === 'operations'
    && activeOperationalPhase === OPERATIONAL_PHASES.PARVANE;
  const showTadarokPanel = order.status === ORDER_TABS.SUCCESS
    && pipeline.viewMode === 'operations'
    && activeOperationalPhase === OPERATIONAL_PHASES.TADAROK;
  const showRahseparPanel = order.status === ORDER_TABS.SUCCESS
    && pipeline.viewMode === 'operations'
    && activeOperationalPhase === OPERATIONAL_PHASES.RAHESPAR;
  const showSaranjamPanel = order.status === ORDER_TABS.SUCCESS
    && pipeline.viewMode === 'operations'
    && activeOperationalPhase === OPERATIONAL_PHASES.SARANJAM;
  const archivedReadOnly = isOrderArchived(order);
  const tableColumns = useMemo(
    () => (showQuoting
      ? [...BASE_QUICK_TABLE_COLUMNS, ...QUOTING_TABLE_COLUMNS, EXPAND_TABLE_COLUMN]
      : [...BASE_QUICK_TABLE_COLUMNS, EXPAND_TABLE_COLUMN]),
    [showQuoting],
  );

  const { widths, startResize } = useResizableColumns(
    showQuoting ? 'nabz-quick-inquiry-quoting-v3' : 'nabz-quick-inquiry-basic-v3',
    tableColumns,
  );

  const items = order.items || [];
  const quoting = getOrderQuoting(order);
  const preview = useMemo(() => calculateQuotingPreview(order), [order]);
  const canCompleteInquiry = useMemo(() => canCompleteOrderInquiries(order), [order]);
  const canCompleteQuote = useMemo(() => canCompleteQuoting(order), [order]);
  const missingTargetMessage = showQuotingEditable ? getMissingTargetMessage(order) : '';
  const lineMarginMode = quoting.marginMode;

  useEffect(() => {
    setMarginDrafts({});
  }, [lineMarginMode]);

  const saleType = preview.saleType || order.saleType || DEFAULT_SALE_TYPE;
  const isOfficialSale = saleType === 'رسمی';
  const vatInclusive = Boolean(preview.vatInclusive);
  const saleColumnLabel = isOfficialSale
    ? (vatInclusive ? 'قیمت با مالیات' : 'قیمت قبل از مالیات')
    : 'قیمت فروش';
  const canToggleVatInclusive = canEditProfitMargin()
    && isOfficialSale
    && (showQuoting || showPishkesh)
    && getGatewayPhaseIndex(orderPhase) >= getGatewayPhaseIndex(GATEWAY_PHASES.MOZENE);
  const showPrimaryAction = isGatewayView && isLivePhase && !showPishkesh;
  const primaryActionLabel = showQuoting ? 'تکمیل مظنه' : 'تکمیل کاوش';
  const primaryActionDisabled = showQuoting ? !canCompleteQuote : !canCompleteInquiry;
  const primaryActionReady = !primaryActionDisabled;
  const statusKind = getOrderDisplayStatusKind(order);
  const statusLabel = getOrderDisplayStatus(order);
  const displayOrderCode = toDisplayOrderCode(order.code);
  const registeredAt = [order.registeredDate, order.registeredTime].filter(Boolean).join(' · ');
  const buyerCustomer = getCustomerById(order.customerId);
  const buyerPhone = order.requesterMobile
    || buyerCustomer?.officialSpecs?.phone
    || buyerCustomer?.mobile
    || '';
  const expertName = order.requesterName || '';
  const proformaTerms = getProformaTerms(order);
  const proformaTermsEditable = Boolean(order.proforma?.termsEditable);

  const handleSendProforma = (version) => {
    updateModalOrder((current) => sendProformaToCustomer(current));
    const label = version?.documentNumber || order.code;
    window.alert(`پیش‌فاکتور ${label} برای ${order.customer} ارسال شد.`);
  };

  const handleIssueProforma = () => {
    const result = issueProforma(order);
    if (result.changed) {
      updateModalOrder(() => result.order);
    }
    openStoredProformaPreview(result.payload);
  };

  const handleViewProforma = () => {
    const latest = getLatestProformaVersion(order);
    if (!latest) return;
    openStoredProformaPreview({
      viewModel: latest.viewModel,
      terms: latest.terms,
      termsCustom: latest.termsCustom,
      orderId: order.id,
      versionId: latest.id,
      signed: Boolean(order.proforma?.signed),
    });
  };

  const handleUpdateProforma = () => {
    const withArchive = archivePreviousSignedProforma(order);
    const result = reviseProforma(withArchive);
    updateModalOrder(() => result.order);
    onClose();
    navigate(`/nabz?tab=${ORDER_TABS.CURRENT}`);
  };

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data) return;
      if (data.orderId != null && data.orderId !== order.id) return;

      if (data.type === PROFORMA_SEND_MESSAGE_TYPE) {
        handleSendProforma({ documentNumber: data.documentNumber });
        return;
      }

      if (data.type === PROFORMA_SIGNED_MESSAGE_TYPE) {
        updateModalOrder((current) => appendSignedProformaRecord(current, {
          ...(data.attachment || {}),
          documentNumber: data.documentNumber,
        }));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [order.id, order.customer]);

  const handlePrimaryAction = () => {
    if (showQuoting) {
      onCompleteQuoting(order.id);
      return;
    }
    onCompleteInquiry(order.id);
  };

  const handleClose = () => {
    if (showQuotingEditable && missingTargetMessage) {
      setWarning(missingTargetMessage);
      return;
    }
    onClose();
  };

  const handleSelectTarget = (itemIndex, inquiryId) => {
    if (!canManageInquiries && !canManageQuoting) return;
    setWarning('');
    onSetTargetInquiry(order.id, itemIndex, inquiryId);
  };

  const handleQuotingPatch = (patch) => {
    if (!canManageQuoting) return;
    if (missingTargetMessage) {
      setWarning(missingTargetMessage);
      return;
    }
    setWarning('');
    onUpdateQuoting(order.id, patch);
  };

  const handleVatInclusiveChange = (next) => {
    if (!canToggleVatInclusive) return;
    setWarning('');
    onUpdateQuoting(order.id, { vatInclusive: next });
  };

  const openDraft = (itemIndex) => {
    setActiveItemIndex(itemIndex);
    setExpandedItems((prev) => new Set(prev).add(itemIndex));
    setDraftItemIndex(itemIndex);
    setEditingInquiryId(null);
    setDraft(getEmptyQuickInquiryDraft());
  };

  const openEditInquiry = (itemIndex, inquiryId) => {
    const inquiry = (items[itemIndex]?.inquiries || []).find((row) => row.id === inquiryId);
    if (!inquiry) return;
    setActiveItemIndex(itemIndex);
    setExpandedItems((prev) => new Set(prev).add(itemIndex));
    setDraftItemIndex(itemIndex);
    setEditingInquiryId(inquiryId);
    setDraft(inquiryToQuickDraft(inquiry));
  };

  const toggleExpand = (itemIndex) => {
    setExpandedItems((prev) => {
      const isCurrentlyExpanded = prev.has(itemIndex);
      if (isCurrentlyExpanded && draftItemIndex === itemIndex) {
        setDraftItemIndex(null);
        setEditingInquiryId(null);
        setDraft(getEmptyQuickInquiryDraft());
      }
      const next = new Set(prev);
      if (isCurrentlyExpanded) next.delete(itemIndex);
      else next.add(itemIndex);
      return next;
    });
    setActiveItemIndex(itemIndex);
  };

  const cancelDraft = () => {
    setDraftItemIndex(null);
    setEditingInquiryId(null);
    setDraft(getEmptyQuickInquiryDraft());
  };

  const saveDraft = () => {
    if (draftItemIndex == null) return;
    const validation = validateQuickInquiryDraft(draft);
    if (!validation.valid) {
      setWarning(validation.reason || 'اطلاعات استعلام کامل نیست.');
      return;
    }
    setWarning('');
    if (editingInquiryId != null) {
      onUpdateInquiry?.(order.id, draftItemIndex, editingInquiryId, draft);
    } else {
      onSaveInquiry(order.id, draftItemIndex, draft);
    }
    setDraftItemIndex(null);
    setEditingInquiryId(null);
    setDraft(getEmptyQuickInquiryDraft());
  };

  return (
    <div className="nabz-picker-overlay nabz-quick-inquiry-overlay" onClick={handleClose} role="presentation">
      <div
        className="nabz-quick-inquiry-modal"
        role="dialog"
        aria-modal="true"
        aria-label="نمایش سریع سفارش"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="nabz-quick-inquiry-modal__header">
          <div className="nabz-quick-inquiry-modal__header-identity">
            <h3 className="nabz-quick-inquiry-modal__customer font-meem" title={order.customer}>
              {order.customer || '—'}
            </h3>
            {buyerPhone ? (
              <span className="nabz-quick-inquiry-modal__pill font-yekan" title="تلفن" dir="ltr">
                {buyerPhone}
              </span>
            ) : null}
            {expertName ? (
              <span className="nabz-quick-inquiry-modal__pill font-meem" title="کارشناس مرتبط">
                {expertName}
              </span>
            ) : null}
          </div>

          <div className="nabz-quick-inquiry-modal__header-meta">
            <span className="nabz-quick-inquiry-modal__code font-yekan" title={displayOrderCode}>
              {displayOrderCode}
            </span>
            <span className={`nabz-order-status nabz-order-status--${statusKind}`}>
              {statusLabel}
            </span>
            {registeredAt ? (
              <span className="nabz-quick-inquiry-modal__date font-yekan" title="تاریخ ثبت">
                {registeredAt}
              </span>
            ) : null}
            <div className="nabz-quick-inquiry-modal__header-actions">
              {!showPishkesh && showPrimaryAction && (
                <button
                  type="button"
                  className={`btn btn--outline order-profile-stage-btn${primaryActionReady ? ' is-ready' : ''}`}
                  disabled={primaryActionDisabled}
                  onClick={handlePrimaryAction}
                >
                  {primaryActionLabel}
                </button>
              )}
              <ProformaHeaderActions
                order={order}
                active={showPishkesh}
                onIssue={handleIssueProforma}
                onView={handleViewProforma}
                onUpdate={handleUpdateProforma}
                onDecision={() => setDecisionOpen(true)}
              />
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={handleClose}
                disabled={showQuotingEditable && Boolean(missingTargetMessage)}
                aria-label="بستن"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        </header>

        {order.generalNotes?.trim() ? (
          <aside
            className="nabz-requester-notes"
            aria-label="توضیحات مهم درخواست‌کننده"
          >
            <span className="nabz-requester-notes__label font-meem">
              توضیحات مهم درخواست‌کننده
            </span>
            <p className="nabz-requester-notes__text font-meem">
              {order.generalNotes.trim()}
            </p>
          </aside>
        ) : null}

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
              readOnly={archivedReadOnly}
              onUpdateOrder={updateModalOrder}
              onOperationalPhaseChange={pipeline.handleOperationalPhaseChange}
              onReturnToGateway={() => pipeline.handlePhaseChange(GATEWAY_PHASES.PISHKESH)}
            />
          ) : showTadarokPanel ? (
            <TadarokStagePanel
              order={order}
              operationalViewPhase={activeOperationalPhase}
              compact
              readOnly={archivedReadOnly}
              onUpdateOrder={updateModalOrder}
              onOperationalPhaseChange={pipeline.handleOperationalPhaseChange}
            />
          ) : showRahseparPanel ? (
            <RahseparStagePanel
              order={order}
              compact
              readOnly={archivedReadOnly}
              onUpdateOrder={updateModalOrder}
              onOperationalPhaseChange={pipeline.handleOperationalPhaseChange}
            />
          ) : showSaranjamPanel ? (
            <SaranjamStagePanel
              order={order}
              compact
              onUpdateOrder={updateModalOrder}
            />
          ) : (
            <>
          {showDecisionPanel && (decisionOpen || hasGatewayDecision(order)) && (
            <GatewayDecisionPanel
              order={order}
              viewPhase={pipeline.viewPhase}
              orderPhase={pipeline.orderPhase}
              onSubmitSuccess={(payload) => {
                setDecisionOpen(false);
                onDecisionSuccess?.(payload);
              }}
              onSubmitFailed={(payload) => {
                setDecisionOpen(false);
                onDecisionFailed?.(payload);
              }}
            />
          )}

          {showPishkesh ? (
            <ProformaTab
              order={order}
              terms={proformaTerms}
              termsEditable={proformaTermsEditable}
              onTermsChange={(terms) => onUpdateProforma(order.id, { terms })}
              onToggleTermsEdit={(enabled) => onUpdateProforma(order.id, { termsEditable: enabled, terms: proformaTerms })}
            />
          ) : showQuoting && !showQuotingEditable ? (
            <QuotingReadOnlyPanel
              order={order}
              preview={preview}
              quoting={quoting}
              lineMarginMode={lineMarginMode}
              showSupplier={showSupplier}
              saleType={saleType}
            />
          ) : (
            <>
          {showQuotingEditable && (
            <QuotingMatrix
              quoting={quoting}
              namePrefix={`quick-${order.id}`}
              readOnly={!canManageQuoting}
              onChangeMode={(marginMode) => handleQuotingPatch({ marginMode })}
              onChangeOrderValue={(orderMarginValue) => handleQuotingPatch({ orderMarginValue })}
            />
          )}

          <div className="nabz-quick-table-wrap">
          <table className="nabz-quick-table jarian-table data-table--resizable">
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
                      col.key === 'name'
                        ? `nabz-quick-table__col--${col.key}`
                        : undefined
                    }
                  >
                    {col.key === 'sale' && isOfficialSale ? (
                      <SalePriceColumnHeader
                        saleType={saleType}
                        vatInclusive={vatInclusive}
                        showToggle={showQuoting || showPishkesh}
                        disabled={!canToggleVatInclusive}
                        onChange={handleVatInclusiveChange}
                      />
                    ) : (
                      col.key === 'sale' ? saleColumnLabel : COLUMN_LABELS[col.key]
                    )}
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
                    isExpanded={expandedItems.has(itemIndex)}
                    totalCols={tableColumns.length}
                    onFocus={setActiveItemIndex}
                    onToggleExpand={toggleExpand}
                    onOpenDraft={openDraft}
                    onEditInquiry={openEditInquiry}
                    draftOpen={draftItemIndex === itemIndex}
                    editingInquiryId={draftItemIndex === itemIndex ? editingInquiryId : null}
                    draft={draft}
                    onDraftChange={setDraft}
                    onSaveDraft={saveDraft}
                    onCancelDraft={cancelDraft}
                    onSelectTarget={(inquiryId) => handleSelectTarget(itemIndex, inquiryId)}
                    allowTargetSelection={(item.inquiries || []).length > 1}
                    showQuoting={showQuoting}
                    showSupplier={showSupplier}
                    canManage={canManageInquiries}
                    canEditMargins={canManageQuoting}
                    lineMarginMode={lineMarginMode}
                    lineMarginInputValue={preview.lines[itemIndex]?.marginInputValue ?? ''}
                    lineMarginDraftValue={marginDrafts[itemIndex]}
                    onLineMarginDraftChange={(idx, value) => {
                      setMarginDrafts((prev) => ({ ...prev, [idx]: value }));
                    }}
                    onLineMarginSave={(idx, value) => handleQuotingPatch({
                      lineMargins: { [idx]: value },
                    })}
                    lineMarginSaved={(() => {
                      const raw = quoting.lineMargins?.[itemIndex];
                      if (raw === '' || raw == null) return false;
                      return Number.isFinite(Number(raw));
                    })()}
                    linePreview={preview.lines[itemIndex]}
                  />
                ))
              )}
            </tbody>
          </table>
          </div>

        {showQuotingEditable && (
          <footer className="nabz-quick-inquiry-modal__footer nabz-quoting-footer">
            <section className="nabz-quoting-footer__summary">
              <div className="nabz-quoting-footer__billing">
                <div className="nabz-quoting-footer__rows">
                  <div className="nabz-quoting-footer__row">
                    <span>جمع سفارش</span>
                    <strong className="nabz-price-line">{formatPriceLine(preview.subtotal)}</strong>
                  </div>
                  {preview.showVatBreakdown && (
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
