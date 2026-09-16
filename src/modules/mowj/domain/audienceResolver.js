/**
 * AudienceResolver — always resolves Kanoon related persons as campaign recipients.
 *
 * Company attributes filter the parent company; persons are the audience members.
 */

import {
  AUDIENCE_BASE_SELECTION,
  normalizeAudienceDefinition,
  validateAudienceDefinition,
} from './audienceDefinition';
import { companyMatchesDefinition } from './audienceRuleEvaluate';
import { MODULE_REF_KIND } from './moduleRefs.contracts';
import { SNAPSHOT_MEMBER_STATUS } from './audienceSnapshot.types';
import { createEmptyAudiencePort } from './audience.ports';

function applyBaseSelection(rows, baseSelection) {
  if (baseSelection === AUDIENCE_BASE_SELECTION.WITH_ORDERS) {
    return rows.filter((row) => Number(row.orderCount) > 0);
  }
  if (baseSelection === AUDIENCE_BASE_SELECTION.WITHOUT_ORDERS) {
    return rows.filter((row) => Number(row.orderCount || 0) === 0);
  }
  return rows;
}

function applyRules(rows, definition) {
  if (definition.baseSelection === AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS) {
    return rows.filter((row) => companyMatchesDefinition(row, definition));
  }
  if (definition.rules?.length || definition.groups?.some((g) => g.rules?.length)) {
    return rows.filter((row) => companyMatchesDefinition(row, definition));
  }
  return rows;
}

/**
 * @param {import('./audience.ports').AudienceDataPort} [port]
 */
export function createAudienceResolver(port = createEmptyAudiencePort()) {
  const listRelatedPersons = typeof port.listRelatedPersons === 'function'
    ? port.listRelatedPersons
    : () => [];

  /**
   * @param {object} definitionInput
   */
  function resolve(definitionInput) {
    const validation = validateAudienceDefinition({
      ...definitionInput,
      name: definitionInput?.name || definitionInput?.label || 'مخاطب',
    });
    if (!validation.ok) {
      return {
        ok: false,
        members: [],
        count: 0,
        error: validation.errors.join(' '),
      };
    }

    const definition = normalizeAudienceDefinition(definitionInput);

    let persons = listRelatedPersons() || [];
    persons = applyBaseSelection(persons, definition.baseSelection);
    persons = applyRules(persons, definition);

    const members = persons.map((row) => ({
      kind: MODULE_REF_KIND.KANOON_CONTACT_PERSON,
      contactPersonId: String(row.contactPersonId || row.personId),
      contactId: String(row.contactPersonId || row.personId),
      companyId: String(row.companyId),
      customerId: String(row.companyId),
      personGender: row.personGender || null,
      displayName: row.displayName || null,
    }));

    const seen = new Set();
    const unique = members.filter((m) => {
      const key = `${m.kind}:${m.contactPersonId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      ok: true,
      definition,
      members: unique,
      count: unique.length,
    };
  }

  function estimateCount(definitionInput) {
    return resolve(definitionInput).count;
  }

  return { resolve, estimateCount };
}

/**
 * @param {object[]} members
 */
export function snapshotMembersFromResolved(members = []) {
  return members.map((item) => ({
    contactId: item.contactId != null ? String(item.contactId) : null,
    contactPersonId: item.contactPersonId != null ? String(item.contactPersonId) : null,
    companyId: item.companyId != null ? String(item.companyId) : (
      item.customerId != null ? String(item.customerId) : null
    ),
    leadId: item.leadId != null ? String(item.leadId) : null,
    orderId: item.orderId != null ? String(item.orderId) : null,
    customerId: item.customerId != null ? String(item.customerId) : (
      item.companyId != null ? String(item.companyId) : null
    ),
    status: SNAPSHOT_MEMBER_STATUS.INCLUDED,
  })).filter((row) => (
    row.contactId || row.contactPersonId || row.companyId || row.leadId || row.orderId || row.customerId
  ));
}
