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
import ContactRepository from '../api/repositories/ContactRepository';
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
  const { relatedPersons, interactions, ...companyFields } = contact;
  return CompanyRepository.update(contact.id, companyFields);
}

/** Replace one company in cache from authoritative server response (SERVER_FIRST). */
function patchContactCache(set, contactId, saved) {
  set((state) => ({
    contacts: state.contacts.map((c) =>
      String(c.id) === String(contactId) ? saved : c,
    ),
    error: null,
  }));
}

/**
 * SERVER_FIRST company write:
 * build next → API → PostgreSQL → server response → Zustand → UI.
 * Does not paint optimistic cache before API success.
 */
async function commitContactServerFirst(get, set, contactId, buildNext) {
  const prev = get().contacts.find((c) => String(c.id) === String(contactId));
  if (!prev) return null;

  const nextContact = buildNext(prev);
  if (!nextContact) return null;

  if (useMockApi()) {
    patchContactCache(set, contactId, nextContact);
    return nextContact;
  }

  try {
    const saved = await persistContactSnapshot(nextContact);
    patchContactCache(set, contactId, saved);
    return saved;
  } catch (error) {
    console.error('[contacts-store] SERVER_FIRST persist failed', error);
    set({ error: error?.message || 'ذخیره شرکت ناموفق بود.' });
    throw error;
  }
}

/**
 * Single source of truth for Companies/Contacts + nested ContactPersons (1:N).
 * Kanoon, Nabz, and Ofogh must read/write party identity through this store.
 *
 * When VITE_USE_MOCK_API=false: Postgres is SoR; Zustand is cache only (SERVER_FIRST).
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

  /** Full company + persons (list API omits persons). */
  fetchCompanyById: async (companyId) => {
    if (!companyId) return null;
    if (useMockApi()) {
      return get().contacts.find((c) => String(c.id) === String(companyId)) || null;
    }
    try {
      const company = await CompanyRepository.getById(companyId);
      if (!company?.id) return null;
      set((state) => {
        const without = state.contacts.filter((c) => String(c.id) !== String(company.id));
        return { contacts: [company, ...without], error: null };
      });
      return company;
    } catch (error) {
      console.error('[contacts-store] fetchCompanyById failed', error);
      return null;
    }
  },

  /**
   * Append-only audit trail for ContactPerson domain events (DDL-08).
   */
  contactPersonAuditLog: [],

  updateContactStage: (contactId, newStage) => {
    // Customer Lifecycle is system-controlled — do not mutate stage from UI drag.
    if (typeof console !== 'undefined') {
      console.warn(
        '[ofogh] updateContactStage ignored — lifecycle is event-driven',
        { contactId, newStage },
      );
    }
  },

  addInteraction: (contactId, note, nextFollowUpDate, type = 'note') => {
    const trimmed = (note || '').trim();
    if (!trimmed) return;
    // API mode: Pooyesh Activity is SoR — do not shadow-write company.payload.interactions (DDL-26.9).
    if (!useMockApi()) return;
    void commitContactServerFirst(get, set, contactId, (contact) => {
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
    });
  },

  /**
   * Patch a single Company-scoped interaction (Pooyesh stream).
   * Prefer `interactionFacade.updateCompanyInteraction` from UI.
   */
  updateInteraction: (contactId, interactionId, changes = {}) => {
    if (contactId == null || interactionId == null) return false;
    if (!useMockApi()) return false;
    const prev = get().contacts.find((c) => String(c.id) === String(contactId));
    if (!prev) return false;
    const list = prev.interactions || [];
    if (!list.some((item) => String(item.id) === String(interactionId))) return false;

    void commitContactServerFirst(get, set, contactId, (contact) => {
      const nextList = (contact.interactions || []).map((item) => {
        if (String(item.id) !== String(interactionId)) return item;
        const next = { ...item, ...changes, id: item.id };
        if (changes.note != null && changes.summary == null) {
          next.summary = changes.note;
        }
        return next;
      });
      return {
        ...contact,
        interactions: nextList,
        last_interaction_date: new Date().toISOString(),
      };
    });
    return true;
  },

  removeInteraction: (contactId, interactionId) => {
    if (contactId == null || interactionId == null) return false;
    if (!useMockApi()) return false;
    const prev = get().contacts.find((c) => String(c.id) === String(contactId));
    if (!prev) return false;
    if (!(prev.interactions || []).some((item) => String(item.id) === String(interactionId))) {
      return false;
    }

    void commitContactServerFirst(get, set, contactId, (contact) => ({
      ...contact,
      interactions: (contact.interactions || []).filter(
        (item) => String(item.id) !== String(interactionId),
      ),
    }));
    return true;
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
      const { relatedPersons, interactions, ...companyInput } = newContact;
      const saved = await CompanyRepository.create({
        ...companyInput,
        relatedPersons: relatedPersons || [],
      });
      set((state) => ({ contacts: [saved, ...state.contacts], error: null }));
      return saved.id;
    } catch (error) {
      console.error('[contacts-store] addContact failed', error);
      set({ error: error?.message || 'ایجاد شرکت ناموفق بود.' });
      throw error;
    }
  },

  /**
   * SERVER_FIRST: nationalId → Backend/Linka → cache only after success.
   * @param {{ nationalId: string, entityType?: string }} input
   * @returns {Promise<{ company: object, created: boolean, mode: string }>}
   */
  createFromIdentityAsync: async (input = {}) => {
    const nationalId = String(input.nationalId || '').replace(/\D/g, '');
    const rawType = String(input.entityType || 'CUSTOMER').toUpperCase();
    const entityType = rawType === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER';
    const activityDomain = String(input.activityDomain || '').trim() || null;

    try {
      const result = await CompanyRepository.createFromIdentity({
        nationalId,
        entityType,
        activityDomain,
      });
      const company = result.company;
      if (!company?.id) {
        throw new Error('پاسخ ایجاد شرکت نامعتبر بود.');
      }
      set((state) => {
        const without = state.contacts.filter((c) => String(c.id) !== String(company.id));
        return { contacts: [company, ...without], error: null };
      });
      return {
        company,
        created: Boolean(result.created),
        mode: result.mode || (result.created ? 'create_new' : 'existing'),
        enrichment: result.enrichment || null,
      };
    } catch (error) {
      console.error('[contacts-store] createFromIdentity failed', error);
      set({ error: error?.message || 'استعلام/ثبت شرکت ناموفق بود.' });
      throw error;
    }
  },

  enrichFromLinkaAsync: async (companyId) => {
    try {
      const result = await CompanyRepository.enrichFromLinka(companyId);
      const company = result.company;
      if (company?.id) {
        set((state) => {
          const without = state.contacts.filter((c) => String(c.id) !== String(company.id));
          return { contacts: [company, ...without], error: null };
        });
      }
      return result;
    } catch (error) {
      console.error('[contacts-store] enrichFromLinka failed', error);
      set({ error: error?.message || 'غنی‌سازی از لینکا ناموفق بود.' });
      throw error;
    }
  },

  updateContact: (contactId, updates) => {
    if (!useMockApi() && updates?.relatedPersons) {
      console.warn('[contacts-store] relatedPersons write blocked in API mode (DDL-26)');
      const { relatedPersons, ...rest } = updates;
      if (!Object.keys(rest).length) return;
      updates = rest;
    }
    void commitContactServerFirst(get, set, contactId, (contact) => {
      const next = { ...contact, ...updates };
      if (updates.relatedPersons) {
        next.relatedPersons = updates.relatedPersons.map((person) =>
          normalizeContactPerson(person, contactId));
      }
      return next;
    });
  },

  /**
   * ContactPerson CRUD — child of Company (companyId = contact.id).
   * API mode: canonical Contact + CompanyContactRelationship only (DDL-26 cutover).
   * Mock mode: legacy embedded relatedPersons (read/write).
   * @returns {string|null}
   */
  addContactPerson: (companyId, contactData) => {
    if (!useMockApi()) {
      void get().addContactPersonAsync(companyId, contactData);
      return null;
    }
    return get().addContactPersonLegacy(companyId, contactData);
  },

  addContactPersonLegacy: (companyId, contactData) => {
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

    if (possibleDuplicateMobile) {
      set((state) => ({
        contactPersonAuditLog: [
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
        ],
      }));
    }

    void commitContactServerFirst(get, set, companyId, (contact) => {
      let persons = [...(contact.relatedPersons || [])];
      if (nextPerson.isPrimary) {
        persons = persons.map((p) => ({ ...p, isPrimary: false }));
      }
      return { ...contact, relatedPersons: [...persons, nextPerson] };
    });

    return personId;
  },

  addContactPersonAsync: async (companyId, contactData) => {
    const fullName = String(contactData?.fullName || contactData?.name || '').trim();
    const mobile = String(contactData?.mobile || '').trim();
    if (!fullName || !mobile) return null;

    if (useMockApi()) {
      return get().addContactPersonLegacy(companyId, contactData);
    }

    const duplicateMatches = lookupMobileDomain(get().contacts, mobile);
    try {
      await ContactRepository.create({
        fullName,
        mobile,
        email: String(contactData?.email || '').trim() || null,
        companyId,
        roleTitle: contactData?.jobPosition || contactData?.roleTitle || null,
        isPrimary: Boolean(contactData?.isPrimary),
        confirmDuplicate: duplicateMatches.length > 0,
        payload: contactData?.gender ? { gender: contactData.gender } : {},
      });
      const company = await get().fetchCompanyById(companyId);
      const normalized = normalizeMobile(mobile);
      const created = company?.relatedPersons?.find(
        (p) => normalizeMobile(p.mobile) === normalized,
      );
      return created?.id || null;
    } catch (error) {
      console.error('[contacts-store] addContactPersonAsync failed', error);
      set({ error: error?.message || 'افزودن رابط ناموفق بود.' });
      throw error;
    }
  },

  updateContactPerson: (companyId, contactPersonId, contactData) => {
    if (!useMockApi()) {
      void get().updateContactPersonAsync(companyId, contactPersonId, contactData);
      return;
    }
    get().updateContactPersonLegacy(companyId, contactPersonId, contactData);
  },

  updateContactPersonLegacy: (companyId, contactPersonId, contactData) => {
    void commitContactServerFirst(get, set, companyId, (contact) => {
      const persons = contact.relatedPersons || [];
      if (!persons.some((p) => String(p.id) === String(contactPersonId))) return null;

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
    });
  },

  updateContactPersonAsync: async (companyId, contactPersonId, contactData) => {
    if (useMockApi()) {
      get().updateContactPersonLegacy(companyId, contactPersonId, contactData);
      return contactPersonId;
    }

    const company = get().contacts.find((c) => String(c.id) === String(companyId));
    let relationshipId = company?.relatedPersons?.find(
      (p) => String(p.id) === String(contactPersonId),
    )?.relationshipId;

    if (!relationshipId) {
      const items = await ContactRepository.listByCompany(companyId);
      relationshipId = items.find(
        (r) => String(r.contact?.id) === String(contactPersonId),
      )?.id;
    }
    if (!relationshipId) {
      throw new Error('ارتباط مخاطب با شرکت یافت نشد.');
    }

    try {
      await ContactRepository.updateContact(contactPersonId, {
        fullName: contactData.fullName,
        mobile: contactData.mobile,
        email: contactData.email,
        payload: contactData.gender ? { gender: contactData.gender } : undefined,
      });
      await ContactRepository.updateRelationship(relationshipId, {
        roleTitle: contactData.jobPosition || contactData.roleTitle,
        ...(contactData.isPrimary !== undefined ? { isPrimary: Boolean(contactData.isPrimary) } : {}),
      });
      await get().fetchCompanyById(companyId);
      return contactPersonId;
    } catch (error) {
      console.error('[contacts-store] updateContactPersonAsync failed', error);
      set({ error: error?.message || 'ویرایش رابط ناموفق بود.' });
      throw error;
    }
  },

  deleteContactPerson: (companyId, contactPersonId) => {
    if (!useMockApi()) {
      void get().deleteContactPersonAsync(companyId, contactPersonId);
      return;
    }
    get().deleteContactPersonLegacy(companyId, contactPersonId);
  },

  deleteContactPersonLegacy: (companyId, contactPersonId) => {
    void commitContactServerFirst(get, set, companyId, (contact) => ({
      ...contact,
      relatedPersons: (contact.relatedPersons || []).filter(
        (person) => String(person.id) !== String(contactPersonId),
      ),
    }));
  },

  deleteContactPersonAsync: async (companyId, contactPersonId) => {
    if (useMockApi()) {
      get().deleteContactPersonLegacy(companyId, contactPersonId);
      return true;
    }

    const company = get().contacts.find((c) => String(c.id) === String(companyId));
    let relationshipId = company?.relatedPersons?.find(
      (p) => String(p.id) === String(contactPersonId),
    )?.relationshipId;

    if (!relationshipId) {
      const items = await ContactRepository.listByCompany(companyId);
      relationshipId = items.find(
        (r) => String(r.contact?.id) === String(contactPersonId),
      )?.id;
    }
    if (!relationshipId) {
      throw new Error('ارتباط مخاطب با شرکت یافت نشد.');
    }

    try {
      await ContactRepository.endRelationship(relationshipId);
      await get().fetchCompanyById(companyId);
      return true;
    } catch (error) {
      console.error('[contacts-store] deleteContactPersonAsync failed', error);
      set({ error: error?.message || 'حذف رابط ناموفق بود.' });
      throw error;
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
