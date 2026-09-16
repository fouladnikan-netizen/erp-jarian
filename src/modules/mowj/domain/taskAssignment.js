/**
 * Task assignment foundation for CREATE_TASK executions.
 */

export const TASK_ASSIGNMENT_RULE = Object.freeze({
  CAMPAIGN_OWNER: 'CAMPAIGN_OWNER',
  CUSTOMER_OWNER: 'CUSTOMER_OWNER',
  FIXED_USER: 'FIXED_USER',
});

export const TASK_ASSIGNMENT_RULE_LABELS = Object.freeze({
  CAMPAIGN_OWNER: 'مالک کمپین',
  CUSTOMER_OWNER: 'مالک مشتری',
  FIXED_USER: 'کاربر ثابت',
});

/**
 * @param {{
 *   rule?: string,
 *   campaign?: { owner?: { userId?: string, name?: string } }|null,
 *   customerOwner?: { userId?: string, name?: string }|null,
 *   fixedUser?: { userId?: string, name?: string }|null,
 *   actionConfiguration?: object,
 * }} input
 * @returns {{ userId: string, name: string }|null}
 */
export function resolveTaskAssignee(input = {}) {
  const cfg = input.actionConfiguration || {};
  const ruleRaw = String(
    input.rule || cfg.assignmentRule || TASK_ASSIGNMENT_RULE.CAMPAIGN_OWNER,
  ).toUpperCase();

  if (ruleRaw === TASK_ASSIGNMENT_RULE.FIXED_USER) {
    const fixed = input.fixedUser || cfg.assignedTo || null;
    if (fixed?.userId || fixed?.name) {
      return {
        userId: String(fixed.userId || 'user-fixed'),
        name: String(fixed.name || 'کاربر ثابت'),
      };
    }
    return null;
  }

  if (ruleRaw === TASK_ASSIGNMENT_RULE.CUSTOMER_OWNER) {
    const owner = input.customerOwner || cfg.customerOwner || null;
    if (owner?.userId || owner?.name) {
      return {
        userId: String(owner.userId || 'user-customer-owner'),
        name: String(owner.name || 'مالک مشتری'),
      };
    }
    // fall through to campaign owner
  }

  const campaignOwner = input.campaign?.owner || null;
  if (campaignOwner?.userId || campaignOwner?.name) {
    return {
      userId: String(campaignOwner.userId || 'user-campaign-owner'),
      name: String(campaignOwner.name || 'مالک کمپین'),
    };
  }

  return {
    userId: 'user-current',
    name: 'کاربر جاری',
  };
}
