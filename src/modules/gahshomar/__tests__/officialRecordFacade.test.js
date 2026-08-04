import { beforeEach, describe, expect, it } from 'vitest';
import { RECORD_DIRECTION, RECORD_STATUS } from '../models/officialRecord.js';
import {
  __testing,
  createDraftRecord,
  createReply,
  getOfficialRecord,
  issueOfficialRecord,
  listOfficialRecords,
  listOfficialRecordsByCompany,
  polishLetterText,
  saveOfficialRecord,
  searchOfficialRecordContacts,
} from '../officialRecordFacade.js';
import { LETTER_SUBJECT_TEMPLATES } from '../services/letterSubjectTemplates.js';
import { ensureLetterHtml, htmlToPlainText } from '../services/letterHtml.js';

const contactReceiver = {
  partyType: 'CONTACT',
  role: 'RECEIVER',
  partyId: '1',
  name: 'فولاد پارس',
  companyId: 1,
  companyName: 'فولاد پارس',
  position: 'صنایع فولادی',
  mobile: null,
};

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
    expect(reply.participants.receiver.partyType).toBe('CONTACT');
    expect(reply.participants.receiver.partyId).toBeTruthy();

    const all = listOfficialRecords({ tab: 'outgoing' });
    expect(all.filter((item) => item.id === reply.id)).toHaveLength(1);
    expect(all.filter((item) => item.id === source.id)).toHaveLength(0);
  });

  it('listOfficialRecordsByCompany scopes profile documents tab', () => {
    const list = listOfficialRecordsByCompany(1);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((item) => String(item.companyId) === '1' || item.displayParty.includes('فولاد'))).toBe(true);
  });

  it('saveOfficialRecord persists editor changes as HTML body', () => {
    const draft = createDraftRecord(RECORD_DIRECTION.OUTGOING);
    const saved = saveOfficialRecord(draft.id, {
      subject: 'نامه نهایی تست',
      body: 'متن پاسخ',
      participants: {
        sender: draft.participants.sender,
        receiver: contactReceiver,
      },
    });
    expect(saved.subject).toBe('نامه نهایی تست');
    expect(htmlToPlainText(saved.body)).toContain('متن پاسخ');
    expect(ensureLetterHtml(saved.body)).toContain('<p>');
  });

  it('subject templates include professional body drafts', () => {
    expect(LETTER_SUBJECT_TEMPLATES.length).toBeGreaterThanOrEqual(9);
    expect(LETTER_SUBJECT_TEMPLATES[0]).toMatchObject({
      subject: 'درخواست تحویل کالا',
      body: expect.stringContaining('با سلام'),
    });
  });

  it('searchOfficialRecordContacts returns Kanoon companies (CustomerCombobox catalog)', () => {
    const hits = searchOfficialRecordContacts('فولاد');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toMatchObject({
      id: expect.anything(),
      entityType: expect.any(String),
    });
    expect(hits[0].companyName || hits[0].name || hits[0].legalName).toBeTruthy();
  });

  it('polishLetterText returns professional Persian HTML body only', async () => {
    const polished = await polishLetterText('<p>لطفا قیمت را اعلام کنید</p>');
    expect(polished).toContain('<p>');
    expect(htmlToPlainText(polished)).toContain('با سلام');
    expect(htmlToPlainText(polished)).toContain('لطفا قیمت را اعلام کنید');
  });

  it('issueOfficialRecord assigns registry number and locks the letter', () => {
    const draft = createDraftRecord(RECORD_DIRECTION.OUTGOING);
    const issued = issueOfficialRecord(draft.id, {
      subject: 'درخواست تحویل کالا',
      body: '<p>با سلام و احترام</p><p>متن نهایی نامه جهت صدور</p>',
      participants: {
        sender: draft.participants.sender,
        receiver: contactReceiver,
      },
    });

    expect(issued).toBeTruthy();
    expect(issued.isLocked).toBe(true);
    expect(issued.registryNumber).toMatch(/^[۰-۹]{3}\/OUT\/[۰-۹]{3}$/);
    expect(issued.number).toBe(issued.registryNumber);
    expect(issued.issuedBy).toBeTruthy();
    expect(issued.issuedAt).toBeTruthy();
    expect(issued.canIssue).toBe(false);
    expect(issued.canPrint).toBe(true);
    expect(issued.status).toBe(RECORD_STATUS.ISSUED);
    expect(issued.participants.receiver.partyId).toBe('1');

    const blocked = saveOfficialRecord(issued.id, { subject: 'تغییر ممنوع' });
    expect(blocked.subject).toBe('درخواست تحویل کالا');
  });

  it('issueOfficialRecord rejects free-text receiver and incoming letters', () => {
    const draft = createDraftRecord(RECORD_DIRECTION.OUTGOING);
    expect(issueOfficialRecord(draft.id, {
      subject: 'x',
      participants: {
        sender: draft.participants.sender,
        receiver: { name: 'متن آزاد', role: 'RECEIVER' },
      },
    })).toBeNull();
    expect(issueOfficialRecord('rec-in-001', { subject: 'x' })).toBeNull();
  });
});
