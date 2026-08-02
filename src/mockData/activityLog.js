/**
 * لاگ فعالیت نمونه — اسکیمای سازگار با دیتابیس آینده.
 * actor و entity همیشه شیء ساختاریافته‌اند (نه رشتهٔ خام).
 */

export const MOCK_ACTIVITIES = [
  {
    id: 'uuid-1',
    entity: { type: 'ORDER', id: 'ORD-1405-001' },
    eventType: 'DOCUMENT_OPENED',
    actor: { type: 'CUSTOMER', id: 'CUS-001', name: 'شرکت نمونه' },
    metadata: { documentId: 'PI-1405-00027' },
    description: 'پیش فاکتور توسط مشتری در موبایل مشاهده شد',
    createdAt: '2026-08-02T10:30:00',
  },
  {
    id: 'uuid-2',
    entity: { type: 'ORDER', id: 'ORD-1405-001' },
    eventType: 'NOTE_ADDED',
    actor: { type: 'USER', id: 'USR-012', name: 'سارا احمدی' },
    metadata: { noteId: 'NOTE-88' },
    description: 'یادداشت پیگیری ارسال لینک امن ثبت شد',
    createdAt: '2026-08-02T09:45:00',
  },
  {
    id: 'uuid-3',
    entity: { type: 'ORDER', id: 'ORD-1405-001' },
    eventType: 'ORDER_APPROVED',
    actor: { type: 'USER', id: 'USR-003', name: 'شوالیه فروش' },
    metadata: { stage: 'PISHKESH' },
    description: 'سفارش پس از مهر پیش‌فاکتور تایید داخلی شد',
    createdAt: '2026-08-01T16:12:00',
  },
  {
    id: 'uuid-4',
    entity: { type: 'ORDER', id: 'ORD-1405-001' },
    eventType: 'DOCUMENT_OPENED',
    actor: { type: 'CUSTOMER', id: 'CUS-001', name: 'شرکت نمونه' },
    metadata: { documentId: 'PI-1405-00027', device: 'desktop' },
    description: 'بازگشایی مجدد پیش‌فاکتور از مرورگر دسکتاپ',
    createdAt: '2026-08-02T11:05:00',
  },
  {
    id: 'uuid-5',
    entity: { type: 'CUSTOMER', id: 'CUS-001' },
    eventType: 'NOTE_ADDED',
    actor: { type: 'USER', id: 'USR-012', name: 'سارا احمدی' },
    metadata: {},
    description: 'یادداشت پروفایل مشتری ثبت شد',
    createdAt: '2026-07-28T12:00:00',
  },
];

/** قالب نمایشی وقتی هنوز رویدادی برای entity ثبت نشده (فقط UI دمو) */
const DEMO_TEMPLATES = [
  {
    eventType: 'DOCUMENT_OPENED',
    actor: { type: 'CUSTOMER', id: 'CUS-DEMO', name: 'مشتری' },
    metadata: { documentId: 'PI-1405-00027' },
    description: 'پیش فاکتور توسط مشتری در موبایل مشاهده شد',
    createdAt: '2026-08-02T10:30:00',
  },
  {
    eventType: 'NOTE_ADDED',
    actor: { type: 'USER', id: 'USR-DEMO', name: 'کارشناس فروش' },
    metadata: {},
    description: 'یادداشت پیگیری ثبت شد',
    createdAt: '2026-08-02T09:15:00',
  },
  {
    eventType: 'ORDER_APPROVED',
    actor: { type: 'USER', id: 'USR-DEMO', name: 'شوالیه فروش' },
    metadata: {},
    description: 'تایید داخلی گردش کار ثبت شد',
    createdAt: '2026-08-01T14:40:00',
  },
];

function sortByCreatedAtDesc(list) {
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * فعالیت‌های یک موجودیت را برمی‌گرداند.
 * اگر رکوردی نبود، قالب دمو با entity درخواستی برمی‌گردد تا UI خالی نماند.
 */
export function getActivitiesForEntity(entityType, entityId) {
  if (!entityType || !entityId) return [];

  const matched = MOCK_ACTIVITIES.filter(
    (item) => item.entity?.type === entityType && item.entity?.id === entityId,
  );

  if (matched.length) return sortByCreatedAtDesc(matched);

  return sortByCreatedAtDesc(
    DEMO_TEMPLATES.map((tpl, index) => ({
      id: `demo-${entityType}-${entityId}-${index}`,
      entity: { type: entityType, id: entityId },
      ...tpl,
      actor: {
        ...tpl.actor,
        name: tpl.actor.type === 'CUSTOMER' ? 'مشتری سفارش' : tpl.actor.name,
      },
    })),
  );
}
