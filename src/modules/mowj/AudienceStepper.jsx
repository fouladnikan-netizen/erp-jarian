import { Check } from 'lucide-react';

/** Four horizontal workflow steps for Audience Builder (person-centric). */
export const AUDIENCE_STEPPER_STEPS = Object.freeze([
  { id: 1, title: 'تعریف مخاطب', subtitle: 'ساخت سگمنت از افراد مرتبط کانون' },
  { id: 2, title: 'شرط‌ها', subtitle: 'فیلتر مخاطبین بر اساس اطلاعات سازمان، خرید و تعامل' },
  { id: 3, title: 'پیش‌نمایش', subtitle: 'مشاهده تعداد مخاطبین نهایی' },
  { id: 4, title: 'ذخیره', subtitle: 'ثبت سگمنت مخاطب' },
]);

/**
 * Minimal RTL stepper — completed / active / pending.
 * Colors come from theme tokens (--primary ≈ brand red).
 */
export default function AudienceStepper({
  currentStep = 1,
  steps = AUDIENCE_STEPPER_STEPS,
}) {
  return (
    <nav className="mowj-audience-stepper" aria-label="مراحل ساخت مخاطب">
      <ol className="mowj-audience-stepper__track">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const stateClass = isCompleted
            ? 'is-completed'
            : (isActive ? 'is-active' : 'is-pending');

          return (
            <li
              key={step.id}
              className={`mowj-audience-stepper__item ${stateClass}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <div
                className={`mowj-audience-stepper__circle ${stateClass}`}
                aria-hidden="true"
              >
                {isCompleted ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <span className="font-yekan">
                    {Number(step.id).toLocaleString('fa-IR')}
                  </span>
                )}
              </div>

              <div className="mowj-audience-stepper__copy">
                <div className={`mowj-audience-stepper__title font-meem ${stateClass}`}>
                  {step.title}
                </div>
                <div className="mowj-audience-stepper__subtitle font-meem">
                  {step.subtitle}
                </div>
              </div>

              {index < steps.length - 1 ? (
                <div
                  className={`mowj-audience-stepper__line${isCompleted ? ' is-done' : ''}`}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
