import { beforeEach, describe, expect, it } from 'vitest';
import {
  CORRESPONDENCE_DIRECTION,
  CORRESPONDENCE_STATUS,
  CORRESPONDENCE_TYPE,
  isIncomingViewRecord,
  isOutgoingViewRecord,
} from '../../models/correspondence.js';
import {
  createCorrespondence,
  listCompanyCorrespondence,
  listCorrespondenceByTab,
  updateCorrespondence,
} from '../correspondenceService.js';
import { useCorrespondenceStore } from '../../store/useCorrespondenceStore.js';

const COMPANY_ID = 88001;

describe('DDL-12 Gahshomar correspondenceService', () => {
  beforeEach(() => {
    useCorrespondenceStore.getState().replaceAll([]);
  });

  it('listCompanyCorrespondence returns only the requested company letters', () => {
    createCorrespondence({
      companyId: COMPANY_ID,
      direction: CORRESPONDENCE_DIRECTION.INCOMING,
      subject: 'نامه الف',
      letterNumber: '۱',
      counterpartyName: 'فرستنده الف',
    });
    createCorrespondence({
      companyId: 999,
      direction: CORRESPONDENCE_DIRECTION.INCOMING,
      subject: 'نامه دیگر',
      letterNumber: '۲',
    });

    const list = listCompanyCorrespondence(COMPANY_ID);
    expect(list).toHaveLength(1);
    expect(list[0].subject).toBe('نامه الف');
    expect(list[0].direction).toBe(CORRESPONDENCE_DIRECTION.INCOMING);
  });

  it('createCorrespondence allows missing companyId (relations optional)', () => {
    const created = createCorrespondence({
      direction: CORRESPONDENCE_DIRECTION.INCOMING,
      subject: 'بدون سازمان',
    });
    expect(created).toBeTruthy();
    expect(created.companyId).toBeNull();
    expect(created.subject).toBe('بدون سازمان');
  });

  it('createCorrespondence defaults incoming to REGISTERED and outgoing to DRAFT', () => {
    const incoming = createCorrespondence({
      direction: 'INCOMING',
      subject: 'وارده تست',
      letterDate: '1404/01/01',
    });
    const outgoing = createCorrespondence({
      direction: 'OUTGOING',
      subject: 'پیش‌نویس صادره',
      letterDate: '1404/01/02',
    });

    expect(incoming.status).toBe(CORRESPONDENCE_STATUS.REGISTERED);
    expect(outgoing.status).toBe(CORRESPONDENCE_STATUS.DRAFT);
  });

  it('updateCorrespondence patches an existing letter', () => {
    const created = createCorrespondence({
      companyId: COMPANY_ID,
      direction: CORRESPONDENCE_DIRECTION.OUTGOING,
      subject: 'پیش‌نویس',
    });

    const updated = updateCorrespondence(created.id, {
      status: CORRESPONDENCE_STATUS.SENT,
      letterNumber: '۱۴۰۴/۵۰۱',
      subject: 'نامه نهایی',
    });

    expect(updated.status).toBe(CORRESPONDENCE_STATUS.SENT);
    expect(updated.letterNumber).toBe('۱۴۰۴/۵۰۱');
    expect(updated.subject).toBe('نامه نهایی');
  });

  it('rejects incomplete payloads and never stores CRM activity fields', () => {
    expect(createCorrespondence({ direction: 'INCOMING' })).toBeNull();

    const created = createCorrespondence({
      direction: CORRESPONDENCE_DIRECTION.INCOMING,
      subject: 'رسمی',
      note: 'should not become activity',
    });

    expect(created.note).toBeUndefined();
    expect(created.subject).toBe('رسمی');
    expect(created.type).toBe(CORRESPONDENCE_TYPE.OFFICIAL);
  });

  it('internal memo is one record visible in sender outgoing and receiver incoming', () => {
    const memo = createCorrespondence({
      type: CORRESPONDENCE_TYPE.INTERNAL,
      direction: CORRESPONDENCE_DIRECTION.OUTGOING,
      subject: 'نامه داخلی',
      senderUserId: 'emp-a',
      receiverUserIds: ['emp-b'],
    });

    expect(memo).toBeTruthy();
    expect(isOutgoingViewRecord(memo, 'emp-a')).toBe(true);
    expect(isIncomingViewRecord(memo, 'emp-b')).toBe(true);
    expect(isIncomingViewRecord(memo, 'emp-a')).toBe(false);
    expect(isOutgoingViewRecord(memo, 'emp-b')).toBe(false);

    const senderOut = listCorrespondenceByTab('outgoing', { viewerUserId: 'emp-a' });
    const receiverIn = listCorrespondenceByTab('incoming', { viewerUserId: 'emp-b' });
    expect(senderOut.some((item) => item.id === memo.id)).toBe(true);
    expect(receiverIn.some((item) => item.id === memo.id)).toBe(true);
    expect(useCorrespondenceStore.getState().records.filter((r) => r.id === memo.id)).toHaveLength(1);
  });
});
