import {
  STAGE_PARVANE_ID,
  STAGE_RAHESPAR_ID,
  STAGE_SARANJAM_ID,
  STAGE_TADAROK_ID,
} from './config';

export const OPERATIONAL_PHASES = {
  PARVANE: 'parvane',
  TADAROK: 'tadarok',
  RAHESPAR: 'rahespar',
  SARANJAM: 'saranjam',
};

/** جریان عملیاتی: تدارک → رهسپار → سرانجام (پس از ماشه تأمین) */
export const OPERATIONAL_PHASE_ORDER = [
  OPERATIONAL_PHASES.PARVANE,
  OPERATIONAL_PHASES.TADAROK,
  OPERATIONAL_PHASES.RAHESPAR,
  OPERATIONAL_PHASES.SARANJAM,
];

export const OPERATIONAL_PHASE_META = {
  [OPERATIONAL_PHASES.PARVANE]: {
    label: 'ماشه تأمین',
    subtitle: 'تأیید و صدور دستور خرید',
    stageId: STAGE_PARVANE_ID,
  },
  [OPERATIONAL_PHASES.TADAROK]: {
    label: 'تدارک',
    subtitle: 'خرید، کنترل کیفیت و سفارش ارسال',
    stageId: STAGE_TADAROK_ID,
  },
  [OPERATIONAL_PHASES.RAHESPAR]: {
    label: 'رهسپار',
    subtitle: 'بارگیری و لجستیک تحویل',
    stageId: STAGE_RAHESPAR_ID,
  },
  [OPERATIONAL_PHASES.SARANJAM]: {
    label: 'سرانجام',
    subtitle: 'تحویل و تسویه مالی',
    stageId: STAGE_SARANJAM_ID,
  },
};

export const ORDER_SUCCESS_COLOR = '#2E8B57';
