import { CUSTOMER_COMPLETION_RULES } from './customerCompletion.rules.js';

/**
 * Evaluate company readiness for business workflows.
 *
 * @param {object|null|undefined} company — contact aggregate from useContactsStore
 * @param {{ rules?: typeof CUSTOMER_COMPLETION_RULES }} [options]
 * @returns {{
 *   isOperational: boolean,
 *   isRegistered: boolean,
 *   completion: number,
 *   missing: string[],
 *   checks: Array<{ id: string, label: string, ok: boolean, required: boolean }>,
 * }}
 */
export function evaluateCompanyCompletion(company, options = {}) {
  const rules = options.rules || CUSTOMER_COMPLETION_RULES;

  if (!company) {
    return {
      isOperational: false,
      isRegistered: false,
      completion: 0,
      missing: rules.filter((r) => r.required !== false).map((r) => r.id),
      checks: rules.map((r) => ({
        id: r.id,
        label: r.label,
        ok: false,
        required: r.required !== false,
      })),
    };
  }

  const activeRules = rules.filter((rule) => {
    if (typeof rule.appliesTo === 'function') return rule.appliesTo(company);
    return true;
  });

  const checks = activeRules.map((rule) => {
    const ok = Boolean(rule.check(company));
    return {
      id: rule.id,
      label: rule.label,
      ok,
      required: rule.required !== false,
    };
  });

  const missing = checks.filter((c) => c.required && !c.ok).map((c) => c.id);

  const totalWeight = activeRules.reduce((sum, rule) => sum + (Number(rule.weight) || 0), 0) || 1;
  const earned = activeRules.reduce((sum, rule, index) => {
    if (!checks[index].ok) return sum;
    return sum + (Number(rule.weight) || 0);
  }, 0);
  const completion = Math.round((earned / totalWeight) * 100);

  const registrationOk = checks.find((c) => c.id === 'companyRegistration')?.ok !== false
    && checks.find((c) => c.id === 'nationalId')?.ok !== false;

  return {
    isOperational: missing.length === 0,
    isRegistered: Boolean(registrationOk),
    completion,
    missing,
    checks,
  };
}

/** Convenience: company is ready for Nabz / Ofogh / Poyesh / Gahshomar workflows. */
export function isCompanyOperational(company) {
  return evaluateCompanyCompletion(company).isOperational;
}
