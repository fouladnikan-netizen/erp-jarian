/**
 * Org people for Gahshomar incoming-letter referral (پترو فولاد نیکان).
 * Letter / compose only — not a global directory API.
 */

import { CURRENT_USER } from '../../nabz/constants';
import { ORGANIZATION_TREE } from '../../shirazeh/security/organization/mockData/organizationTree';
import { walkTree } from '../../shirazeh/security/organization/treeUtils';
import { ORG_SELF } from '../models/officialRecord';
import { resolveLetterRoleTitle } from './letterDocument';

const CURRENT_ASSIGNEE_ID = 'user-current';

function collectOrgUsers() {
  const people = [];
  walkTree(ORGANIZATION_TREE, (node) => {
    if (node?.type !== 'user') return;
    people.push({
      id: String(node.id),
      name: String(node.name || '').trim(),
      position: String(node.position || '').trim() || null,
      isCurrent: false,
    });
  });
  return people.filter((person) => person.name);
}

/**
 * @returns {Array<{ id: string, name: string, position: string|null, isCurrent: boolean, company: string }>}
 */
export function listOrgPeopleForReferral() {
  const company = ORG_SELF.name;
  const currentTitle = resolveLetterRoleTitle('leader') || 'مدیر فروش';
  const current = {
    id: CURRENT_ASSIGNEE_ID,
    name: CURRENT_USER,
    position: currentTitle,
    isCurrent: true,
    company,
  };

  const others = collectOrgUsers()
    .filter((person) => person.name !== CURRENT_USER)
    .map((person) => ({ ...person, company }));

  return [current, ...others];
}

/** Default referral target — current signed-in user. */
export function getDefaultAssignee() {
  return listOrgPeopleForReferral()[0] || null;
}

/**
 * @param {string} [userId]
 * @param {string} [fallbackName]
 */
export function resolveAssignee(userId, fallbackName = '') {
  const people = listOrgPeopleForReferral();
  const byId = people.find((person) => person.id === String(userId || ''));
  if (byId) return byId;
  const byName = people.find((person) => person.name === String(fallbackName || '').trim());
  if (byName) return byName;
  return getDefaultAssignee();
}

export { CURRENT_ASSIGNEE_ID };
