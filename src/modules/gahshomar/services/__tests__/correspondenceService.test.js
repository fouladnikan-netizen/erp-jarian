import { beforeEach, describe, expect, it } from 'vitest';
import { RECORD_DIRECTION } from '../../models/officialRecord.js';
import {
  createCorrespondence,
  listCompanyCorrespondence,
  updateCorrespondence,
} from '../correspondenceService.js';
import { __testing } from '../../officialRecordFacade.js';

const COMPANY_ID = 1;

describe('Gahshomar correspondenceService adapter', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('listCompanyCorrespondence returns only the requested company letters', () => {
    const list = listCompanyCorrespondence(COMPANY_ID);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((item) => String(item.companyId) === String(COMPANY_ID))).toBe(true);
  });

  it('createCorrespondence creates via facade adapter', () => {
    const created = createCorrespondence({
      direction: RECORD_DIRECTION.INCOMING,
      subject: 'نامه تست',
      counterpartyName: 'فرستنده تست',
      companyId: COMPANY_ID,
    });
    expect(created).toBeTruthy();
    expect(created.subject).toBe('نامه تست');
  });

  it('updateCorrespondence patches an existing letter', () => {
    const created = createCorrespondence({
      direction: RECORD_DIRECTION.OUTGOING,
      subject: 'پیش‌نویس',
      companyId: COMPANY_ID,
    });

    const updated = updateCorrespondence(created.id, {
      subject: 'نامه نهایی',
      letterNumber: '۱۴۰۴/۵۰۱',
    });

    expect(updated.subject).toBe('نامه نهایی');
    expect(updated.letterNumber).toBe('۱۴۰۴/۵۰۱');
  });
});
