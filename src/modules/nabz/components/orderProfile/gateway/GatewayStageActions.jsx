import { GATEWAY_PHASES } from '../../../gatewayConfig';
import {
  GATEWAY_STAGE_ACTIONS,
  canAdvanceGatewayPhase,
} from '../../../gatewayLifecycleService';
import { isGatewayActivePhase } from '../../../gatewayService';

export default function GatewayStageActions({
  order,
  viewPhase,
  orderPhase,
  onAdvance,
}) {
  const live = isGatewayActivePhase(orderPhase, viewPhase);
  const actionMeta = GATEWAY_STAGE_ACTIONS[viewPhase];
  const showBar = live && actionMeta && viewPhase !== GATEWAY_PHASES.PISHKESH;

  if (!showBar) return null;

  const { ok } = canAdvanceGatewayPhase(order, viewPhase);

  return (
    <footer className="gateway-stage-actions">
      <button
        type="button"
        className="btn btn--primary gateway-stage-actions__btn"
        disabled={!ok}
        onClick={() => onAdvance?.(viewPhase)}
      >
        {actionMeta.label}
      </button>
    </footer>
  );
}
