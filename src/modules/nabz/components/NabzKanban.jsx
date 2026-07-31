import { useMemo, useState } from 'react';
import { ORDER_TABS, STAGE_TINTS } from '../config';
import { formatOrderAmount } from '../orderCode';
import { UNPRICED_LABEL } from '../constants';
import {
  canDropOnKanbanStage,
  getEffectiveStageId,
  MOZENE_LOCKED_MESSAGE,
} from '../orderStageService';
import ProformaRevisionTag, { getProformaRevisionNumber } from './ProformaRevisionTag';

export default function NabzKanban({
  orders,
  stages,
  tab,
  onOrderClick,
  onCustomerClick,
  onStageChange,
  onStageReject,
  stageRejectMessage,
}) {
  const [draggingOrderId, setDraggingOrderId] = useState(null);
  const [dragOverStageId, setDragOverStageId] = useState(null);
  const [rejectStageId, setRejectStageId] = useState(null);

  const isPhase2Only = tab === ORDER_TABS.SUCCESS;
  const isSalesBoard = tab === ORDER_TABS.CURRENT;

  const ordersByStage = useMemo(() => {
    const grouped = new Map(stages.map((stage) => [stage.id, []]));
    orders.forEach((order) => {
      const stageId = getEffectiveStageId(order);
      if (!grouped.has(stageId)) grouped.set(stageId, []);
      grouped.get(stageId).push(order);
    });
    return grouped;
  }, [orders, stages]);

  const handleDragStart = (orderId) => {
    setDraggingOrderId(orderId);
  };

  const handleDragEnd = () => {
    setDraggingOrderId(null);
    setDragOverStageId(null);
  };

  const handleDragOver = (event, stageId) => {
    event.preventDefault();
    setDragOverStageId(stageId);
  };

  const handleDrop = (event, stageId) => {
    event.preventDefault();
    const orderId = Number(event.dataTransfer.getData('text/order-id') || draggingOrderId);
    const order = orders.find((item) => item.id === orderId);
    setDragOverStageId(null);
    setDraggingOrderId(null);

    if (!order || !onStageChange) return;

    if (!canDropOnKanbanStage(order, stageId)) {
      setRejectStageId(stageId);
      onStageReject?.(MOZENE_LOCKED_MESSAGE);
      window.setTimeout(() => setRejectStageId(null), 900);
      return;
    }

    onStageChange(orderId, stageId);
  };

  return (
    <section className="nabz-kanban-section" aria-label="نمای کانبان سفارشات">
      <div className="nabz-kanban-header">
        <span className="nabz-kanban-header__title">
          {isSalesBoard ? 'کارزار فروش — فاز پیش‌کش' : isPhase2Only ? 'کانبان فاز تحقق' : 'کانبان سفارشات'}
        </span>
        <span className="nabz-kanban-header__meta">
          {orders.length.toLocaleString('fa-IR')} سفارش
          {' · '}
          {stages.length.toLocaleString('fa-IR')} مرحله
        </span>
      </div>

      {stageRejectMessage && (
        <p className="nabz-kanban-reject" role="alert">{stageRejectMessage}</p>
      )}

      {isSalesBoard && (
        <div className="nabz-kanban-phases nabz-kanban-phases--single" aria-hidden="true">
          <span className="nabz-kanban-phases__label nabz-kanban-phases__label--p1">
            فاز اول — کارزار فروش (کاوش تا پیش‌کش)
          </span>
        </div>
      )}

      {isPhase2Only && (
        <div className="nabz-kanban-phases nabz-kanban-phases--single" aria-hidden="true">
          <span className="nabz-kanban-phases__label nabz-kanban-phases__label--p2">
            فاز دوم — تحقق و عملیات (ماشه تأمین تا سرانجام)
          </span>
        </div>
      )}

      <div className="nabz-kanban-board">
        {stages.map((stage) => {
          const columnOrders = ordersByStage.get(stage.id) || [];
          const stageAccent = (STAGE_TINTS[stage.id] || STAGE_TINTS[1]).accent;

          return (
            <div
              key={stage.id}
              className={`nabz-kanban-col${dragOverStageId === stage.id ? ' is-drag-over' : ''}${rejectStageId === stage.id ? ' is-reject' : ''}`}
              style={{ '--stage-color': stageAccent }}
              onDragOver={(event) => handleDragOver(event, stage.id)}
              onDragLeave={() => setDragOverStageId((current) => (current === stage.id ? null : current))}
              onDrop={(event) => handleDrop(event, stage.id)}
            >
              <header className="nabz-kanban-col__head">
                <span className="nabz-kanban-col__title">{stage.label}</span>
                <span className="nabz-kanban-col__count">
                  {columnOrders.length.toLocaleString('fa-IR')}
                </span>
              </header>
              <ul className="nabz-kanban-col__cards">
                {columnOrders.length === 0 && (
                  <li className="nabz-kanban-col__empty-state" aria-hidden="true">
                    سفارش را اینجا رها کنید
                  </li>
                )}
                {columnOrders.map((order) => {
                  const tint = STAGE_TINTS[getEffectiveStageId(order)] || STAGE_TINTS[1];

                  return (
                    <li key={order.id}>
                      <div
                        className={`nabz-kanban-card-wrap${draggingOrderId === order.id ? ' is-dragging' : ''}`}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/order-id', String(order.id));
                          event.dataTransfer.effectAllowed = 'move';
                          handleDragStart(order.id);
                        }}
                        onDragEnd={handleDragEnd}
                      >
                        <button
                          type="button"
                          className="nabz-kanban-card"
                          style={{
                            '--card-tint': tint.bg,
                            '--card-accent': tint.accent,
                          }}
                          onClick={() => onOrderClick(order)}
                        >
                          <div className="nabz-kanban-card__top">
                            <span className="nabz-kanban-card__top-main">
                              {order.customerId ? (
                                <button
                                  type="button"
                                  className="nabz-kanban-card__customer nabz-kanban-card__customer-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCustomerClick(order.customerId);
                                  }}
                                >
                                  {order.customer}
                                </button>
                              ) : (
                                <span className="nabz-kanban-card__customer">{order.customer}</span>
                              )}
                              {getProformaRevisionNumber(order) != null && (
                                <ProformaRevisionTag order={order} className="proforma-revision-tag--kanban" />
                              )}
                            </span>
                            {/* تاریخ ثبت اولیه — گوشه بالا چپ، هم‌قرینه با تاریخ پیگیری کارت‌های افق */}
                            <span className="nabz-kanban-card__date" title="تاریخ ثبت اولیه">
                              {order.registeredDate || '—'}
                            </span>
                          </div>
                          <span className="nabz-kanban-card__assignee">
                            شوالیه: {order.assignee}
                          </span>
                          <div className="nabz-kanban-card__footer">
                            <span>{order.itemCount.toLocaleString('fa-IR')} آیتم</span>
                            <span>
                              {formatOrderAmount(order) || (
                                <span className="nabz-kanban-card__unpriced">{UNPRICED_LABEL}</span>
                              )}
                            </span>
                          </div>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
