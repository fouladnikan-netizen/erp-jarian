/**
 * Activity store SERVER_FIRST behaviour with mocked repository (API mode).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../api/useMockApi.js', () => ({
  useMockApi: () => false,
  default: () => false,
}));

vi.mock('../../../api/repositories/ActivityRepository.js', () => ({
  ActivityRepository: {
    listActivities: vi.fn(),
    createActivity: vi.fn(),
    updateActivity: vi.fn(),
    completeActivity: vi.fn(),
    archiveActivity: vi.fn(),
  },
}));

const { useActivitiesStore } = await import('../../../stores/useActivitiesStore.js');
const { ActivityRepository } = await import('../../../api/repositories/ActivityRepository.js');

describe('useActivitiesStore API mode', () => {
  beforeEach(() => {
    useActivitiesStore.setState({ activities: [], loadingBySubject: {}, error: null });
    vi.clearAllMocks();
  });

  it('list/hydrate by subject', async () => {
    ActivityRepository.listActivities.mockResolvedValue([
      {
        id: 'act_1',
        subjectType: 'COMPANY',
        subjectId: 'co_1',
        type: 'call',
        note: 'a',
        status: 'OPEN',
      },
    ]);
    const items = await useActivitiesStore.getState().fetchBySubject({
      entityType: 'COMPANY',
      entityId: 'co_1',
    });
    expect(items).toHaveLength(1);
    expect(useActivitiesStore.getState().listBySubject({
      entityType: 'COMPANY',
      entityId: 'co_1',
    })).toHaveLength(1);
  });

  it('create SERVER_FIRST caches response', async () => {
    ActivityRepository.createActivity.mockResolvedValue({
      id: 'act_new',
      subjectType: 'RAW_LEAD',
      subjectId: 'lead_1',
      note: 'n',
      type: 'note',
      status: 'OPEN',
    });
    const saved = await useActivitiesStore.getState().createActivityAsync({
      entityType: 'RAW_LEAD',
      entityId: 'lead_1',
      note: 'n',
    });
    expect(saved.id).toBe('act_new');
    expect(useActivitiesStore.getState().getActivity('act_new')).toBeTruthy();
  });

  it('failed create → cache unchanged', async () => {
    ActivityRepository.createActivity.mockRejectedValue(new Error('down'));
    await expect(
      useActivitiesStore.getState().createActivityAsync({
        entityType: 'COMPANY',
        entityId: 'co_x',
        note: 'x',
      }),
    ).rejects.toThrow('down');
    expect(useActivitiesStore.getState().activities).toHaveLength(0);
  });

  it('update → server response drives cache', async () => {
    useActivitiesStore.setState({
      activities: [{
        id: 'act_u',
        subjectType: 'COMPANY',
        subjectId: 'co_1',
        note: 'old',
        status: 'OPEN',
      }],
    });
    ActivityRepository.updateActivity.mockResolvedValue({
      id: 'act_u',
      subjectType: 'COMPANY',
      subjectId: 'co_1',
      note: 'new',
      status: 'OPEN',
    });
    await useActivitiesStore.getState().updateActivityAsync('act_u', { note: 'new' });
    expect(useActivitiesStore.getState().getActivity('act_u').note).toBe('new');
  });

  it('complete → cache updated', async () => {
    useActivitiesStore.setState({
      activities: [{
        id: 'act_c',
        subjectType: 'COMPANY',
        subjectId: 'co_1',
        note: 'n',
        status: 'OPEN',
      }],
    });
    ActivityRepository.completeActivity.mockResolvedValue({
      id: 'act_c',
      subjectType: 'COMPANY',
      subjectId: 'co_1',
      note: 'n',
      status: 'COMPLETED',
    });
    await useActivitiesStore.getState().completeActivityAsync('act_c');
    expect(useActivitiesStore.getState().getActivity('act_c').status).toBe('COMPLETED');
  });

  it('archive → removed from active cache', async () => {
    useActivitiesStore.setState({
      activities: [
        { id: 'act_a', subjectType: 'COMPANY', subjectId: 'co_1', note: 'n', status: 'OPEN' },
        { id: 'act_b', subjectType: 'COMPANY', subjectId: 'co_1', note: 'm', status: 'OPEN' },
      ],
    });
    ActivityRepository.archiveActivity.mockResolvedValue({ id: 'act_a', archived: true });
    await useActivitiesStore.getState().archiveActivityAsync('act_a');
    expect(useActivitiesStore.getState().getActivity('act_a')).toBeNull();
    expect(useActivitiesStore.getState().activities).toHaveLength(1);
  });

  it('Company and Raw Lead subjects work', async () => {
    ActivityRepository.createActivity
      .mockResolvedValueOnce({
        id: 'act_co',
        subjectType: 'COMPANY',
        subjectId: 'co_9',
        note: 'c',
        status: 'OPEN',
      })
      .mockResolvedValueOnce({
        id: 'act_lead',
        subjectType: 'RAW_LEAD',
        subjectId: 'lead_9',
        note: 'l',
        status: 'OPEN',
      });

    await useActivitiesStore.getState().createActivityAsync({
      entityType: 'COMPANY',
      entityId: 'co_9',
      note: 'c',
    });
    await useActivitiesStore.getState().createActivityAsync({
      entityType: 'RAW_LEAD',
      entityId: 'lead_9',
      note: 'l',
    });

    expect(useActivitiesStore.getState().listBySubject({
      entityType: 'COMPANY',
      entityId: 'co_9',
    })).toHaveLength(1);
    expect(useActivitiesStore.getState().listBySubject({
      entityType: 'RAW_LEAD',
      entityId: 'lead_9',
    })).toHaveLength(1);
  });
});
