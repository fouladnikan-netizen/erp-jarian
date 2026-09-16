import { describe, expect, it } from 'vitest';
import {
  canDropOnKanbanStage,
  canEnterMozeneStage,
  canSelectStageInList,
  getEffectiveStageId,
  hasInquiryOnAllLines,
  tryChangeOrderStage,
} from '../nabz/orderStageService.js';
import {
  STAGE_KAVOSH_ID,
  STAGE_MOZENE_ID,
  STAGE_PISHKESH_ID,
  LEGACY_STAGE_TAJHIZ_ID,
  STAGE_RAHESPAR_ID,
} from '../nabz/config.js';

function orderWithInquiries(overrides = {}) {
  return {
    status: 'current',
    stageId: STAGE_KAVOSH_ID,
    inquiryCompletedAt: '۱۴۰۴/۰۱/۰۱',
    items: [
      { name: 'تیرآهن', inquiries: [{ id: 1, unitPrice: 100 }] },
    ],
    events: [{ type: 'inquiry_order_completed' }],
    ...overrides,
  };
}

describe('orderStageService — workflow transitions', () => {
  it('hasInquiryOnAllLines is false when any line lacks inquiries', () => {
    expect(hasInquiryOnAllLines({ items: [] })).toBe(false);
    expect(hasInquiryOnAllLines({
      items: [{ inquiries: [{ id: 1 }] }, { inquiries: [] }],
    })).toBe(false);
    expect(hasInquiryOnAllLines({
      items: [{ inquiries: [{ id: 1 }] }, { inquiries: [{ id: 2 }] }],
    })).toBe(true);
  });

  it('canEnterMozeneStage requires completed inquiries + completion signal', () => {
    expect(canEnterMozeneStage(orderWithInquiries())).toBe(true);
    expect(canEnterMozeneStage(orderWithInquiries({
      inquiryCompletedAt: null,
      events: [],
    }))).toBe(false);
    expect(canEnterMozeneStage(orderWithInquiries({
      items: [{ name: 'x', inquiries: [] }],
    }))).toBe(false);
  });

  it('getEffectiveStageId falls back to kavosh when mozene is not earned', () => {
    expect(getEffectiveStageId(orderWithInquiries({
      stageId: STAGE_MOZENE_ID,
      inquiryCompletedAt: null,
      events: [],
      items: [{ inquiries: [] }],
    }))).toBe(STAGE_KAVOSH_ID);

    expect(getEffectiveStageId(orderWithInquiries({
      stageId: STAGE_MOZENE_ID,
    }))).toBe(STAGE_MOZENE_ID);
  });

  it('maps legacy tajhiz stage id to rahespar', () => {
    expect(getEffectiveStageId({
      stageId: LEGACY_STAGE_TAJHIZ_ID,
      items: [],
    })).toBe(STAGE_RAHESPAR_ID);
  });

  it('never allows selecting mozene manually in the list', () => {
    expect(canSelectStageInList(orderWithInquiries(), STAGE_MOZENE_ID)).toBe(false);
    expect(canSelectStageInList(orderWithInquiries(), STAGE_KAVOSH_ID)).toBe(true);
    expect(canSelectStageInList(orderWithInquiries(), STAGE_PISHKESH_ID)).toBe(true);
  });

  it('blocks kanban drop onto mozene', () => {
    expect(canDropOnKanbanStage(orderWithInquiries(), STAGE_MOZENE_ID)).toBe(false);
    expect(canDropOnKanbanStage(orderWithInquiries(), STAGE_PISHKESH_ID)).toBe(true);
  });

  it('tryChangeOrderStage rejects direct jump to mozene (locked stage)', () => {
    const result = tryChangeOrderStage(orderWithInquiries(), STAGE_MOZENE_ID);
    expect(result.accepted).toBe(false);
    expect(result.order.stageId).toBe(STAGE_KAVOSH_ID);
  });

  it('tryChangeOrderStage advances kavosh → pishkesh when phase1 allows', () => {
    const result = tryChangeOrderStage(orderWithInquiries(), STAGE_PISHKESH_ID);
    expect(result.accepted).toBe(true);
    expect(result.order.stageId).toBe(STAGE_PISHKESH_ID);
    expect(result.order.events?.some((e) => e.type === 'stage_advanced')).toBe(true);
  });

  it('tryChangeOrderStage clearing back to kavosh resets inquiryCompletedAt', () => {
    const atPishkesh = orderWithInquiries({ stageId: STAGE_PISHKESH_ID });
    const result = tryChangeOrderStage(atPishkesh, STAGE_KAVOSH_ID);
    expect(result.accepted).toBe(true);
    expect(result.order.stageId).toBe(STAGE_KAVOSH_ID);
    expect(result.order.inquiryCompletedAt).toBeNull();
  });
});
