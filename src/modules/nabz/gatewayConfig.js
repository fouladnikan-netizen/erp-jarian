import {
  STAGE_KAVOSH_ID,
  STAGE_MOZENE_ID,
  STAGE_PISHKESH_ID,
} from './config';

export const GATEWAY_PHASES = {
  KAVOSH: 'kavosh',
  MOZENE: 'mozene',
  PISHKESH: 'pishkesh',
};

export const GATEWAY_PHASE_ORDER = [
  GATEWAY_PHASES.KAVOSH,
  GATEWAY_PHASES.MOZENE,
  GATEWAY_PHASES.PISHKESH,
];

export const GATEWAY_PHASE_META = {
  [GATEWAY_PHASES.KAVOSH]: {
    label: 'کاوش',
    subtitle: 'ثبت اقلام و استعلام تامین',
    stageId: STAGE_KAVOSH_ID,
  },
  [GATEWAY_PHASES.MOZENE]: {
    label: 'مظنه',
    subtitle: 'تعیین حاشیه سود و قیمت فروش',
    stageId: STAGE_MOZENE_ID,
  },
  [GATEWAY_PHASES.PISHKESH]: {
    label: 'پیش‌کش',
    subtitle: 'مرور پیش‌فاکتور و تعیین تکلیف',
    stageId: STAGE_PISHKESH_ID,
  },
};
