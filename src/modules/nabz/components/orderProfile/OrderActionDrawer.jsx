import { useEffect, useRef } from 'react';
import { toDisplayOrderCode } from '../../orderCode';
import GatewayDecisionPanel from './gateway/GatewayDecisionPanel';

export default function OrderActionDrawer({
  open,
  order,
  viewPhase,
  orderPhase,
  onClose,
  onSubmitSuccess,
  onSubmitFailed,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  const displayCode = toDisplayOrderCode(order.code);

  return (
    <div
      className="order-action-drawer-overlay"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="order-action-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="تعیین تکلیف"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="order-action-drawer__header">
          <div className="order-action-drawer__heading">
            <h2 className="order-action-drawer__title font-meem">تعیین تکلیف</h2>
            <p className="order-action-drawer__code font-yekan" title={displayCode}>
              {displayCode}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="order-action-drawer__close"
            aria-label="بستن"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="order-action-drawer__body">
          <GatewayDecisionPanel
            order={order}
            viewPhase={viewPhase}
            orderPhase={orderPhase}
            onSubmitSuccess={(payload) => {
              onSubmitSuccess?.(payload);
              onClose?.();
            }}
            onSubmitFailed={(payload) => {
              onSubmitFailed?.(payload);
              onClose?.();
            }}
          />
        </div>
      </aside>
    </div>
  );
}
