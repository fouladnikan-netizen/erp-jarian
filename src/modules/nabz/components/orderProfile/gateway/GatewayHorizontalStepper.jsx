import { GATEWAY_PHASE_META, GATEWAY_PHASE_ORDER } from '../../../gatewayConfig';
import { getGatewayStepStateForProfile } from '../../../gatewayService';
import {
  OPERATIONAL_PHASE_META,
  OPERATIONAL_PHASE_ORDER,
} from '../../../phase2Config';
import {
  getOperationalStepStateForProfile,
  shouldShowOperationalPhases,
} from '../../../phase2Service';

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ChevronStep({
  phaseKey,
  stepNumber,
  label,
  subtitle,
  status,
  clickable,
  isFirst,
  isLast,
  stepZ,
  onClick,
}) {
  return (
    <li
      className={[
        'gateway-chevron-stepper__step',
        `gateway-chevron-stepper__step--${status}`,
        isFirst && 'gateway-chevron-stepper__step--first',
        isLast && 'gateway-chevron-stepper__step--last',
      ].filter(Boolean).join(' ')}
      style={{ '--step-z': stepZ }}
    >
      <button
        type="button"
        className="gateway-chevron-stepper__btn"
        disabled={!clickable}
        aria-current={status === 'active' ? 'step' : undefined}
        aria-label={`${stepNumber}. ${label} — ${subtitle}`}
        onClick={() => clickable && onClick()}
      >
        {status === 'completed' && <CheckIcon />}
        {status === 'active' && (
          <span className="gateway-chevron-stepper__active-dot" aria-hidden="true" />
        )}
        <span className="gateway-chevron-stepper__text">
          {stepNumber}. {label}
        </span>
      </button>
    </li>
  );
}

export default function GatewayHorizontalStepper({
  order,
  orderPhase,
  viewPhase,
  viewMode,
  operationalPhase,
  operationalViewPhase,
  onPhaseChange,
  onOperationalPhaseChange,
}) {
  const showOperational = shouldShowOperationalPhases(order);
  const gatewayCount = GATEWAY_PHASE_ORDER.length;
  const operationalCount = showOperational ? OPERATIONAL_PHASE_ORDER.length : 0;
  const totalSteps = gatewayCount + operationalCount;

  return (
    <nav className="gateway-chevron-stepper" aria-label="مراحل گذرگاه سفارش">
      <ol className={`gateway-chevron-stepper__track${showOperational ? ' gateway-chevron-stepper__track--extended' : ''}`}>
        {GATEWAY_PHASE_ORDER.map((phase, index) => {
          const meta = GATEWAY_PHASE_META[phase];
          const { status, clickable } = getGatewayStepStateForProfile(
            orderPhase,
            viewPhase,
            phase,
            { isSuccess: showOperational, viewMode },
          );
          const stepNumber = (index + 1).toLocaleString('fa-IR');

          return (
            <ChevronStep
              key={phase}
              phaseKey={phase}
              stepNumber={stepNumber}
              label={meta.label}
              subtitle={meta.subtitle}
              status={status}
              clickable={clickable}
              isFirst={index === 0}
              isLast={!showOperational && index === gatewayCount - 1}
              stepZ={totalSteps - index}
              onClick={() => onPhaseChange(phase)}
            />
          );
        })}
        {showOperational && OPERATIONAL_PHASE_ORDER.map((phase, index) => {
          const meta = OPERATIONAL_PHASE_META[phase];
          const { status, clickable } = getOperationalStepStateForProfile(
            operationalPhase,
            operationalViewPhase,
            phase,
            { viewMode },
          );
          const stepNumber = (gatewayCount + index + 1).toLocaleString('fa-IR');
          const stepIndex = gatewayCount + index;

          return (
            <ChevronStep
              key={phase}
              phaseKey={phase}
              stepNumber={stepNumber}
              label={meta.label}
              subtitle={meta.subtitle}
              status={status}
              clickable={clickable}
              isFirst={false}
              isLast={index === operationalCount - 1}
              stepZ={totalSteps - stepIndex}
              onClick={() => onOperationalPhaseChange(phase)}
            />
          );
        })}
      </ol>
    </nav>
  );
}
