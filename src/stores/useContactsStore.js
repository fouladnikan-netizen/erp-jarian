import { create } from 'zustand';
import { initialContacts } from '../modules/kanoon/contactsData';
import { BRAND_NAME, SHOW_BRAND_NAME } from '../config/brand';
import {
  normalizeContactPerson,
  lookupMobile as lookupMobileDomain,
  normalizeMobile,
  toPossibleDuplicateMatches,
} from '../domain/contactPerson';
import {
  createContactPersonId,
  createInteractionId,
  createNumericId,
} from '../domain/identity';
import {
  LIFECYCLE_STAGES,
  LIFECYCLE_STAGE_ORDER,
} from '../domain/party';

/**
 * Company aggregate root (runtime name: Contact).
 * Owner: shared SSOT — Kanoon / Ofogh / Nabz must not keep a parallel registry.
 * Opportunity = same record via lifecycle_stage (Ofogh view). Future: optional
 * Opportunity entity; keep ContactPerson 1:N under Company until then.
 *
 * Lifecycle constants live in domain/party — re-exported here for stable imports.
 */
export { LIFECYCLE_STAGES, LIFECYCLE_STAGE_ORDER };

function daysFromNow(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

const PIPELINE_SEED = {
  1: { lifecycle_stage: LIFECYCLE_STAGES.LOYAL, next_follow_up_date: daysFromNow(3), last_interaction_date: daysFromNow(-3) },
  2: { lifecycle_stage: LIFECYCLE_STAGES.SALES_QUALIFIED, next_follow_up_date: daysFromNow(0), last_interaction_date: daysFromNow(-12) },
  3: { lifecycle_stage: LIFECYCLE_STAGES.NURTURING, next_follow_up_date: daysFromNow(-2), last_interaction_date: daysFromNow(-5) },
  4: { lifecycle_stage: LIFECYCLE_STAGES.COLD_LEAD, next_follow_up_date: null, last_interaction_date: daysFromNow(-75) },
  5: { lifecycle_stage: LIFECYCLE_STAGES.FIRST_TIME_BUYER, next_follow_up_date: daysFromNow(7), last_interaction_date: daysFromNow(-7) },
  6: { lifecycle_stage: LIFECYCLE_STAGES.PITCHED, next_follow_up_date: daysFromNow(-1), last_interaction_date: daysFromNow(-45) },
  7: { lifecycle_stage: LIFECYCLE_STAGES.COLD_LEAD, next_follow_up_date: daysFromNow(5), last_interaction_date: daysFromNow(-14) },
  8: { lifecycle_stage: LIFECYCLE_STAGES.ARCHIVED, next_follow_up_date: null, last_interaction_date: daysFromNow(-120) },
};

function seedContacts() {
  return initialContacts.map((contact) => ({
    ...contact,
    relatedPersons: (contact.relatedPersons || []).map((person, index) =>
      normalizeContactPerson(
        {
          ...person,
          id: person.id || `cp-seed-${contact.id}-${index}`,
          isPrimary: person.isPrimary ?? index === 0,
        },
        contact.id,
      )),
    lifecycle_stage: PIPELINE_SEED[contact.id]?.lifecycle_stage ?? LIFECYCLE_STAGES.COLD_LEAD,
    next_follow_up_date: PIPELINE_SEED[contact.id]?.next_follow_up_date ?? null,
    last_interaction_date:
      PIPELINE_SEED[contact.id]?.last_interaction_date ?? contact.lastActivityAt ?? contact.createdAt,
    interactions: normalizeSeedInteractions(contact),
  }));
}

function normalizeSeedInteractions(contact) {
  return (contact.interactions || []).map((item, index) => ({
    id: item.id || `seed-${contact.id}-${index}`,
    date: item.date || null,
    note: item.note || item.summary || '',
    summary: item.summary || item.note || '',
    type: item.type || 'note',
    nextFollowUp: item.nextFollowUp ?? null,
    operator: item.operator || contact.assignee?.name || '—',
  }));
}

/**
 * Single source of truth for Companies/Contacts + nested ContactPersons (1:N).
 * Kanoon, Nabz, and Ofogh must read/write party identity through this store.
 *
 * Soft interactions are owned by Pooyesh (DDL-09). Persistence remains
 * temporary on the Company aggregate (`contact.interactions`) until Activity
 * SSOT lands. UI and projections must use `interactionFacade` — never call
 * `addInteraction` or read `company.interactions` directly.
 */
export const useContactsStore = create((set, get) => ({
  contacts: seedContacts(),

  /**
   * Append-only audit trail for ContactPerson domain events (DDL-08).
   * Not consumed by UI — reserved for future merge / compliance analysis.
   */
  contactPersonAuditLog: [],

  updateContactStage: (contactId, newStage) => {
    if (!LIFECYCLE_STAGE_ORDER.includes(newStage)) return;
    set((state) => ({
      contacts: state.contacts.map((contact) => (
        contact.id === contactId
          ? { ...contact, lifecycle_stage: newStage, last_interaction_date: new Date().toISOString() }
          : contact
      )),
    }));
  },

  addInteraction: (contactId, note, nextFollowUpDate, type = 'note') => {
    const trimmed = (note || '').trim();
    if (!trimmed) return;
    set((state) => ({
      contacts: state.contacts.map((contact) => {
        if (String(contact.id) !== String(contactId)) return contact;
        const now = new Date().toISOString();
        const entry = {
          id: createInteractionId(contactId),
          date: now,
          note: trimmed,
          summary: trimmed,
          type,
          nextFollowUp: nextFollowUpDate || null,
          operator: contact.assignee?.name || (SHOW_BRAND_NAME ? `کاربر ${BRAND_NAME}` : 'کاربر سامانه'),
        };
        return {
          ...contact,
          interactions: [entry, ...(contact.interactions || [])],
          next_follow_up_date: nextFollowUpDate || contact.next_follow_up_date,
          last_interaction_date: now,
        };
      }),
    }));
  },

  /**
   * Patch a single Company-scoped interaction (Pooyesh stream).
   * Prefer `interactionFacade.updateCompanyInteraction` from UI.
   */
  updateInteraction: (contactId, interactionId, changes = {}) => {
    if (contactId == null || interactionId == null) return false;
    let updated = false;
    set((state) => ({
      contacts: state.contacts.map((contact) => {
        if (String(contact.id) !== String(contactId)) return contact;
        const list = contact.interactions || [];
        const nextList = list.map((item) => {
          if (String(item.id) !== String(interactionId)) return item;
          updated = true;
          const next = { ...item, ...changes, id: item.id };
          if (changes.note != null && changes.summary == null) {
            next.summary = changes.note;
          }
          return next;
        });
        if (!updated) return contact;
        return {
          ...contact,
          interactions: nextList,
          last_interaction_date: new Date().toISOString(),
        };
      }),
    }));
    return updated;
  },

  /**
   * Remove a Company-scoped interaction (Pooyesh stream).
   * Prefer `interactionFacade.removeCompanyInteraction` from UI.
   */
  removeInteraction: (contactId, interactionId) => {
    if (contactId == null || interactionId == null) return false;
    let removed = false;
    set((state) => ({
      contacts: state.contacts.map((contact) => {
        if (String(contact.id) !== String(contactId)) return contact;
        const list = contact.interactions || [];
        const nextList = list.filter((item) => {
          if (String(item.id) === String(interactionId)) {
            removed = true;
            return false;
          }
          return true;
        });
        if (!removed) return contact;
        return { ...contact, interactions: nextList };
      }),
    }));
    return removed;
  },

  addContact: (contact) => {
    const id = contact.id ?? createNumericId();
    const relatedPersons = (contact.relatedPersons || []).map((person, index) =>
      normalizeContactPerson(
        { ...person, id: person.id || createContactPersonId(`${id}-${index}`) },
        id,
      ));
    const newContact = {
      lifecycle_stage: LIFECYCLE_STAGES.COLD_LEAD,
      next_follow_up_date: null,
      last_interaction_date: new Date().toISOString(),
      interactions: [],
      ...contact,
      id,
      relatedPersons,
    };
    set((state) => ({ contacts: [newContact, ...state.contacts] }));
    return newContact.id;
  },

  updateContact: (contactId, updates) => {
    set((state) => ({
      contacts: state.contacts.map((contact) => {
        if (contact.id !== contactId) return contact;
        const next = { ...contact, ...updates };
        if (updates.relatedPersons) {
          next.relatedPersons = updates.relatedPersons.map((person) =>
            normalizeContactPerson(person, contactId));
        }
        return next;
      }),
    }));
  },

  /**
   * ContactPerson CRUD — child of Company (companyId = contact.id).
   * @returns {string|null}
   */
  addContactPerson: (companyId, contactData) => {
    const fullName = String(contactData?.fullName || contactData?.name || '').trim();
    const mobile = String(contactData?.mobile || '').trim();
    if (!fullName || !mobile) return null;

    /* DDL-08 — probabilistic mobile reuse (same company + other companies) */
    const duplicateMatches = lookupMobileDomain(get().contacts, mobile);
    const possibleDuplicateMobile = duplicateMatches.length > 0;
    const possibleDuplicateMatches = toPossibleDuplicateMatches(duplicateMatches);

    const personId = String(contactData?.id || createContactPersonId(companyId));
    const nextPerson = normalizeContactPerson(
      {
        ...contactData,
        id: personId,
        fullName,
        mobile,
        ...(possibleDuplicateMobile
          ? { possibleDuplicateMobile: true, possibleDuplicateMatches }
          : {}),
      },
      companyId,
    );

    set((state) => {
      const contacts = state.contacts.map((contact) => {
        if (String(contact.id) !== String(companyId)) return contact;
        let persons = [...(contact.relatedPersons || [])];
        if (nextPerson.isPrimary) {
          persons = persons.map((p) => ({ ...p, isPrimary: false }));
        }
        return { ...contact, relatedPersons: [...persons, nextPerson] };
      });

      const contactPersonAuditLog = possibleDuplicateMobile
        ? [
            ...state.contactPersonAuditLog,
            {
              action: 'CREATE_CONTACT_PERSON',
              possibleDuplicateMobile: true,
              companyId,
              personId,
              mobile: normalizeMobile(mobile) || mobile,
              possibleDuplicateMatches,
              createdAt: new Date().toISOString(),
            },
          ]
        : state.contactPersonAuditLog;

      return { contacts, contactPersonAuditLog };
    });

    return personId;
  },

  updateContactPerson: (companyId, contactPersonId, contactData) => {
    set((state) => ({
      contacts: state.contacts.map((contact) => {
        if (String(contact.id) !== String(companyId)) return contact;
        const persons = contact.relatedPersons || [];
        if (!persons.some((p) => String(p.id) === String(contactPersonId))) return contact;

        let next = persons.map((person) => {
          if (String(person.id) !== String(contactPersonId)) return person;
          return normalizeContactPerson({ ...person, ...contactData, id: person.id }, companyId);
        });

        if (contactData?.isPrimary === true) {
          next = next.map((person) => ({
            ...person,
            isPrimary: String(person.id) === String(contactPersonId),
          }));
        }

        return { ...contact, relatedPersons: next };
      }),
    }));
  },

  deleteContactPerson: (companyId, contactPersonId) => {
    set((state) => ({
      contacts: state.contacts.map((contact) => {
        if (String(contact.id) !== String(companyId)) return contact;
        return {
          ...contact,
          relatedPersons: (contact.relatedPersons || []).filter(
            (person) => String(person.id) !== String(contactPersonId),
          ),
        };
      }),
    }));
  },

  /** Lookup helper for cross-module use (Nabz/Ofogh). */
  getContactPerson: (companyId, contactPersonId) => {
    const company = get().contacts.find((c) => String(c.id) === String(companyId));
    return (company?.relatedPersons || []).find((p) => String(p.id) === String(contactPersonId)) || null;
  },

  listContactPersons: (companyId) => {
    const company = get().contacts.find((c) => String(c.id) === String(companyId));
    return [...(company?.relatedPersons || [])];
  },

  /**
   * Domain policy: find ContactPersons sharing a mobile across ALL companies.
   * Read-only — does not mutate state or create Person entities.
   * Edit mode may pass { excludeContactPersonId } to avoid self-match only.
   *
   * @param {unknown} mobile
   * @param {{ excludeContactPersonId?: string|number }} [options]
   */
  lookupMobile: (mobile, options = {}) => {
    return lookupMobileDomain(get().contacts, mobile, options);
  },
}));
