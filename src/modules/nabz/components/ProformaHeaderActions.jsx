import {
  getProformaHeaderActions,
  shouldShowGatewayDecisionAction,
} from '../orderProfileService';
import { hasGatewayDecision } from '../gatewayDecisionService';

const DEFAULT_BUTTON_CLASS = 'btn btn--outline order-profile-activity-btn';

/**
 * دکمه‌های پیش‌فاکتور + تعیین تکلیف — منبع واحد UI برای پروفایل و نمایش سریع.
 * منطق نمایش از getProformaHeaderActions / shouldShowGatewayDecisionAction می‌آید.
 */
export default function ProformaHeaderActions({
  order,
  active = true,
  buttonClassName = DEFAULT_BUTTON_CLASS,
  onIssue,
  onView,
  onUpdate,
  onDecision,
}) {
  if (!active || !order) return null;

  const {
    showIssue,
    showView,
    showUpdate,
  } = getProformaHeaderActions(order);
  const showDecision = shouldShowGatewayDecisionAction(order);
  const decisionLabel = hasGatewayDecision(order)
    ? 'مشاهده نتیجه تعیین تکلیف'
    : 'تعیین تکلیف';

  if (!showIssue && !showView && !showUpdate && !showDecision) {
    return null;
  }

  return (
    <>
      {showIssue && (
        <button
          type="button"
          className={buttonClassName}
          onClick={() => onIssue?.()}
        >
          صدور پیش‌فاکتور
        </button>
      )}
      {showView && (
        <button
          type="button"
          className={buttonClassName}
          onClick={() => onView?.()}
        >
          نمایش پیش‌فاکتور
        </button>
      )}
      {showUpdate && (
        <button
          type="button"
          className={buttonClassName}
          onClick={() => onUpdate?.()}
        >
          به‌روزرسانی پیش‌فاکتور
        </button>
      )}
      {showDecision && (
        <button
          type="button"
          className={buttonClassName}
          onClick={() => onDecision?.()}
        >
          {decisionLabel}
        </button>
      )}
    </>
  );
}
