import { beforeEach, describe, expect, it } from 'vitest';
import { useContactsStore } from '../../../stores/useContactsStore.js';
import { useLeadsStore } from '../../../stores/useLeadsStore.js';
import {
  createPooyeshTask,
  __resetPooyeshTasksForTests,
  listPooyeshTasks,
} from '../taskFacade.js';
import { createActivity, listActivities } from '../interactionFacade.js';
import {
  companyReference,
  rawLeadReference,
  ENTITY_REF_TYPE,
} from '../../../domain/entityReference';
import { LEAD_STATUS } from '../../ofogh/domain/lead.constants.js';

describe('Pooyesh polymorphic subject reference (DDL-14)', () => {
  beforeEach(() => {
    __resetPooyeshTasksForTests();
    useContactsStore.setState({
      contacts: [
        {
          id: 'co_gate_1',
          companyName: 'شرکت گیت',
          recordType: 'CUSTOMER',
          interactions: [],
        },
      ],
    });
    useLeadsStore.setState({
      leads: [
        {
          id: 'lead_gate_1',
          companyName: 'سرنخ گیت',
          personName: 'علی',
          mobile: '09120000000',
          leadSource: 'web',
          status: LEAD_STATUS.NEW,
          interactions: [],
        },
      ],
      hydrated: true,
    });
  });

  it('create task for Company → allowed', () => {
    const result = createPooyeshTask({
      title: 'پیگیری شرکت',
      subject: companyReference('co_gate_1'),
    });
    expect(result.ok).toBe(true);
    expect(result.subject.entityType).toBe(ENTITY_REF_TYPE.COMPANY);
    expect(listPooyeshTasks({ entityType: ENTITY_REF_TYPE.COMPANY, entityId: 'co_gate_1' }))
      .toHaveLength(1);
  });

  it('create task for Raw Lead → allowed', () => {
    const result = createPooyeshTask({
      title: 'پیگیری سرنخ',
      subject: rawLeadReference('lead_gate_1'),
    });
    expect(result.ok).toBe(true);
    expect(result.subject.entityType).toBe(ENTITY_REF_TYPE.RAW_LEAD);
  });

  it('invalid reference → rejected', () => {
    const result = createPooyeshTask({
      title: 'بدون موضوع',
      subject: { entityType: 'PERSON', entityId: 'p1' },
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_ENTITY_REFERENCE');
  });

  it('activity on Raw Lead and Company via facade', () => {
    const leadIx = createActivity(rawLeadReference('lead_gate_1'), {
      note: 'تماس سرنخ',
      type: 'call',
    });
    expect(leadIx).toBeTruthy();
    expect(listActivities(rawLeadReference('lead_gate_1')).some((i) => i.note === 'تماس سرنخ'))
      .toBe(true);

    const coIx = createActivity(companyReference('co_gate_1'), {
      note: 'تماس شرکت',
      type: 'call',
    });
    expect(coIx).toBeTruthy();
  });
});
