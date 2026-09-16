/** انواع بلوک و پیش‌فرض‌های فرم‌ساز نظرسنجی */

import { createEntityId, ENTITY_ID_PREFIX } from '../../domain/identity';

export const FIELD_TYPES = [
  {
    id: 'short_text',
    label: 'متن کوتاه',
    hint: 'پاسخ یک‌خطی',
    icon: 'Type',
    defaultQuestion: 'سؤال کوتاه خود را بنویسید',
  },
  {
    id: 'paragraph',
    label: 'پاراگراف',
    hint: 'پاسخ چندخطی',
    icon: 'AlignLeft',
    defaultQuestion: 'توضیحات بیشتری می‌خواهید؟',
  },
  {
    id: 'multiple_choice',
    label: 'چندگزینه‌ای',
    hint: 'انتخاب از بین گزینه‌ها',
    icon: 'ListOrdered',
    defaultQuestion: 'کدام گزینه را انتخاب می‌کنید؟',
    defaultOptions: ['گزینه ۱', 'گزینه ۲', 'گزینه ۳'],
  },
  {
    id: 'rating',
    label: 'امتیازدهی / NPS',
    hint: 'مقیاس ۰ تا ۱۰',
    icon: 'Star',
    defaultQuestion: 'چقدر احتمال دارد ما را پیشنهاد دهید؟',
  },
  {
    id: 'file_upload',
    label: 'آپلود فایل',
    hint: 'پیوست تصویر یا سند',
    icon: 'Upload',
    defaultQuestion: 'فایل مرتبط را بارگذاری کنید',
  },
];

export function createBlock(typeId) {
  const meta = FIELD_TYPES.find((t) => t.id === typeId) || FIELD_TYPES[0];
  return {
    id: createEntityId(ENTITY_ID_PREFIX.SURVEY_BLOCK),
    type: meta.id,
    question: meta.defaultQuestion,
    required: false,
    options: meta.defaultOptions ? [...meta.defaultOptions] : undefined,
  };
}

export function createEmptySurvey(seed = {}) {
  return {
    id: seed.id || createEntityId(ENTITY_ID_PREFIX.SURVEY),
    title: seed.title || '',
    welcome: seed.welcome || '',
    thankYou: seed.thankYou || 'از وقتی که گذاشتید سپاسگزاریم.',
    blocks: seed.blocks || [],
  };
}
