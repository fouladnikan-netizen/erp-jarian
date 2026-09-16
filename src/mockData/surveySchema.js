/**
 * اسکیمای نظرسنجی مشتری‌محور (Path A — Tanin).
 * Entity-aware برای آنالیتیکس آینده.
 */
export const MOCK_SURVEY_PAYLOAD = {
  surveyId: 'SRV-1001',
  customerId: 'CUS-203',
  orderId: 'ORD-1405-22',
  config: {
    title: 'ارزیابی کیفیت خدمات',
    type: 'post_delivery',
  },
  questions: [
    {
      id: 'q1',
      type: 'rating',
      text: 'چقدر از کیفیت مقاطع فولادی ارسال شده رضایت دارید؟',
      required: true,
      validation: { min: 1, max: 5 },
      metadata: { category: 'quality', relatedEntity: 'ORDER' },
    },
    {
      id: 'q2',
      type: 'boolean',
      text: 'آیا پترو فولاد نیکان را به همکاران خود توصیه می‌کنید؟',
      required: true,
      metadata: { category: 'nps' },
    },
    {
      id: 'q3',
      type: 'text',
      text: 'پیشنهادی برای بهبود خدمات ما دارید؟',
      required: false,
    },
  ],
};

export function getSurveyById(surveyId) {
  if (!surveyId || surveyId === 'mock-id' || surveyId === MOCK_SURVEY_PAYLOAD.surveyId) {
    return MOCK_SURVEY_PAYLOAD;
  }
  return {
    ...MOCK_SURVEY_PAYLOAD,
    surveyId,
  };
}
