import { useEffect, useMemo, useState } from 'react';
import ResizableColGroup from '../../../../../components/table/ResizableColGroup';
import ResizableTh from '../../../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../../../hooks/useResizableColumns';
import { GATEWAY_PHASES } from '../../../gatewayConfig';
import {
  isGatewayLivePhase,
  isGatewayPhaseReadOnly,
  getGatewayPhaseIndex,
  shouldWipeInquiriesOnItemEdit,
} from '../../../gatewayService';
import { ORDER_TABS } from '../../../config';
import {
  calculateQuotingPreview,
  getEmptyQuickInquiryDraft,
  getOrderQuoting,
  getTargetInquiry,
  inquiryToQuickDraft,
  validateQuickInquiryDraft,
} from '../../../inquiryService';
import { MARGIN_MODES } from '../../../quotingConfig';
import { canViewSupplierIdentity, DEFAULT_SALE_TYPE } from '../../../constants';
import {
  canEditInquiryPrices,
  canEditOrderLineFields,
  canEditProfitMargin,
  SENSITIVE_WIPE_CONFIRM_MESSAGE,
} from '../../../orderEditPermissions';
import { getSupplierName, listSuppliers } from '../../../suppliers';
import { SUPPLY_CHANNEL_TYPES } from '../../../inquiryConfig';
import {
  JarianMoney,
  JarianProductCell,
  JarianSupplier,
} from '../../../../../components/jarian/JarianPresentation';
import { formatMarginCellValue, LineMarginCell, QuotingMatrix, SalePriceColumnHeader, SUPPLY_TYPE_DOT_CLASS } from '../../quickInquiryParts';
import MoneyInput from '../../MoneyInput';
import OrderProfileConfirmDialog from '../OrderProfileConfirmDialog';

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function buildColumns(viewPhase, saleColumnLabel) {
  if (viewPhase === GATEWAY_PHASES.PISHKESH) {
    return [
      { key: 'row', label: 'ردیف', group: 'base', defaultWidth: 56, resizable: false },
      { key: 'name', label: 'شرح کالا', group: 'base', defaultWidth: 280 },
      { key: 'qty', label: 'مقدار', group: 'base', defaultWidth: 90 },
      { key: 'unit', label: 'واحد', group: 'base', defaultWidth: 90 },
      { key: 'sale', label: saleColumnLabel, group: 'sale', defaultWidth: 160 },
      { key: 'total', label: 'قیمت کل', group: 'sale', defaultWidth: 160 },
    ];
  }

  if (viewPhase === GATEWAY_PHASES.MOZENE) {
    return [
      { key: 'row', label: 'ردیف', group: 'base', defaultWidth: 56, resizable: false },
      { key: 'name', label: 'شرح کالا', group: 'base', defaultWidth: 260 },
      { key: 'qty', label: 'مقدار', group: 'base', defaultWidth: 80 },
      { key: 'unit', label: 'واحد', group: 'base', defaultWidth: 80 },
      { key: 'buy', label: 'قیمت خرید', group: 'supply', defaultWidth: 140 },
      { key: 'margin', label: 'حاشیه سود', group: 'sale', defaultWidth: 160 },
      { key: 'sale', label: saleColumnLabel, group: 'sale', defaultWidth: 150 },
    ];
  }

  if (viewPhase === GATEWAY_PHASES.KAVOSH) {
    return [
      { key: 'row', label: 'ردیف', group: 'base', defaultWidth: 56, resizable: false },
      { key: 'name', label: 'شرح کالا', group: 'base', defaultWidth: 260 },
      { key: 'qty', label: 'مقدار', group: 'base', defaultWidth: 80 },
      { key: 'unit', label: 'واحد', group: 'base', defaultWidth: 80 },
      { key: 'supplier', label: 'تامین‌کننده', group: 'supply', defaultWidth: 180 },
      { key: 'buy', label: 'قیمت خرید', group: 'supply', defaultWidth: 140 },
      { key: 'expand', label: '', group: 'base', defaultWidth: 48, resizable: false },
    ];
  }

  return [
    { key: 'row', label: 'ردیف', group: 'base', defaultWidth: 56, resizable: false },
    { key: 'name', label: 'شرح کالا', group: 'base', defaultWidth: 280 },
    { key: 'qty', label: 'مقدار', group: 'base', defaultWidth: 100 },
    { key: 'unit', label: 'واحد', group: 'base', defaultWidth: 100 },
  ];
}

function InquiryDraftRow({
  initialDraft,
  onSave,
  onCancel,
  showSupplier,
  submitLabel = 'ثبت',
}) {
  const [draft, setDraft] = useState(() => initialDraft || getEmptyQuickInquiryDraft());
  const suppliers = listSuppliers();

  const handleSave = () => {
    const validation = validateQuickInquiryDraft(draft);
    if (!validation.valid) {
      window.alert(validation.reason || 'اطلاعات استعلام کامل نیست.');
      return;
    }
    onSave(draft);
  };

  return (
    <div className="gateway-inquiry-draft">
      <select
        className="gateway-inquiry-draft__input"
        value={draft.supplyType}
        onChange={(e) => setDraft((prev) => ({ ...prev, supplyType: e.target.value }))}
        aria-label="نوع تامین"
      >
        {SUPPLY_CHANNEL_TYPES.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      <select
        className="gateway-inquiry-draft__input"
        value={draft.supplierId}
        onChange={(e) => setDraft((prev) => ({ ...prev, supplierId: Number(e.target.value) || '' }))}
        aria-label={showSupplier ? 'تامین‌کننده' : 'مرجع تامین'}
      >
        <option value="">{showSupplier ? 'تامین‌کننده...' : 'مرجع تامین...'}</option>
        {suppliers.map((supplier, index) => (
          <option key={supplier.id} value={supplier.id}>
            {showSupplier ? (supplier.companyName || supplier.personName) : `تامین‌کننده ${index + 1}`}
          </option>
        ))}
      </select>
      <MoneyInput
        className="gateway-inquiry-draft__input gateway-inquiry-draft__input--price"
        value={draft.unitPrice}
        onChange={(unitPrice) => setDraft((prev) => ({ ...prev, unitPrice }))}
        placeholder="قیمت خرید"
        aria-label="قیمت خرید"
      />
      <input
        type="text"
        className="gateway-inquiry-draft__input gateway-inquiry-draft__input--notes"
        value={draft.notes || ''}
        onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
        placeholder="توضیحات (اختیاری)"
        aria-label="توضیحات استعلام"
      />
      <div className="gateway-inquiry-draft__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={handleSave}>{submitLabel}</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>انصراف</button>
      </div>
    </div>
  );
}

function CheckIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function getInquirySupplierLabel(inquiry, inquiryIndex, showSupplier) {
  if (showSupplier) return getSupplierName(inquiry.supplierId);
  return `تامین‌کننده ${(inquiryIndex + 1).toLocaleString('fa-IR')}`;
}

function InquiryGridRow({
  inquiry,
  inquiryIndex,
  isTarget,
  canManage,
  showSupplier,
  onSelect,
  onEdit,
  onDelete,
}) {
  const supplierLabel = getInquirySupplierLabel(inquiry, inquiryIndex, showSupplier);
  const notes = inquiry.notes?.trim() || '';
  const registeredAt = inquiry.registeredAt || '';

  return (
    <div className={`gateway-inquiry-grid${isTarget ? ' is-selected' : ''}`}>
      <div className="gateway-inquiry-grid__content">
        {isTarget && (
          <span className="gateway-inquiry-grid__tick" aria-hidden="true">
            <CheckIcon size={12} />
          </span>
        )}
        <span
          className={`gateway-inquiry-grid__dot gateway-inquiry-grid__type--${SUPPLY_TYPE_DOT_CLASS[inquiry.supplyType] || 'is-official'}`}
          title={inquiry.supplyType}
          aria-label={inquiry.supplyType}
        />
        {registeredAt ? (
          <span className="gateway-inquiry-grid__datetime font-yekan" title={registeredAt}>
            {registeredAt}
          </span>
        ) : null}
        <span className="gateway-inquiry-grid__name" title={supplierLabel}>{supplierLabel}</span>
        <span className="gateway-inquiry-grid__price">
          <JarianMoney amount={inquiry.unitPrice} />
        </span>
        {notes ? (
          <span className="gateway-inquiry-grid__notes">{notes}</span>
        ) : null}
      </div>
      <div className="gateway-inquiry-grid__actions">
        {canManage && (
          isTarget ? (
            <span className="gateway-inquiry-grid__winner">
              <CheckIcon size={11} />
              برگزیده
            </span>
          ) : (
            <button
              type="button"
              className="gateway-inquiry-grid__btn"
              onClick={() => onSelect?.(inquiry.id)}
            >
              انتخاب
            </button>
          )
        )}
        {canManage && (
          <button
            type="button"
            className="gateway-icon-btn gateway-icon-btn--sm"
            onClick={() => onEdit?.(inquiry.id)}
            aria-label="ویرایش استعلام"
            title="ویرایش استعلام"
          >
            <PencilIcon />
          </button>
        )}
        {canManage && (
          <button
            type="button"
            className="gateway-icon-btn gateway-icon-btn--danger gateway-icon-btn--sm"
            onClick={() => onDelete?.(inquiry.id)}
            aria-label="حذف استعلام"
            title="حذف استعلام"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}

function ChevronIcon({ expanded }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`gateway-expand-icon${expanded ? ' is-expanded' : ''}`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function RowHoverActions({ children, onClick }) {
  return (
    <div className="gateway-row-float-actions" onClick={onClick} role="presentation">
      {children}
    </div>
  );
}

function LockedText({ children }) {
  return <span className="gateway-table__locked">{children}</span>;
}

export default function GatewayMorphTable({
  order,
  viewPhase,
  orderPhase,
  onAddInquiry,
  onSetTargetInquiry,
  onDeleteInquiry,
  onUpdateInquiry,
  onSaveMargin,
  onUpdateQuoting,
  onEditItem,
  onDeleteItem,
}) {
  const [draftItemIndex, setDraftItemIndex] = useState(null);
  const [editingInquiryId, setEditingInquiryId] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: '', qty: '', unit: '', description: '' });
  const [pendingSensitiveEdit, setPendingSensitiveEdit] = useState(null);
  const [marginDrafts, setMarginDrafts] = useState({});

  const items = order.items || [];
  const quoting = getOrderQuoting(order);
  const preview = useMemo(() => calculateQuotingPreview(order), [order]);
  const saleType = preview.saleType || order.saleType || DEFAULT_SALE_TYPE;
  const isOfficialSale = saleType === 'رسمی';
  const vatInclusive = Boolean(preview.vatInclusive);
  const saleColumnLabel = isOfficialSale
    ? (vatInclusive ? 'قیمت با مالیات' : 'قیمت قبل از مالیات')
    : 'قیمت فروش';
  const showSupplier = canViewSupplierIdentity();
  const archived = Boolean(
    order?.saranjam?.archivedAt || order?.saranjam?.locked || order?.archivedAt,
  );
  const live = isGatewayLivePhase(orderPhase, viewPhase) && !archived;
  const isReadOnly = isGatewayPhaseReadOnly(orderPhase, viewPhase) || archived;
  const allowInquiryEdit = canEditInquiryPrices();
  const allowMarginEdit = canEditProfitMargin();
  const allowLineFieldEdit = canEditOrderLineFields();
  /* رهبر: ویرایش حاشیه در تب مظنه، وقتی سفارش جاری به مظنه رسیده باشد */
  const marginEditable = !archived
    && allowMarginEdit
    && viewPhase === GATEWAY_PHASES.MOZENE
    && order.status === ORDER_TABS.CURRENT
    && getGatewayPhaseIndex(orderPhase) >= getGatewayPhaseIndex(GATEWAY_PHASES.MOZENE);
  const isLineMarginMode = quoting.marginMode === MARGIN_MODES.LINE_FIXED_RIAL
    || quoting.marginMode === MARGIN_MODES.LINE_FIXED_PERCENT;
  const isLineMarginEditable = marginEditable && isLineMarginMode;
  const canToggleVatInclusive = allowMarginEdit
    && isOfficialSale
    && (viewPhase === GATEWAY_PHASES.MOZENE || viewPhase === GATEWAY_PHASES.PISHKESH)
    && getGatewayPhaseIndex(orderPhase) >= getGatewayPhaseIndex(GATEWAY_PHASES.MOZENE);

  const columns = useMemo(
    () => buildColumns(viewPhase, saleColumnLabel),
    [viewPhase, saleColumnLabel],
  );
  const { widths, startResize } = useResizableColumns(`gateway-${viewPhase}-v4`, columns);
  const totalCols = columns.length;

  const marginUnit = quoting.marginMode === MARGIN_MODES.ORDER_FIXED_PERCENT
    || quoting.marginMode === MARGIN_MODES.LINE_FIXED_PERCENT
    ? 'percent'
    : 'rial';

  useEffect(() => {
    setExpandedIndex(null);
    setDraftItemIndex(null);
    setEditingInquiryId(null);
    setEditingItemIndex(null);
    setPendingSensitiveEdit(null);
  }, [viewPhase]);

  useEffect(() => {
    setMarginDrafts({});
  }, [quoting.marginMode]);

  const openInquiryDraft = (itemIndex) => {
    if (!allowInquiryEdit || order.status !== ORDER_TABS.CURRENT) return;
    setExpandedIndex(itemIndex);
    setDraftItemIndex(itemIndex);
    setEditingInquiryId(null);
  };

  const openInquiryEdit = (itemIndex, inquiryId) => {
    if (!allowInquiryEdit || order.status !== ORDER_TABS.CURRENT) return;
    setExpandedIndex(itemIndex);
    setDraftItemIndex(itemIndex);
    setEditingInquiryId(inquiryId);
  };

  const closeInquiryDraft = () => {
    setDraftItemIndex(null);
    setEditingInquiryId(null);
  };

  const toggleExpand = (itemIndex) => {
    setExpandedIndex((prev) => {
      if (prev === itemIndex) {
        if (draftItemIndex === itemIndex) closeInquiryDraft();
        return null;
      }
      return itemIndex;
    });
  };

  const startEdit = (itemIndex) => {
    if (!allowLineFieldEdit) return;
    const item = items[itemIndex];
    setEditingItemIndex(itemIndex);
    setEditDraft({
      name: item.name || '',
      qty: item.qty ?? '',
      unit: item.unit || '',
      description: item.description || '',
    });
  };

  const buildEditPatch = () => ({
    name: editDraft.name.trim(),
    qty: Number(editDraft.qty) || 0,
    unit: editDraft.unit.trim(),
    description: editDraft.description.trim(),
  });

  const commitEdit = (itemIndex, patch, wipeConfirmed = false) => {
    onEditItem?.(itemIndex, patch, { wipeConfirmed });
    setEditingItemIndex(null);
    setPendingSensitiveEdit(null);
  };

  const saveEdit = (itemIndex) => {
    const patch = buildEditPatch();
    if (shouldWipeInquiriesOnItemEdit(order, itemIndex, patch)) {
      setPendingSensitiveEdit({ itemIndex, patch });
      return;
    }
    commitEdit(itemIndex, patch, false);
  };

  const showQuotingMatrix = viewPhase === GATEWAY_PHASES.MOZENE;

  const handleSaveMargin = (itemIndex, marginValue) => {
    if (!isLineMarginEditable) return;
    onSaveMargin?.(itemIndex, marginValue, marginUnit);
  };

  const isMarginSaved = (itemIndex) => {
    const raw = quoting.lineMargins?.[itemIndex];
    if (raw === '' || raw == null) return false;
    const num = Number(raw);
    return Number.isFinite(num);
  };

  const renderHeader = () => (
    <tr>
      {columns.map((col) => (
        <ResizableTh
          key={col.key}
          columnKey={col.key}
          resizable={col.resizable !== false}
          onResizeStart={startResize}
          className={`gateway-th gateway-th--${col.group}`}
        >
          {col.key === 'sale' && isOfficialSale ? (
            <SalePriceColumnHeader
              saleType={saleType}
              vatInclusive={vatInclusive}
              showToggle
              disabled={!canToggleVatInclusive}
              onChange={(next) => onUpdateQuoting?.({ vatInclusive: next })}
            />
          ) : (
            col.label
          )}
        </ResizableTh>
      ))}
    </tr>
  );

  const renderElamRow = (item, itemIndex) => {
    const isEditing = editingItemIndex === itemIndex && live && allowLineFieldEdit;

    if (isEditing) {
      return (
        <tr key={itemIndex} className="gateway-table__row gateway-table__row--editing">
          <td>{(itemIndex + 1).toLocaleString('fa-IR')}</td>
          <td className="gateway-table__text">
            <input
              className="gateway-table__inline-input"
              value={editDraft.name}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
              aria-label="شرح کالا"
              placeholder="شرح کالا"
            />
            <input
              className="gateway-table__inline-input"
              style={{ marginTop: '0.35rem' }}
              value={editDraft.description}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
              aria-label="توضیحات"
              placeholder="توضیحات"
            />
          </td>
          <td>
            <input
              type="number"
              min="0"
              className="gateway-table__inline-input gateway-table__inline-input--narrow"
              value={editDraft.qty}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, qty: e.target.value }))}
              aria-label="مقدار"
            />
          </td>
          <td className="gateway-table__cell-actions-host">
            <input
              className="gateway-table__inline-input gateway-table__inline-input--narrow"
              value={editDraft.unit}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, unit: e.target.value }))}
              aria-label="واحد"
            />
            <RowHoverActions>
              <button type="button" className="gateway-icon-btn gateway-icon-btn--save" onClick={() => saveEdit(itemIndex)} aria-label="ذخیره">✓</button>
              <button type="button" className="gateway-icon-btn" onClick={() => setEditingItemIndex(null)} aria-label="انصراف">×</button>
            </RowHoverActions>
          </td>
        </tr>
      );
    }

    return (
      <tr key={itemIndex} className="gateway-table__row gateway-table__row--hoverable">
        <td>{(itemIndex + 1).toLocaleString('fa-IR')}</td>
        <td className="gateway-table__text gateway-table__cell-actions-host">
          <JarianProductCell name={item.name} description={item.description} />
          {live && allowLineFieldEdit && (
            <RowHoverActions>
              <button
                type="button"
                className="gateway-icon-btn"
                onClick={() => startEdit(itemIndex)}
                aria-label="ویرایش کالا"
                title="ویرایش کالا"
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                className="gateway-icon-btn gateway-icon-btn--danger"
                onClick={() => onDeleteItem?.(itemIndex)}
                aria-label="حذف کالا"
                title="حذف کالا"
              >
                <TrashIcon />
              </button>
            </RowHoverActions>
          )}
        </td>
        <td>{item.qty?.toLocaleString('fa-IR') ?? '—'}</td>
        <td>{item.unit || '—'}</td>
      </tr>
    );
  };

  const renderKavoshRows = (item, itemIndex) => {
    const target = getTargetInquiry(item);
    const inquiries = item.inquiries || [];
    const canManage = allowInquiryEdit
      && order.status === ORDER_TABS.CURRENT
      && (live || viewPhase === GATEWAY_PHASES.KAVOSH);
    const isDraftOpen = draftItemIndex === itemIndex;
    const isExpanded = expandedIndex === itemIndex;
    const targetIndex = target
      ? inquiries.findIndex((inq) => inq.id === target.id)
      : -1;

    return (
      <>
        <tr
          key={`main-${itemIndex}`}
          className={`gateway-table__row gateway-table__row--master gateway-table__row--expandable${target ? ' has-target' : ''}${isExpanded ? ' is-expanded' : ''}`}
        >
          <td>{(itemIndex + 1).toLocaleString('fa-IR')}</td>
          <td className="gateway-table__text">
            <LockedText>
              <JarianProductCell name={item.name} description={item.description} />
            </LockedText>
          </td>
          <td><LockedText>{item.qty?.toLocaleString('fa-IR') ?? '—'}</LockedText></td>
          <td><LockedText>{item.unit || '—'}</LockedText></td>
          <td className="gateway-table__text gateway-td--supply">
            {target ? (
              <JarianSupplier
                name={getInquirySupplierLabel(target, targetIndex, showSupplier)}
                supplyType={target.supplyType}
              />
            ) : (
              <span className="gateway-table__muted">—</span>
            )}
          </td>
          <td className="gateway-table__num gateway-td--supply gateway-table__cell-actions-host jarian-td-money">
            {target ? (
              <JarianMoney amount={target.unitPrice} emphasis />
            ) : (
              <span className="gateway-table__muted">—</span>
            )}
            {canManage && (
              <RowHoverActions onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="gateway-icon-btn gateway-icon-btn--add"
                  onClick={() => openInquiryDraft(itemIndex)}
                  aria-label="ثبت استعلام جدید"
                  title="ثبت استعلام جدید"
                >
                  <PlusIcon />
                </button>
              </RowHoverActions>
            )}
          </td>
          <td className="gateway-table__expand">
            <button
              type="button"
              className="gateway-expand-btn"
              onClick={() => toggleExpand(itemIndex)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'بستن استعلام‌ها' : 'نمایش استعلام‌ها'}
            >
              <ChevronIcon expanded={isExpanded} />
            </button>
          </td>
        </tr>
        {isExpanded && (
          <tr key={`sub-${itemIndex}`} className="gateway-table__subrow">
            <td colSpan={totalCols}>
              <div className="gateway-subrow__inner" onClick={(e) => e.stopPropagation()}>
                {inquiries.length === 0 && !isDraftOpen && (
                  <span className="gateway-subrow__empty">استعلامی برای این کالا ثبت نشده است.</span>
                )}
                {inquiries.length > 0 && (
                  <div className="gateway-inquiry-sheet">
                    <div className="gateway-inquiry-grid gateway-inquiry-grid--head" aria-hidden="true">
                      <span className="gateway-inquiry-grid__content">تامین‌کننده · قیمت اعلامی · توضیحات</span>
                      <span className="gateway-inquiry-grid__actions">عملیات</span>
                    </div>
                    {inquiries.map((inq, inquiryIndex) => (
                      isDraftOpen && editingInquiryId === inq.id ? (
                        <InquiryDraftRow
                          key={`edit-${inq.id}`}
                          initialDraft={inquiryToQuickDraft(inq)}
                          showSupplier={showSupplier}
                          submitLabel="ذخیره"
                          onSave={(draft) => {
                            onUpdateInquiry?.(itemIndex, inq.id, draft);
                            closeInquiryDraft();
                          }}
                          onCancel={closeInquiryDraft}
                        />
                      ) : (
                        <InquiryGridRow
                          key={inq.id}
                          inquiry={inq}
                          inquiryIndex={inquiryIndex}
                          isTarget={target?.id === inq.id}
                          canManage={canManage}
                          showSupplier={showSupplier}
                          onSelect={(inquiryId) => onSetTargetInquiry?.(itemIndex, inquiryId)}
                          onEdit={(inquiryId) => openInquiryEdit(itemIndex, inquiryId)}
                          onDelete={(inquiryId) => onDeleteInquiry?.(itemIndex, inquiryId)}
                        />
                      )
                    ))}
                  </div>
                )}
                {isDraftOpen && canManage && editingInquiryId == null && (
                  <InquiryDraftRow
                    key={`new-${itemIndex}`}
                    showSupplier={showSupplier}
                    onSave={(draft) => {
                      onAddInquiry?.(itemIndex, draft);
                      closeInquiryDraft();
                    }}
                    onCancel={closeInquiryDraft}
                  />
                )}
                {canManage && !isDraftOpen && (
                  <div className="gateway-subrow__footer">
                    <button
                      type="button"
                      className="gateway-add-inquiry-btn"
                      onClick={() => setDraftItemIndex(itemIndex)}
                    >
                      <PlusIcon />
                      + افزودن استعلام
                    </button>
                  </div>
                )}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  const renderMozeneRow = (item, itemIndex) => {
    const linePreview = preview.lines[itemIndex] || {};
    const target = getTargetInquiry(item);
    const isEditing = editingItemIndex === itemIndex && live && allowLineFieldEdit;

    if (isEditing) {
      return (
        <tr key={itemIndex} className="gateway-table__row gateway-table__row--editing">
          <td>{(itemIndex + 1).toLocaleString('fa-IR')}</td>
          <td className="gateway-table__text">
            <input
              className="gateway-table__inline-input"
              value={editDraft.name}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
              aria-label="شرح کالا"
              placeholder="شرح کالا"
            />
            <input
              className="gateway-table__inline-input"
              style={{ marginTop: '0.35rem' }}
              value={editDraft.description}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
              aria-label="توضیحات"
              placeholder="توضیحات"
            />
          </td>
          <td>
            <input
              type="number"
              min="0"
              className="gateway-table__inline-input gateway-table__inline-input--narrow"
              value={editDraft.qty}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, qty: e.target.value }))}
              aria-label="مقدار"
            />
          </td>
          <td className="gateway-table__cell-actions-host">
            <input
              className="gateway-table__inline-input gateway-table__inline-input--narrow"
              value={editDraft.unit}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, unit: e.target.value }))}
              aria-label="واحد"
            />
            <RowHoverActions>
              <button type="button" className="gateway-icon-btn gateway-icon-btn--save" onClick={() => saveEdit(itemIndex)} aria-label="ذخیره">✓</button>
              <button type="button" className="gateway-icon-btn" onClick={() => { setEditingItemIndex(null); setPendingSensitiveEdit(null); }} aria-label="انصراف">×</button>
            </RowHoverActions>
          </td>
          <td className="gateway-table__muted">—</td>
          <td className="gateway-table__muted">—</td>
          <td className="gateway-table__muted">—</td>
        </tr>
      );
    }

    return (
      <tr key={itemIndex} className="gateway-table__row gateway-table__row--hoverable">
        <td>{(itemIndex + 1).toLocaleString('fa-IR')}</td>
        <td className="gateway-table__text gateway-table__cell-actions-host">
          <LockedText>
            <JarianProductCell name={item.name} description={item.description} />
          </LockedText>
          {live && allowLineFieldEdit && (
            <RowHoverActions>
              <button
                type="button"
                className="gateway-icon-btn"
                onClick={() => startEdit(itemIndex)}
                aria-label="ویرایش کالا"
                title="ویرایش کالا"
              >
                <PencilIcon />
              </button>
            </RowHoverActions>
          )}
        </td>
        <td><LockedText>{item.qty?.toLocaleString('fa-IR') ?? '—'}</LockedText></td>
        <td><LockedText>{item.unit || '—'}</LockedText></td>
        <td className="gateway-table__num gateway-td--supply jarian-td-money">
          {target ? <JarianMoney amount={target.unitPrice} /> : '—'}
        </td>
        <td className="gateway-td--sale">
          {isLineMarginEditable ? (
            <LineMarginCell
              value={marginDrafts[itemIndex] ?? linePreview.marginInputValue ?? ''}
              unit={marginUnit}
              saved={isMarginSaved(itemIndex)}
              onValueChange={(nextValue) => {
                setMarginDrafts((prev) => ({ ...prev, [itemIndex]: nextValue }));
              }}
              onSave={() => {
                const nextValue = marginDrafts[itemIndex] ?? linePreview.marginInputValue ?? '';
                handleSaveMargin(itemIndex, nextValue);
              }}
            />
          ) : (
            <span className="gateway-table__margin-badge">
              {formatMarginCellValue(quoting.marginMode, linePreview)}
            </span>
          )}
        </td>
        <td className="gateway-table__num gateway-td--sale jarian-td-money">
          {linePreview.hasTarget && linePreview.saleUnitPrice > 0
            ? <JarianMoney amount={linePreview.saleUnitPrice} emphasis />
            : '—'}
        </td>
      </tr>
    );
  };

  const renderPishkeshRow = (item, itemIndex) => {
    const linePreview = preview.lines[itemIndex] || {};

    return (
      <tr key={itemIndex} className="gateway-table__row">
        <td>{(itemIndex + 1).toLocaleString('fa-IR')}</td>
        <td className="gateway-table__text">
          <JarianProductCell name={item.name} description={item.description} />
        </td>
        <td>{item.qty?.toLocaleString('fa-IR') ?? '—'}</td>
        <td>{item.unit || '—'}</td>
        <td className="gateway-table__num gateway-td--sale jarian-td-money">
          {linePreview.hasTarget ? <JarianMoney amount={linePreview.saleUnitPrice} /> : '—'}
        </td>
        <td className="gateway-table__num gateway-td--sale jarian-td-money">
          {linePreview.hasTarget ? <JarianMoney amount={linePreview.lineTotal} emphasis /> : '—'}
        </td>
      </tr>
    );
  };

  const renderBody = () => {
    if (items.length === 0) {
      return (
        <tr>
          <td colSpan={totalCols} className="gateway-table__empty">اقلامی ثبت نشده است.</td>
        </tr>
      );
    }

    return items.map((item, itemIndex) => {
      if (viewPhase === GATEWAY_PHASES.KAVOSH) return renderKavoshRows(item, itemIndex);
      if (viewPhase === GATEWAY_PHASES.MOZENE) return renderMozeneRow(item, itemIndex);
      return renderPishkeshRow(item, itemIndex);
    });
  };

  return (
    <div className={`gateway-morph${isReadOnly ? ' gateway-morph--readonly' : ''}`}>
      {showQuotingMatrix && (
        <QuotingMatrix
          quoting={quoting}
          namePrefix={`order-${order.id}`}
          readOnly={!marginEditable}
          onChangeMode={(marginMode) => onUpdateQuoting?.({ marginMode })}
          onChangeOrderValue={(orderMarginValue) => onUpdateQuoting?.({ orderMarginValue })}
        />
      )}

      <div className="gateway-table-wrap">
        <table className="gateway-table jarian-table">
          <ResizableColGroup columns={columns} widths={widths} />
          <thead>{renderHeader()}</thead>
          <tbody>{renderBody()}</tbody>
        </table>
      </div>

      <OrderProfileConfirmDialog
        open={Boolean(pendingSensitiveEdit)}
        title="بازنشانی قیمت‌های استعلامی"
        message={SENSITIVE_WIPE_CONFIRM_MESSAGE}
        confirmLabel="تایید و ادامه"
        onConfirm={() => {
          if (!pendingSensitiveEdit) return;
          commitEdit(pendingSensitiveEdit.itemIndex, pendingSensitiveEdit.patch, true);
        }}
        onCancel={() => setPendingSensitiveEdit(null)}
      />
    </div>
  );
}
