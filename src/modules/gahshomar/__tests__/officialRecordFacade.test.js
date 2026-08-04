import { beforeEach, describe, expect, it } from 'vitest';
import { RECORD_DIRECTION, RECORD_STATUS } from '../models/officialRecord.js';
import {
  __testing,
  createDraftRecord,
  createReply,
  getOfficialRecord,
  listOfficialRecords,
  listOfficialRecordsByCompany,
  saveOfficialRecord,
} from '../officialRecordFacade.js';

describe('Gahshomar officialRecordFacade (MVP)', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('listOfficialRecords returns presentation models with displayParty and hasAttachments', () => {
    const incoming = listOfficialRecords({ tab: 'incoming' });
    const outgoing = listOfficialRecords({ tab: 'outgoing' });

    expect(incoming.length).toBeGreaterThanOrEqual(2);
    expect(outgoing.length).toBeGreaterThanOrEqual(2);
    expect(incoming[0]).toMatchObject({
      displayParty: expect.any(String),
      displayStatus: expect.any(String),
      displayType: 'رسمی',
      hasAttachments: expect.any(Boolean),
    });
  });

  it('getOfficialRecord returns detail with thread preview', () => {
    const detail = getOfficialRecord('rec-in-001');
    expect(detail).toBeTruthy();
    expect(detail.subject).toContain('استعلام');
    expect(detail.participants.sender.name).toBeTruthy();
    expect(detail.canReply).toBe(true);
  });

  it('createDraftRecord opens CREATE flow data for outgoing', () => {
    const draft = createDraftRecord(RECORD_DIRECTION.OUTGOING);
    expect(draft).toBeTruthy();
    expect(draft.direction).toBe(RECORD_DIRECTION.OUTGOING);
    expect(draft.displayStatus).toBe('پیش‌نویس');
  });

  it('createReply swaps parties and copies threadId without duplicating source', () => {
    const source = getOfficialRecord('rec-in-001');
    const reply = createReply('rec-in-001');

    expect(reply).toBeTruthy();
    expect(reply.direction).toBe(RECORD_DIRECTION.OUTGOING);
    expect(reply.status).toBe(RECORD_STATUS.DRAFT);
    expect(reply.threadId).toBe(source.threadId);
    expect(reply.referenceId).toBe(source.referenceId);
    expect(reply.participants.receiver.name).toBe(source.participants.sender.name);
    expect(reply.participants.sender.name).toBe(source.participants.receiver.name);

    const all = listOfficialRecords({ tab: 'outgoing' });
    expect(all.filter((item) => item.id === reply.id)).toHaveLength(1);
    expect(all.filter((item) => item.id === source.id)).toHaveLength(0);
  });

  it('listOfficialRecordsByCompany scopes profile documents tab', () => {
    const list = listOfficialRecordsByCompany(1);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((item) => String(item.companyId) === '1' || item.displayParty.includes('فولاد'))).toBe(true);
  });

  it('saveOfficialRecord persists editor changes', () => {
    const draft = createDraftRecord(RECORD_DIRECTION.OUTGOING);
    const saved = saveOfficialRecord(draft.id, {
      subject: 'نامه نهایی تست',
      body: 'متن پاسخ',
    });
    expect(saved.subject).toBe('نامه نهایی تست');
    expect(saved.body).toBe('متن پاسخ');
  });
});
