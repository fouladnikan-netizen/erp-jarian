import { GATEWAY_PHASE_META, GATEWAY_PHASE_ORDER, GATEWAY_PHASES } from '../../../gatewayConfig';
import { getGatewayStepStateForProfile } from '../../../gatewayService';
import {
  OPERATIONAL_PHASE_META,
  OPERATIONAL_PHASE_ORDER,
} from '../../../phase2Config';
import {
  getOperationalStepStateForProfile,
  shouldShowOperationalPhases,
} from '../../../phase2Service';
import { orderNeedsRevisionWarning } from '../../../services/revisionService';

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" />
      <path d="M12 17.5h.01" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function phaseIcon(phaseKey, status) {
  if (status === 'completed') return <CheckIcon />;
  if (status === 'warning') return <WarningIcon />;
  if (phaseKey === GATEWAY_PHASES.MOZENE) return <HelpIcon />;
  if (phaseKey === GATEWAY_PHASES.PISHKESH) return <DocumentIcon />;
  if (status === 'active') {
    return <span className="gateway-chevron-stepper__active-dot" aria-hidden="true" />;
  }
  return null;
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
        aria-current={status === 'active' || status === 'warning' ? 'step' : undefined}
        aria-label={`${stepNumber}. ${label} — ${subtitle}`}
        onClick={() => clickable && onClick()}
      >
        <span className="gateway-chevron-stepper__icon" aria-hidden="true">
          {phaseIcon(phaseKey, status)}
        </span>
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
  const needsRevision = orderNeedsRevisionWarning(order);
  const gatewayCount = GATEWAY_PHASE_ORDER.length;
  const operationalCount = showOperational ? OPERATIONAL_PHASE_ORDER.length : 0;
  const totalSteps = gatewayCount + operationalCount;

  return (
    <nav className="gateway-chevron-stepper" aria-label="مراحل گذرگاه سفارش">
      <ol className={`gateway-chevron-stepper__track${showOperational ? ' gateway-chevron-stepper__track--extended' : ''}`}>
        {GATEWAY_PHASE_ORDER.map((phase, index) => {
          const meta = GATEWAY_PHASE_META[phase];
          let { status, clickable } = getGatewayStepStateForProfile(
            orderPhase,
            viewPhase,
            phase,
            { isSuccess: showOperational, viewMode },
          );
          if (needsRevision && status === 'active') {
            status = 'warning';
          }
          const stepNumber = (index + 1).toLocaleString('fa-IR');

          return (
            <ChevronStep
              key={phase}
              phaseKey={phase}
              stepNumber={stepNumber}
              label={meta.label}
              subtitle={needsRevision && status === 'warning' ? 'نیاز به بازنگری' : meta.subtitle}
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
          let { status, clickable } = getOperationalStepStateForProfile(
            operationalPhase,
            operationalViewPhase,
            phase,
            { viewMode },
          );
          if (needsRevision && status === 'active') {
            status = 'warning';
          }
          const stepNumber = (gatewayCount + index + 1).toLocaleString('fa-IR');
          const stepIndex = gatewayCount + index;

          return (
            <ChevronStep
              key={phase}
              phaseKey={phase}
              stepNumber={stepNumber}
              label={meta.label}
              subtitle={needsRevision && status === 'warning' ? 'نیاز به بازنگری' : meta.subtitle}
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
