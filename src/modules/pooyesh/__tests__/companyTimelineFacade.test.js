import { beforeEach, describe, expect, it } from 'vitest';
import { useContactsStore } from '../../../stores/useContactsStore.js';
import {
  createActivity,
  getCompanyTimeline,
} from '../timeline/companyTimelineFacade.js';

const COMPANY_ID = 99021;

describe('Pooyesh companyTimelineFacade', () => {
  beforeEach(() => {
    useContactsStore.setState({
      contacts: [
        {
          id: COMPANY_ID,
          name: 'شرکت تایم‌لاین پویش',
          entityType: 'customer',
          interactions: [
            {
              id: 'ix-1',
              date: '2024-06-01T10:00:00.000Z',
              note: 'تماس اولیه',
              summary: 'تماس اولیه',
              type: 'call',
            },
          ],
          relatedOrders: [],
        },
      ],
    });
  });

  it('getCompanyTimeline returns projection events including Pooyesh activities', () => {
    const events = getCompanyTimeline(COMPANY_ID, { orders: [] });
    expect(events.some((event) => String(event.body).includes('تماس اولیه'))).toBe(true);
  });

  it('createActivity writes through Pooyesh and appears on timeline', () => {
    const created = createActivity(COMPANY_ID, {
      note: 'جلسه جدید',
      type: 'meeting',
    });
    expect(created).toBeTruthy();
    expect(created.note).toBe('جلسه جدید');

    const events = getCompanyTimeline(COMPANY_ID, { orders: [] });
    expect(events.some((event) => String(event.body).includes('جلسه جدید'))).toBe(true);
  });
});
