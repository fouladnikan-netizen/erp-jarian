import { Link } from 'react-router-dom';
import { toDisplayOrderCode } from '../../orderCode';
import { getOrderDisplayStatus, getOrderDisplayStatusKind } from '../../orderStageService';
import { getOrderProfilePrimaryActions } from '../../orderProfileService';
import { getProformaTerms } from '../../proformaService';
import { openProformaPreview, printProforma } from '../../proformaPrint';
import OrderProfileMoreMenu from './OrderProfileMoreMenu';

function handlePrimaryAction(actionId, order) {
  const terms = getProformaTerms(order);
  if (actionId === 'print-proforma') {
    printProforma(order, terms);
    return;
  }
  if (actionId === 'confirm-final') {
    window.alert('تایید نهایی سفارش — در نسخه بعدی به گردش کار متصل می‌شود.');
  }
}

export default function OrderProfileHeader({
  order,
  breadcrumb,
  onCancelOrder,
  onEditOrder,
}) {
  const statusKind = getOrderDisplayStatusKind(order);
  const primaryActions = getOrderProfilePrimaryActions(order);

  return (
    <div className="order-profile-header-wrap">
      <nav className="order-profile-breadcrumb" aria-label="مسیر ناوبری">
        {breadcrumb.map((crumb, index) => {
          const isLast = index === breadcrumb.length - 1;
          if (isLast) {
            return (
              <span key={crumb.label} className="order-profile-breadcrumb__current" aria-current="page">
                {crumb.label}
              </span>
            );
          }
          return (
            <span key={crumb.label} className="order-profile-breadcrumb__segment">
              {crumb.to ? (
                <Link to={crumb.to} className="order-profile-breadcrumb__link">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
              <span className="order-profile-breadcrumb__sep" aria-hidden="true">/</span>
            </span>
          );
        })}
      </nav>

      <header className="order-profile-header">
        <div className="order-profile-header__identity">
          <h1 className="order-profile-header__customer">{order.customer}</h1>
          <p className="order-profile-header__code">{toDisplayOrderCode(order.code)}</p>
        </div>

        <div className="order-profile-header__status">
          <span className={`order-profile-status order-profile-status--${statusKind}`}>
            {getOrderDisplayStatus(order)}
          </span>
        </div>

        <div className="order-profile-header__actions">
          {primaryActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={action.variant === 'primary' ? 'btn btn--primary' : 'btn btn--outline'}
              onClick={() => handlePrimaryAction(action.id, order)}
            >
              {action.label}
            </button>
          ))}
          {order.stageId >= 4 && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => openProformaPreview(order, getProformaTerms(order))}
            >
              پیش‌نمایش
            </button>
          )}
          <OrderProfileMoreMenu onEdit={onEditOrder} onCancel={onCancelOrder} />
        </div>
      </header>
    </div>
  );
}
