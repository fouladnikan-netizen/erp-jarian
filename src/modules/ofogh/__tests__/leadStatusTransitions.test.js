import { describe, it, expect } from 'vitest';
import {
  LEAD_STATUS,
  getAllowedLeadStatusTransitions,
  getLeadStatusLabel,
  isLeadStatusTerminal,
} from '../domain/lead.constants.js';

describe('lead status UI transitions', () => {
  it('NEW → QUALIFYING and REJECTED', () => {
    expect(getAllowedLeadStatusTransitions(LEAD_STATUS.NEW)).toEqual([
      LEAD_STATUS.QUALIFYING,
      LEAD_STATUS.REJECTED,
    ]);
  });

  it('QUALIFYING → REJECTED only (convert is separate)', () => {
    expect(getAllowedLeadStatusTransitions(LEAD_STATUS.QUALIFYING)).toEqual([
      LEAD_STATUS.REJECTED,
    ]);
  });

  it('CONVERTED → status change unavailable', () => {
    expect(getAllowedLeadStatusTransitions(LEAD_STATUS.CONVERTED)).toEqual([]);
    expect(isLeadStatusTerminal(LEAD_STATUS.CONVERTED)).toBe(true);
  });

  it('REJECTED → status change unavailable', () => {
    expect(getAllowedLeadStatusTransitions(LEAD_STATUS.REJECTED)).toEqual([]);
    expect(isLeadStatusTerminal(LEAD_STATUS.REJECTED)).toBe(true);
  });

  it('CONVERTED is never in allowed status menu options', () => {
    const all = [
      ...getAllowedLeadStatusTransitions(LEAD_STATUS.NEW),
      ...getAllowedLeadStatusTransitions(LEAD_STATUS.QUALIFYING),
      ...getAllowedLeadStatusTransitions(LEAD_STATUS.OPEN),
    ];
    expect(all).not.toContain(LEAD_STATUS.CONVERTED);
  });

  it('UI labels are Persian (no raw enums to end users)', () => {
    expect(getLeadStatusLabel(LEAD_STATUS.NEW)).toBe('جدید');
    expect(getLeadStatusLabel(LEAD_STATUS.QUALIFYING)).toBe('در حال بررسی');
    expect(getLeadStatusLabel(LEAD_STATUS.CONVERTED)).toBe('تبدیل‌شده');
    expect(getLeadStatusLabel(LEAD_STATUS.REJECTED)).toBe('ردشده');
  });
});
