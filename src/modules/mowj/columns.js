/**
 * Mowj campaign list columns — module defines columns only (Law #004).
 */

export const MOWJ_CAMPAIGN_COLUMNS = Object.freeze([
  {
    key: 'check',
    title: 'انتخاب',
    defaultWidth: 52,
    resizable: false,
    locked: true,
    sortable: false,
    filterable: false,
  },
  {
    key: 'row',
    title: 'ردیف',
    defaultWidth: 56,
    resizable: false,
    locked: true,
    sortable: false,
    filterable: false,
  },
  {
    key: 'name',
    title: 'نام کمپین',
    defaultWidth: 200,
    locked: true,
    filterable: true,
  },
  {
    key: 'purpose',
    title: 'هدف',
    defaultWidth: 110,
    filterable: true,
  },
  {
    key: 'campaignType',
    title: 'نوع کمپین',
    defaultWidth: 140,
    filterable: true,
  },
  {
    key: 'channel',
    title: 'کانال',
    defaultWidth: 110,
    filterable: true,
  },
  {
    key: 'status',
    title: 'وضعیت',
    defaultWidth: 120,
    filterable: true,
  },
  {
    key: 'kpi',
    title: 'KPI هدف',
    defaultWidth: 140,
    filterable: true,
  },
  {
    key: 'actions',
    title: 'عملیات',
    defaultWidth: 120,
    resizable: false,
    locked: true,
    sortable: false,
    filterable: false,
  },
]);

/** Map campaign status → ListStatusPill kind */
export function getCampaignStatusPillKind(status) {
  const key = String(status || '').toUpperCase();
  if (key === 'DRAFT') return 'draft';
  if (key === 'READY') return 'info';
  if (key === 'RUNNING') return 'in-progress';
  if (key === 'PAUSED') return 'warning';
  if (key === 'COMPLETED') return 'success';
  if (key === 'CANCELLED') return 'inactive';
  return 'pending';
}

/**
 * Raw cell value for excel filter / sort (presentation rows from facade).
 * @param {object} campaign
 * @param {string} key
 */
export function getCampaignCellRaw(campaign, key) {
  switch (key) {
    case 'name':
      return campaign.name || '';
    case 'purpose':
      return campaign.purposeLabel || campaign.purpose || '';
    case 'campaignType':
      return campaign.campaignTypeLabel || campaign.campaignType || '';
    case 'channel':
      return campaign.channelLabel || '';
    case 'status':
      return campaign.statusLabel || campaign.status || '';
    case 'kpi':
      return campaign.kpiLabel || '';
    default:
      return '';
  }
}
