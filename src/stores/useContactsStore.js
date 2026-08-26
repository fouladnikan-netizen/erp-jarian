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
import {
  resolveContactLifecycleStage,
  relationshipStageFromPipelineStage,
} from '../domain/party/relationshipLifecycle.js';
import CompanyRepository from '../api/repositories/CompanyRepository';
import { useMockApi } from '../api/useMockApi';

/**
 * Company aggregate root (runtime name: Contact).
 * Owner: shared SSOT — Kanoon / Ofogh / Nabz must not keep a parallel registry.
 * Opportunity = same record via lifecycle_stage (Ofogh view). Future: optional
 * Opportunity entity; keep ContactPerson 1:N under Company until then.
 *
 * Lifecycle constants live in domain/party — re-exported here for stable imports.
 *
 * Raw Leads are NOT stored here — see useLeadsStore (Ofogh ownership).
 */
export { LIFECYCLE_STAGES, LIFECYCLE_STAGE_ORDER };
export { RELATIONSHIP_LIFECYCLE_STAGES } from '../domain/party/relationshipLifecycle.constants.js';

/**
 * Contact recordType — SSOT inside Kanoon aggregate.
 * Owner semantics:
 * - LEAD: created from Ofoq (raw opportunity, not verified)
 * - CUSTOMER: verified official contact (officially usable)
 */
export const CONTACT_RECORD_TYPES = Object.freeze({
  LEAD: 'LEAD',
  CUSTOMER: 'CUSTOMER',
});

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
  return initialContacts.map((contact) => {
    const lifecycle_stage = PIPELINE_SEED[contact.id]?.lifecycle_stage ?? LIFECYCLE_STAGES.COLD_LEAD;
    const recordType = contact.recordType || CONTACT_RECORD_TYPES.CUSTOMER;
    const base = {
      ...contact,
      recordType,
      relatedPersons: (contact.relatedPersons || []).map((person, index) =>
        normalizeContactPerson(
          {
            ...person,
            id: person.id || `cp-seed-${contact.id}-${index}`,
            isPrimary: person.isPrimary ?? index === 0,
          },
          contact.id,
        )),
      lifecycle_stage,
      lifecycleStage: contact.lifecycleStage || resolveContactLifecycleStage({
        ...contact,
        recordType,
        lifecycle_stage,
      }),
      next_follow_up_date: PIPELINE_SEED[contact.id]?.next_follow_up_date ?? null,
      last_interaction_date:
        PIPELINE_SEED[contact.id]?.last_interaction_date ?? contact.lastActivityAt ?? contact.createdAt,
      interactions: normalizeSeedInteractions(contact),
    };
    return base;
  });
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

async function persistContactSnapshot(contact) {
  if (useMockApi() || !contact?.id) return contact;
  return CompanyRepository.update(contact.id, contact);
}

/**
 * Single source of truth for Companies/Contacts + nested ContactPersons (1:N).
 * Kanoon, Nabz, and Ofogh must read/write party identity through this store.
 *
 * When VITE_USE_MOCK_API=false, reads/writes go to PostgreSQL via CompanyRepository.
 */
export const useContactsStore = create((set, get) => ({
  contacts: useMockApi() ? seedContacts() : [],
  loading: false,
  hydrated: useMockApi(),
  error: null,

  fetchContacts: async () => {
    if (useMockApi()) {
      set({ contacts: seedContacts(), hydrated: true, loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const contacts = await CompanyRepository.list();
      set({ contacts, loading: false, hydrated: true });
    } catch (error) {
      console.error('[contacts-store] fetchContacts failed', error);
      set({
        loading: false,
        hydrated: false,
        error: error?.message || 'بارگذاری مخاطبین ناموفق بود.',
      });
    }
  },

  /**
   * Append-only audit trail for ContactPerson domain events (DDL-08).
   */
  contactPersonAuditLog: [],

  updateContactStage: (contactId, newStage) => {
    if (!LIFECYCLE_STAGE_ORDER.includes(newStage)) return;
    const lifecycleStage = relationshipStageFromPipelineStage(newStage);
    let nextContact = null;
    set((state) => ({
      contacts: state.contacts.map((contact) => {
        if (contact.id !== contactId) return contact;
        nextContact = {
          ...contact,
          lifecycle_stage: newStage,
          lifecycleStage,
          last_interaction_date: new Date().toISOString(),
        };
        return nextContact;
      }),
    }));
    if (nextContact && !useMockApi()) {
      void persistContactSnapshot(nextContact).catch((error) => {
        console.error('[contacts-store] updateContactStage persist failed', error);
      });
    }
  },

  addInteraction: (contactId, note, nextFollowUpDate, type = 'note') => {
    const trimmed = (note || '').trim();
    if (!trimmed) return;
    let nextContact = null;
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
        nextContact = {
          ...contact,
          interactions: [entry, ...(contact.interactions || [])],
          next_follow_up_date: nextFollowUpDate || contact.next_follow_up_date,
          last_interaction_date: now,
        };
        return nextContact;
      }),
    }));
    if (nextContact && !useMockApi()) {
      void persistContactSnapshot(nextContact).catch((error) => {
        console.error('[contacts-store] addInteraction persist failed', error);
      });
    }
  },

  /**
   * Patch a single Company-scoped interaction (Pooyesh stream).
   * Prefer `interactionFacade.updateCompanyInteraction` from UI.
   */
  updateInteraction: (contactId, interactionId, changes = {}) => {
    if (contactId == null || interactionId == null) return false;
    let updated = false;
    let nextContact = null;
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
        nextContact = {
          ...contact,
          interactions: nextList,
          last_interaction_date: new Date().toISOString(),
        };
        return nextContact;
      }),
    }));
    if (updated && nextContact && !useMockApi()) {
      void persistContactSnapshot(nextContact).catch((error) => {
        console.error('[contacts-store] updateInteraction persist failed', error);
      });
    }
    return updated;
  },

  removeInteraction: (contactId, interactionId) => {
    if (contactId == null || interactionId == null) return false;
    let removed = false;
    let nextContact = null;
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
        nextContact = { ...contact, interactions: nextList };
        return nextContact;
      }),
    }));
    if (removed && nextContact && !useMockApi()) {
      void persistContactSnapshot(nextContact).catch((error) => {
        console.error('[contacts-store] removeInteraction persist failed', error);
      });
    }
    return removed;
  },

  addContact: (contact) => {
    if (contact?.recordType === CONTACT_RECORD_TYPES.LEAD) {
      return null;
    }
    if (useMockApi()) {
      return get().addContactAsync(contact);
    }
    void get().addContactAsync(contact);
    return null;
  },

  addContactAsync: async (contact) => {
    const id = contact.id ?? createNumericId();
    const relatedPersons = (contact.relatedPersons || []).map((person, index) =>
      normalizeContactPerson(
        { ...person, id: person.id || createContactPersonId(`${id}-${index}`) },
        id,
      ));
    const recordType = CONTACT_RECORD_TYPES.CUSTOMER;
    const lifecycle_stage = contact.lifecycle_stage ?? LIFECYCLE_STAGES.COLD_LEAD;
    const lifecycleStage = contact.lifecycleStage
      ?? relationshipStageFromPipelineStage(lifecycle_stage);
    const newContact = {
      next_follow_up_date: null,
      last_interaction_date: new Date().toISOString(),
      interactions: [],
      ...contact,
      recordType,
      lifecycle_stage,
      lifecycleStage,
      id,
      relatedPersons,
    };

    if (useMockApi()) {
      set((state) => ({ contacts: [newContact, ...state.contacts] }));
      return newContact.id;
    }

    try {
      const saved = await CompanyRepository.create(newContact);
      set((state) => ({ contacts: [saved, ...state.contacts] }));
      return saved.id;
    } catch (error) {
      console.error('[contacts-store] addContact failed', error);
      throw error;
    }
  },

  updateContact: (contactId, updates) => {
    let nextContact = null;
    set((state) => ({
      contacts: state.contacts.map((contact) => {
        if (contact.id !== contactId) return contact;
        const next = { ...contact, ...updates };
        if (updates.relatedPersons) {
          next.relatedPersons = updates.relatedPersons.map((person) =>
            normalizeContactPerson(person, contactId));
        }
        nextContact = next;
        return next;
      }),
    }));

    if (nextContact && !useMockApi()) {
      void persistContactSnapshot(nextContact)
        .then((saved) => {
          if (saved) {
            set((state) => ({
              contacts: state.contacts.map((c) => (c.id === contactId ? saved : c)),
            }));
          }
        })
        .catch((error) => {
          console.error('[contacts-store] updateContact persist failed', error);
        });
    }
  },

  /**
   * ContactPerson CRUD — child of Company (companyId = contact.id).
   * @returns {string|null}
   */
  addContactPerson: (companyId, contactData) => {
    const fullName = String(contactData?.fullName || contactData?.name || '').trim();
    const mobile = String(contactData?.mobile || '').trim();
    if (!fullName || !mobile) return null;

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

    let nextContact = null;
    set((state) => {
      const contacts = state.contacts.map((contact) => {
        if (String(contact.id) !== String(companyId)) return contact;
        let persons = [...(contact.relatedPersons || [])];
        if (nextPerson.isPrimary) {
          persons = persons.map((p) => ({ ...p, isPrimary: false }));
        }
        nextContact = { ...contact, relatedPersons: [...persons, nextPerson] };
        return nextContact;
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

    if (nextContact && !useMockApi()) {
      void persistContactSnapshot(nextContact).catch((error) => {
        console.error('[contacts-store] addContactPerson persist failed', error);
      });
    }

    return personId;
  },

  updateContactPerson: (companyId, contactPersonId, contactData) => {
    let nextContact = null;
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

        nextContact = { ...contact, relatedPersons: next };
        return nextContact;
      }),
    }));

    if (nextContact && !useMockApi()) {
      void persistContactSnapshot(nextContact).catch((error) => {
        console.error('[contacts-store] updateContactPerson persist failed', error);
      });
    }
  },

  deleteContactPerson: (companyId, contactPersonId) => {
    let nextContact = null;
    set((state) => ({
      contacts: state.contacts.map((contact) => {
        if (String(contact.id) !== String(companyId)) return contact;
        nextContact = {
          ...contact,
          relatedPersons: (contact.relatedPersons || []).filter(
            (person) => String(person.id) !== String(contactPersonId),
          ),
        };
        return nextContact;
      }),
    }));

    if (nextContact && !useMockApi()) {
      void persistContactSnapshot(nextContact).catch((error) => {
        console.error('[contacts-store] deleteContactPerson persist failed', error);
      });
    }
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
