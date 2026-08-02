/**
 * داده تجمیعی آنالیتیکس نظرسنجی — Admin Tanin Dashboard
 */
export const MOCK_SURVEY_ANALYTICS = {
  campaignId: 'CMP-901',
  campaignName: 'ارزیابی کیفیت سه‌ماهه سوم',
  kpis: {
    npsScore: '+45',
    responseRate: '68%',
    averageRating: 4.2,
    totalResponses: 124,
  },
  ratingDistribution: [
    { stars: 5, count: 70 },
    { stars: 4, count: 30 },
    { stars: 3, count: 15 },
    { stars: 2, count: 5 },
    { stars: 1, count: 4 },
  ],
  recentFeedbacks: [
    {
      id: 'f1',
      customerName: 'شرکت فولاد البرز',
      customerId: 'CUS-ALBORZ',
      orderId: 'ORD-1405-089',
      rating: 5,
      comment: 'ارسال به موقع و کیفیت عالی بود.',
      date: '۱۴۰۲/۰۸/۱۲',
    },
    {
      id: 'f2',
      customerName: 'صنایع فلزی کاوه',
      customerId: 'CUS-KAVEH',
      orderId: 'ORD-1405-042',
      rating: 2,
      comment: 'تاخیر در بارگیری داشتیم و راننده هماهنگ نبود.',
      date: '۱۴۰۲/۰۸/۱۱',
    },
    {
      id: 'f3',
      customerName: 'بازرگانی نیکان پارس',
      customerId: 'CUS-NIKAN',
      orderId: 'ORD-1405-101',
      rating: 4,
      comment: 'کیفیت خوب بود؛ بسته‌بندی قابل بهبود است.',
      date: '۱۴۰۲/۰۸/۱۰',
    },
  ],
};
