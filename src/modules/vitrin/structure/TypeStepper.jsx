import { TYPE_WIZARD_STEPS, hasEnumAttributes, isWizardStepComplete } from '../../../domain/productMaster/typeCompletion';

export default function TypeStepper({
  currentStepId,
  type,
  schema,
  onSelect,
  allowJump = true,
}) {
  return (
    <nav className="vitrin-structure__stepper" aria-label="مراحل ساختار کالا">
      {TYPE_WIZARD_STEPS.map((step, index) => {
        const skipped = step.id === 'allowed-values' && !hasEnumAttributes(schema);
        const complete = skipped || isWizardStepComplete(step.id, type, schema);
        const active = step.id === currentStepId;
        const status = active ? 'active' : complete ? 'complete' : 'pending';
        return (
          <span key={step.id} className="vitrin-structure__step-wrap">
            {index > 0 ? <span className="vitrin-structure__step-arrow" aria-hidden="true">→</span> : null}
            <button
              type="button"
              className={`vitrin-structure__step${active ? ' vitrin-structure__step--active' : ''}${complete && !active ? ' vitrin-structure__step--complete' : ''}`}
              aria-current={active ? 'step' : undefined}
              disabled={!allowJump || !type}
              onClick={() => onSelect?.(step.id)}
            >
              <span className="vitrin-structure__step-index">{(index + 1).toLocaleString('fa-IR')}</span>
              <span>{step.label}{status === 'complete' && !active ? ' · کامل' : ''}</span>
            </button>
          </span>
        );
      })}
    </nav>
  );
}
