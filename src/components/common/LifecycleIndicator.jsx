import { Check, Moon, Slash, Star } from 'lucide-react';
import {
  LIFECYCLE_VISUAL_KIND,
  resolveVisualFromLegacyStage,
} from '../../modules/ofogh/lifecycleVisualRegistry.js';
import './lifecycle-indicator.css';

const FILL_PCT = {
  [LIFECYCLE_VISUAL_KIND.CIRCLE_25]: 25,
  [LIFECYCLE_VISUAL_KIND.CIRCLE_50]: 50,
  [LIFECYCLE_VISUAL_KIND.CIRCLE_75]: 75,
};

/**
 * Monochrome CRM / Ofogh lifecycle indicator.
 * Prefer `visual` + `label` from LifecycleVisualRegistry.
 * Legacy: `stage` still accepted and resolved via registry.
 *
 * @param {{
 *   visual?: string,
 *   label?: string,
 *   stage?: string,
 *   size?: number,
 *   className?: string,
 * }} props
 */
export default function LifecycleIndicator({
  visual,
  label,
  stage,
  size = 14,
  className = '',
}) {
  const resolved = visual
    ? { kind: visual, label: label || '' }
    : resolveVisualFromLegacyStage(stage);

  const kind = resolved.kind;
  const title = label || resolved.label || '';
  const rootClass = `lifecycle-indicator${className ? ` ${className}` : ''}`;

  if (kind === LIFECYCLE_VISUAL_KIND.STAR) {
    return (
      <span className={rootClass} title={title} aria-label={title}>
        <Star size={size} strokeWidth={2} aria-hidden="true" />
      </span>
    );
  }

  if (kind === LIFECYCLE_VISUAL_KIND.MOON) {
    return (
      <span className={`${rootClass} lifecycle-indicator--sayeh`} title={title} aria-label={title}>
        <Moon
          size={size}
          strokeWidth={1.15}
          fill="currentColor"
          className="lifecycle-indicator__moon"
          aria-hidden="true"
        />
      </span>
    );
  }

  if (kind === LIFECYCLE_VISUAL_KIND.CONVERTED_DASHED_CHECK) {
    return (
      <span
        className={`${rootClass} lifecycle-indicator__composite`}
        style={{ width: size, height: size }}
        title={title}
        aria-label={title}
      >
        <span
          className="lifecycle-indicator__circle lifecycle-indicator__circle--dashed"
          style={{ width: size, height: size }}
          aria-hidden="true"
        />
        <Check size={Math.max(8, size * 0.55)} strokeWidth={2.5} className="lifecycle-indicator__mark" aria-hidden="true" />
      </span>
    );
  }

  if (kind === LIFECYCLE_VISUAL_KIND.REJECTED_DASHED_SLASH) {
    return (
      <span
        className={`${rootClass} lifecycle-indicator__composite`}
        style={{ width: size, height: size }}
        title={title}
        aria-label={title}
      >
        <span
          className="lifecycle-indicator__circle lifecycle-indicator__circle--dashed"
          style={{ width: size, height: size }}
          aria-hidden="true"
        />
        <Slash size={Math.max(8, size * 0.55)} strokeWidth={2.5} className="lifecycle-indicator__mark" aria-hidden="true" />
      </span>
    );
  }

  if (kind === LIFECYCLE_VISUAL_KIND.DASHED_CIRCLE) {
    return (
      <span
        className={`${rootClass} lifecycle-indicator__circle lifecycle-indicator__circle--dashed`}
        style={{ width: size, height: size }}
        title={title}
        aria-label={title}
      />
    );
  }

  if (kind === LIFECYCLE_VISUAL_KIND.FULL_CIRCLE) {
    return (
      <span
        className={`${rootClass} lifecycle-indicator__circle lifecycle-indicator__circle--full`}
        style={{ width: size, height: size }}
        title={title}
        aria-label={title}
      />
    );
  }

  if (kind === LIFECYCLE_VISUAL_KIND.EMPTY_CIRCLE) {
    return (
      <span
        className={`${rootClass} lifecycle-indicator__circle lifecycle-indicator__circle--empty`}
        style={{ width: size, height: size }}
        title={title}
        aria-label={title}
      />
    );
  }

  if (FILL_PCT[kind] != null) {
    const pct = FILL_PCT[kind];
    return (
      <span
        className={`${rootClass} lifecycle-indicator__circle lifecycle-indicator__circle--partial`}
        style={{
          width: size,
          height: size,
          '--lifecycle-fill-pct': `${pct}`,
        }}
        title={title}
        aria-label={title}
      />
    );
  }

  // Safe default: empty circle (نوپدید), never dashed Raw Lead
  return (
    <span
      className={`${rootClass} lifecycle-indicator__circle lifecycle-indicator__circle--empty`}
      style={{ width: size, height: size }}
      title={title || 'نوپدید'}
      aria-label={title || 'نوپدید'}
    />
  );
}
