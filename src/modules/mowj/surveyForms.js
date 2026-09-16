/**
 * Survey form pick-list (labels only) — shared by builder UI.
 * Full survey schema remains in surveyBuilderData.js.
 */

export const SURVEY_FORMS = [
  { id: 'nps_delivery', label: 'NPS تحویل کالا' },
  { id: 'csat_support', label: 'رضایت پشتیبانی' },
  { id: 'product_feedback', label: 'بازخورد کیفیت محصول' },
  { id: 'renewal_intent', label: 'قصد تمدید قرارداد' },
];

export function findSurveyFormLabel(id) {
  return SURVEY_FORMS.find((item) => item.id === id)?.label || '—';
}
