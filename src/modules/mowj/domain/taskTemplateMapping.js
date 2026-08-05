/**
 * TASK_TEMPLATE → task field mapping (placeholder substitution only — not a render engine).
 */

/**
 * Replace {{token}} placeholders with context values. Unknown tokens left as-is.
 * @param {string} text
 * @param {Record<string, string|null|undefined>} vars
 */
export function applyTemplatePlaceholders(text, vars = {}) {
  return String(text || '').replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g, (_, key) => {
    if (vars[key] == null || vars[key] === '') return `{{${key}}}`;
    return String(vars[key]);
  });
}

/**
 * Derive due date ISO date (YYYY-MM-DD) from template / config rule.
 * @param {{ dueInDays?: number, dueDate?: string }|object} rule
 * @param {Date} [now]
 */
export function resolveDueDateFromRule(rule = {}, now = new Date()) {
  if (rule.dueDate && !Number.isNaN(Date.parse(String(rule.dueDate)))) {
    return String(rule.dueDate).slice(0, 10);
  }
  const days = rule.dueInDays != null ? Number(rule.dueInDays) : null;
  if (days != null && Number.isFinite(days) && days >= 0) {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + Math.floor(days));
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Map TASK_TEMPLATE (+ action config + audience/campaign context) → task fields.
 * @param {{
 *   template?: object|null,
 *   action?: object|null,
 *   campaign?: object|null,
 *   audienceReference?: object|null,
 *   contextVars?: Record<string, string>,
 * }} input
 */
export function mapTaskTemplateToFields(input = {}) {
  const content = input.template?.content || {};
  const cfg = input.action?.configuration || {};
  const audience = input.audienceReference || {};
  const campaign = input.campaign || {};

  const companyLabel = input.contextVars?.companyName
    || audience.companyId
    || audience.customerId
    || 'مشتری';
  const customerLabel = input.contextVars?.customerName
    || audience.contactId
    || companyLabel;
  const campaignName = input.contextVars?.campaignName || campaign.name || '';

  const vars = {
    customerName: customerLabel,
    companyName: companyLabel,
    campaignName,
    orderNumber: audience.orderId || input.contextVars?.orderNumber || '',
    productName: input.contextVars?.productName || '',
    deliveryDate: input.contextVars?.deliveryDate || '',
    ...(input.contextVars || {}),
  };

  const titleRaw = String(cfg.title || content.title || '').trim();
  const descriptionRaw = cfg.description != null
    ? String(cfg.description)
    : (content.description != null ? String(content.description) : '');

  const title = applyTemplatePlaceholders(titleRaw, vars).trim();
  const description = descriptionRaw
    ? applyTemplatePlaceholders(descriptionRaw, vars).trim()
    : (campaignName ? `مرتبط با کمپین ${campaignName}` : null);

  const priority = String(cfg.priority || content.priority || 'normal');
  const dueDate = resolveDueDateFromRule({
    dueDate: cfg.dueDate || content.dueDate,
    dueInDays: cfg.dueInDays != null ? cfg.dueInDays : content.dueInDays,
  });

  return {
    title,
    description,
    priority,
    dueDate,
    variables: vars,
  };
}
