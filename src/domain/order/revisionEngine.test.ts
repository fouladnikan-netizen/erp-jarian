import { describe, expect, it } from 'vitest';
import {
  buildRevisionRecord,
  clearRevisionRequired,
  getLatestRevision,
  recordStageReturn,
} from './revisionEngine';

const baseOrder = {
  id: 'o-1',
  customerId: 'c-1',
  status: 'PROFORMA' as const,
  items: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  revisionRequired: false,
  approvalDecision: 'PENDING' as const,
  revisions: [],
};

describe('Revision Engine', () => {
  it('records a return without inventing a new lifecycle status', () => {
    const next = recordStageReturn(baseOrder, {
      returnedBy: 'کارشناس',
      reasonCode: 'SUPPLIER_UNAVAILABLE',
      reasonText: 'موجودی صفر',
      previousStage: 'PURCHASE',
      returnedToStage: 'PROFORMA',
      id: 'rev-1',
      returnedAt: '2026-08-02T10:00:00.000Z',
    });

    expect(next.status).toBe('PROFORMA');
    expect(next.revisionRequired).toBe(true);
    expect(next.approvalDecision).toBe('RETURNED');
    expect(next.revisions).toHaveLength(1);
    expect(next.revisions?.[0]?.reasonCode).toBe('SUPPLIER_UNAVAILABLE');
    expect(next.revisions?.[0]?.previousStage).toBe('PURCHASE');
  });

  it('requires a reasonCode', () => {
    expect(() =>
      buildRevisionRecord({
        returnedBy: 'x',
        reasonCode: undefined as unknown as 'OTHER',
        previousStage: 'PRICING',
        returnedToStage: 'INQUIRY',
      })
    ).toThrow(/reasonCode/);
  });

  it('clears revisionRequired while keeping history', () => {
    const returned = recordStageReturn(baseOrder, {
      returnedBy: 'x',
      reasonCode: 'OTHER',
      previousStage: 'PROFORMA',
      returnedToStage: 'INQUIRY',
      id: 'rev-2',
    });
    const cleared = clearRevisionRequired(returned, 'PENDING');
    expect(cleared.revisionRequired).toBe(false);
    expect(cleared.revisions).toHaveLength(1);
    expect(getLatestRevision(cleared)?.id).toBe('rev-2');
  });
});
