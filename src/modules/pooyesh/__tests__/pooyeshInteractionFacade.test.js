import { beforeEach, describe, expect, it } from 'vitest';
import { useContactsStore } from '../../../stores/useContactsStore.js';
import {
  createCompanyInteraction,
  listCompanyInteractions,
  removeCompanyInteraction,
  updateCompanyInteraction,
} from '../interactionFacade.js';
import { buildCompanyTimelineEvents } from '../../kanoon/buildCompanyTimelineEvents.js';

const COMPANY_ID = 99001;

function seedTestCompany(interactions = []) {
  useContactsStore.setState({
    contacts: [
      {
        id: COMPANY_ID,
        name: 'شرکت تست پویش',
        entityType: 'customer',
        interactions: interactions.map((item, index) => ({
          id: item.id || `seed-${COMPANY_ID}-${index}`,
          date: item.date || '2024-06-01T10:00:00.000Z',
          note: item.note || item.summary || '',
          summary: item.summary || item.note || '',
          type: item.type || 'note',
          nextFollowUp: item.nextFollowUp ?? null,
          operator: item.operator || 'تست',
        })),
      },
    ],
  });
}

describe('DDL-09 Pooyesh interactionFacade', () => {
  beforeEach(() => {
    seedTestCompany([
      {
        id: 'ix-existing',
        date: '2024-06-01T10:00:00.000Z',
        note: 'تعامل موجود',
        summary: 'تعامل موجود',
        type: 'call',
      },
    ]);
  });

  it('listCompanyInteractions returns existing company interactions', () => {
    const list = listCompanyInteractions(COMPANY_ID);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('ix-existing');
    expect(list[0].note).toBe('تعامل موجود');
  });

  it('createCompanyInteraction creates a new interaction', () => {
    const created = createCompanyInteraction(COMPANY_ID, {
      note: 'تماس جدید',
      type: 'call',
      nextFollowUpDate: '2024-07-01T09:00:00.000Z',
    });

    expect(created).toBeTruthy();
    expect(created.note).toBe('تماس جدید');
    expect(created.type).toBe('call');

    const list = listCompanyInteractions(COMPANY_ID);
    expect(list).toHaveLength(2);
    expect(list[0].note).toBe('تماس جدید');
  });

  it('updateCompanyInteraction modifies an existing interaction', () => {
    const updated = updateCompanyInteraction(COMPANY_ID, 'ix-existing', {
      note: 'تعامل به‌روز',
      type: 'meeting',
    });

    expect(updated).toBeTruthy();
    expect(updated.note).toBe('تعامل به‌روز');
    expect(updated.summary).toBe('تعامل به‌روز');
    expect(updated.type).toBe('meeting');

    const listed = listCompanyInteractions(COMPANY_ID).find((item) => item.id === 'ix-existing');
    expect(listed?.note).toBe('تعامل به‌روز');
  });

  it('removeCompanyInteraction removes an interaction', () => {
    expect(removeCompanyInteraction(COMPANY_ID, 'ix-existing')).toBe(true);
    expect(listCompanyInteractions(COMPANY_ID)).toHaveLength(0);
    expect(removeCompanyInteraction(COMPANY_ID, 'ix-existing')).toBe(false);
  });

  it('timeline builder consumes facade output, not direct company.interactions on the argument', () => {
    createCompanyInteraction(COMPANY_ID, {
      note: 'از طریق facade',
      type: 'note',
    });

    const events = buildCompanyTimelineEvents(
      {
        id: COMPANY_ID,
        entityType: 'customer',
        interactions: [
          {
            id: 'ghost',
            date: '2020-01-01T00:00:00.000Z',
            note: 'GHOST-SHOULD-NOT-APPEAR',
            summary: 'GHOST-SHOULD-NOT-APPEAR',
            type: 'note',
          },
        ],
      },
      [],
    );

    const bodies = events.map((event) => event.body);
    expect(bodies).toContain('از طریق facade');
    expect(bodies).toContain('تعامل موجود');
    expect(bodies).not.toContain('GHOST-SHOULD-NOT-APPEAR');
  });
});
