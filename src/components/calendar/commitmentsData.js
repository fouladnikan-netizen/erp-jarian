import {
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliWeekday,
  toPersianDigits,
} from '../../modules/nabz/dateUtils';
import { PIPELINE_STAGES, getContactDisplayName } from '../../modules/ofogh/pipelineConfig';
import { listCompanyInteractions } from '../../modules/pooyesh/interactionFacade';

/**
 * موتور تعهدات (پویش) — نمای تجمیعیِ فقط-خواندنی از تعهدات زمان‌دار سایر ماژول‌ها.
 * مسیر محصول: /pooyesh (سطح محصول سابق گاه‌شمار، بدون تغییر UI).
 * اینجا هیچ رویدادی «ساخته» نمی‌شود؛ داده از نبض، افق/کانون و مالی تجمیع می‌شود.
 */
export const COMMITMENT_TYPES = {
  followup: { id: 'followup', label: 'پیگیری‌ها', source: 'افق' },
  task: { id: 'task', label: 'وظایف', source: 'پویش' },
  finance: { id: 'finance', label: 'تسویه‌ها', source: 'مالی' },
  logistics: { id: 'logistics', label: 'بارگیری', source: 'رهسپار' },
  contract: { id: 'contract', label: 'قراردادها', source: 'میثاق' },
};

export const TYPE_ORDER = ['followup', 'task', 'finance', 'logistics', 'contract'];

export const PRIORITY_META = {
  high: { label: 'فوری', className: 'is-high' },
  medium: { label: 'مهم', className: 'is-medium' },
  normal: { label: 'عادی', className: 'is-normal' },
};

export const WEEKDAY_LABELS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/* ——— ابزارهای تاریخ جلالی ——— */

export function dateToJalaliParts(date) {
  return gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function jalaliPartsToDate({ year, month, day }) {
  const g = jalaliToGregorian(year, month, day);
  return new Date(g.year, g.month - 1, g.day, 12, 0, 0);
}

export function shiftJalali(parts, days) {
  const date = jalaliPartsToDate(parts);
  date.setDate(date.getDate() + days);
  return dateToJalaliParts(date);
}

export function dayKey({ year, month, day }) {
  return `${year}-${month}-${day}`;
}

export function compareParts(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** «شنبه ۱۰ مرداد» */
export function formatDayLabel(parts) {
  const weekday = WEEKDAY_LABELS[(getJalaliWeekday(parts.year, parts.month, parts.day) + 1) % 7];
  return `${weekday} ${toPersianDigits(parts.day)} ${JALALI_MONTHS[parts.month - 1]}`;
}

export function formatPartsLong({ year, month, day }) {
  return `${toPersianDigits(day)} ${JALALI_MONTHS[month - 1]} ${toPersianDigits(year)}`;
}

function isoToJalaliParts(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return dateToJalaliParts(date);
}

/**
 * تعهدات مالی/لجستیک/قرارداد هنوز به پروجکشن واقعی نبض/رهسپار/میثاق متصل
 * نشده‌اند (P1 GAP — گزارش QA پویش). طبق قانون طلایی هیچ دادهٔ فیک نمایش
 * داده نمی‌شود؛ تا اتصال آن سرویس‌ها، این دسته‌ها خالی نمایش داده می‌شوند.
 */

function taskDisplayTarget(task, contacts) {
  const companyId = task.companyReference?.companyId ?? task.subject?.entityId;
  const contact = companyId != null
    ? (contacts || []).find((c) => String(c.id) === String(companyId))
    : null;
  return contact ? getContactDisplayName(contact) : (task.subject?.entityType === 'RAW_LEAD' ? 'سرنخ خام' : '—');
}

/** تعهدات وظیفهٔ کانونیک پویش (Task با dueAt باز) را به آیتم تقویم تبدیل می‌کند. */
export function buildTaskCommitments(tasks, contacts, todayParts) {
  const items = [];
  (tasks || []).forEach((task) => {
    if (!task || task.status === 'COMPLETED' || task.status === 'CANCELLED') return;
    if (!task.dueAt) return;
    const parts = isoToJalaliParts(task.dueAt);
    if (!parts) return;
    const overdue = compareParts(parts, todayParts) < 0;
    const companyId = task.companyReference?.companyId ?? task.subject?.entityId;
    const target = taskDisplayTarget(task, contacts);
    const dueDate = new Date(task.dueAt);
    const time = Number.isNaN(dueDate.getTime())
      ? null
      : `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`;

    items.push({
      id: `task-${task.id}`,
      type: 'task',
      parts,
      time,
      title: task.title,
      target,
      owner: task.assignedTo || { name: 'پویش', role: 'وظیفه' },
      priority: task.priority === 'high' ? 'high' : (overdue ? 'high' : 'normal'),
      contactId: task.subject?.entityType === 'COMPANY' ? companyId : null,
      link: companyId != null ? `/kanoon/contact/${companyId}` : '/pooyesh',
      details: [
        { label: 'منبع', value: 'وظیفه پویش' },
        { label: 'وضعیت', value: task.status === 'IN_PROGRESS' ? 'در حال انجام' : 'باز' },
      ],
      note: task.description || null,
    });
  });
  return items;
}

/**
 * تجمیع تعهدات: پیگیری‌های زنده از useContactsStore + وظایف کانونیک پویش
 * (canonical Task via taskFacade). دسته‌های مالی/لجستیک/قرارداد تا اتصال
 * پروجکشن واقعی نبض/رهسپار/میثاق خالی می‌مانند (بدون داده فیک).
 */
export function buildCommitments(contacts, todayParts, tasks = []) {
  const items = [];

  (contacts || []).forEach((contact) => {
    if (!contact.next_follow_up_date) return;
    const parts = isoToJalaliParts(contact.next_follow_up_date);
    if (!parts) return;
    const overdue = compareParts(parts, todayParts) < 0;
    items.push({
      id: `fu-${contact.id}`,
      type: 'followup',
      parts,
      time: null,
      title: `پیگیری ${getContactDisplayName(contact)}`,
      target: getContactDisplayName(contact),
      owner: contact.assignee || { name: 'شوالیه فروش', role: 'شوالیه' },
      priority: overdue ? 'high' : 'normal',
      contactId: contact.id,
      link: `/kanoon/contact/${contact.id}`,
      details: [
        { label: 'منبع', value: 'بورد افق — چرخه فرصت' },
        {
          label: 'مرحله',
          value: PIPELINE_STAGES.find((s) => s.id === contact.lifecycle_stage)?.label || '—',
        },
      ],
      note: (() => {
        const latest = listCompanyInteractions(contact.id)[0];
        return latest
          ? `آخرین تعامل ثبت‌شده: ${latest.summary || latest.note || '—'}`
          : null;
      })(),
    });
  });

  items.push(...buildTaskCommitments(tasks, contacts, todayParts));

  return items;
}

/**
 * گروه‌بندی: معوق‌ها جدا (قدیمی‌ترین اول)، بقیه به‌تفکیک روز و مرتب بر اساس ساعت.
 */
export function groupCommitments(items, todayParts) {
  const overdue = [];
  const dayMap = new Map();

  items.forEach((item) => {
    if (compareParts(item.parts, todayParts) < 0) {
      overdue.push(item);
      return;
    }
    const key = dayKey(item.parts);
    if (!dayMap.has(key)) dayMap.set(key, { parts: item.parts, items: [] });
    dayMap.get(key).items.push(item);
  });

  overdue.sort((a, b) => compareParts(a.parts, b.parts));

  const days = [...dayMap.values()].sort((a, b) => compareParts(a.parts, b.parts));
  days.forEach((day) => {
    day.items.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const diff = compareParts(day.parts, todayParts);
    if (diff === 0) day.relative = 'امروز';
    else if (dayKey(day.parts) === dayKey(shiftJalali(todayParts, 1))) day.relative = 'فردا';
    day.label = formatDayLabel(day.parts);
  });

  return { overdue, days };
}

/** متریک‌های نوار «امروز» */
export function buildTodayMetrics(items, todayParts) {
  const todayKey = dayKey(todayParts);
  let meetings = 0;
  let followups = 0;
  let settlements = 0;
  let overdue = 0;

  items.forEach((item) => {
    if (compareParts(item.parts, todayParts) < 0) {
      overdue += 1;
      return;
    }
    if (dayKey(item.parts) !== todayKey) return;
    if (item.subtype === 'meeting') meetings += 1;
    else if (item.type === 'followup') followups += 1;
    else if (item.type === 'finance') settlements += 1;
  });

  return { meetings, followups, settlements, overdue };
}
