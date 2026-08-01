import { create } from 'zustand';
import { initialContacts } from '../modules/kanoon/contactsData';
import { BRAND_NAME, SHOW_BRAND_NAME } from '../config/brand';

/**
 * چرخه حیات مخاطب — ستون‌های پایپ‌لاین افق.
 * افق دیتابیس جدا ندارد؛ همین مخاطبین کانون هستند که با این فیلد روی بورد چیده می‌شوند.
 */
export const LIFECYCLE_STAGES = Object.freeze({
  COLD_LEAD: 'cold_lead',
  PITCHED: 'pitched',
  NURTURING: 'nurturing',
  SALES_QUALIFIED: 'sales_qualified',
  FIRST_TIME_BUYER: 'first_time_buyer',
  LOYAL: 'loyal',
  ARCHIVED: 'archived',
});

export const LIFECYCLE_STAGE_ORDER = Object.freeze([
  LIFECYCLE_STAGES.COLD_LEAD,
  LIFECYCLE_STAGES.PITCHED,
  LIFECYCLE_STAGES.NURTURING,
  LIFECYCLE_STAGES.SALES_QUALIFIED,
  LIFECYCLE_STAGES.FIRST_TIME_BUYER,
  LIFECYCLE_STAGES.LOYAL,
  LIFECYCLE_STAGES.ARCHIVED,
]);

function daysFromNow(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/**
 * Seed پایپ‌لاین برای دموی درگ‌اند‌دراپ — بعداً از سرویس/DB پر می‌شود.
 * تاریخ‌ها نسبت به امروز ساخته می‌شوند تا هر سه حالت نبض (عقب‌افتاده/امروز/آینده) دیده شود.
 */
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
    lifecycle_stage: PIPELINE_SEED[contact.id]?.lifecycle_stage ?? LIFECYCLE_STAGES.COLD_LEAD,
    next_follow_up_date: PIPELINE_SEED[contact.id]?.next_follow_up_date ?? null,
    last_interaction_date:
      PIPELINE_SEED[contact.id]?.last_interaction_date ?? contact.lastActivityAt ?? contact.createdAt,
    interactions: normalizeSeedInteractions(contact),
  }));
}

/**
 * تعاملات موجود کانون ({date, type, summary}) را به قالب واحد تایم‌لاین ({id, date, note, operator}) تبدیل می‌کند.
 * فیلد summary هم نگه داشته می‌شود چون تایم‌لاین پروفایل کانون از آن می‌خواند.
 */
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
 * منبع واحد حقیقت مخاطبین (کانون + لایه پایپ‌لاین افق).
 */
export const useContactsStore = create((set) => ({
  contacts: seedContacts(),

  /** جابه‌جایی مخاطب بین ستون‌های پایپ‌لاین (درگ‌اند‌دراپ افق). */
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

  /**
   * ثبت تعامل جدید (مودال لید افق) — یادداشت/تماس/وظیفه را به ابتدای تایم‌لاین اضافه می‌کند،
   * تاریخ پیگیری بعدی را (در صورت ارسال) به‌روز و آخرین تعامل را «اکنون» می‌کند.
   */
  addInteraction: (contactId, note, nextFollowUpDate, type = 'note') => {
    const trimmed = (note || '').trim();
    if (!trimmed) return;
    set((state) => ({
      contacts: state.contacts.map((contact) => {
        if (contact.id !== contactId) return contact;
        const now = new Date().toISOString();
        const entry = {
          id: `int-${contactId}-${Date.now()}`,
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
   * ثبت مخاطب/فرصت جدید — از فرم کانون یا فرم «فرصت جدید» افق.
   * هر مخاطب تازه به‌صورت خودکار کارت مرحله اول پایپ‌لاین افق (نوپدید) می‌شود.
   */
  addContact: (contact) => {
    const newContact = {
      lifecycle_stage: LIFECYCLE_STAGES.COLD_LEAD,
      next_follow_up_date: null,
      last_interaction_date: new Date().toISOString(),
      interactions: [],
      ...contact,
      id: contact.id ?? Date.now(),
    };
    set((state) => ({ contacts: [newContact, ...state.contacts] }));
    return newContact.id;
  },

  /** ویرایش مخاطب (پروفایل کانون). */
  updateContact: (contactId, updates) => {
    set((state) => ({
      contacts: state.contacts.map((contact) => (
        contact.id === contactId ? { ...contact, ...updates } : contact
      )),
    }));
  },
}));
