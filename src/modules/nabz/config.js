/** سند چارچوب جریان — مراحل هفت‌گانه سفارش (تجهیز در تدارک ادغام شد) */

export const ORDER_TABS = {
  CURRENT: 'current',
  SUCCESS: 'success',
  FAILED: 'failed',
};

export const VIEW_MODES = {
  LIST: 'list',
  KANBAN: 'kanban',
};

export const PHASE1_STAGES = [
  { id: 1, key: 'kavosh', label: 'کاوش' },
  { id: 2, key: 'mozene', label: 'مظنه' },
  { id: 3, key: 'pishkesh', label: 'پیش‌کش' },
];

/** فاز عملیات: ماشه تأمین → تدارک → رهسپار → سرانجام */
export const PHASE2_STAGES = [
  { id: 4, key: 'parvane', label: 'ماشه تأمین' },
  { id: 5, key: 'tadarok', label: 'تدارک' },
  { id: 7, key: 'rahespar', label: 'رهسپار' },
  { id: 8, key: 'saranjam', label: 'سرانجام' },
];

export const ALL_STAGES = [...PHASE1_STAGES, ...PHASE2_STAGES];

export const ORDER_TAB_META = {
  [ORDER_TABS.CURRENT]: { label: 'جاری', listTitle: 'فهرست سفارشات جاری' },
  [ORDER_TABS.SUCCESS]: { label: 'موفق', listTitle: 'فهرست سفارشات موفق' },
  [ORDER_TABS.FAILED]: { label: 'ناموفق', listTitle: 'فهرست سفارشات ناموفق' },
};

export function getStageLabel(stageId) {
  return ALL_STAGES.find((s) => s.id === stageId)?.label || '—';
}

export function getKanbanStages(tab) {
  if (tab === ORDER_TABS.SUCCESS) return PHASE2_STAGES;
  if (tab === ORDER_TABS.CURRENT) return PHASE1_STAGES;
  return [];
}

export const PHASE1_LAST_STAGE_ID = PHASE1_STAGES[PHASE1_STAGES.length - 1].id;

export const STAGE_KAVOSH_ID = 1;
export const STAGE_MOZENE_ID = 2;
export const STAGE_PISHKESH_ID = 3;
export const STAGE_PARVANE_ID = 4;
export const STAGE_TADAROK_ID = 5;
/** @deprecated مرحله تجهیز حذف شد؛ فقط برای مهاجرت داده‌های قدیمی */
export const LEGACY_STAGE_TAJHIZ_ID = 6;
export const STAGE_RAHESPAR_ID = 7;
export const STAGE_SARANJAM_ID = 8;
export const PHASE2_FIRST_STAGE_ID = STAGE_PARVANE_ID;
export const PHASE2_LAST_STAGE_ID = STAGE_SARANJAM_ID;

export function isPhase1Stage(stageId) {
  return PHASE1_STAGES.some((stage) => stage.id === stageId);
}

/** شامل شناسهٔ منسوخ تجهیز برای سازگاری دادهٔ قدیمی */
export function isPhase2Stage(stageId) {
  return PHASE2_STAGES.some((stage) => stage.id === stageId)
    || stageId === LEGACY_STAGE_TAJHIZ_ID;
}

/** فقط مراحل فعال کانبان/استپر فاز ۲ (بدون تجهیز) */
export function isActivePhase2Stage(stageId) {
  return PHASE2_STAGES.some((stage) => stage.id === stageId);
}

/** رنگ‌های ملایم مرحله — فقط از Theme Tokens (RFC-001) */
export const STAGE_TINTS = {
  1: { bg: 'var(--stage-1-bg)', accent: 'var(--stage-1-accent)' },
  2: { bg: 'var(--stage-2-bg)', accent: 'var(--stage-2-accent)' },
  3: { bg: 'var(--stage-3-bg)', accent: 'var(--stage-3-accent)' },
  4: { bg: 'var(--stage-4-bg)', accent: 'var(--stage-4-accent)' },
  5: { bg: 'var(--stage-5-bg)', accent: 'var(--stage-5-accent)' },
  7: { bg: 'var(--stage-7-bg)', accent: 'var(--stage-7-accent)' },
  8: { bg: 'var(--stage-8-bg)', accent: 'var(--stage-8-accent)' },
};
