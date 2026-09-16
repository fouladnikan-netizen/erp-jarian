/**
 * Task store SERVER_FIRST behaviour (API mode).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../api/useMockApi.js', () => ({
  useMockApi: () => false,
  default: () => false,
}));

vi.mock('../../../api/repositories/TaskRepository.js', () => ({
  TaskRepository: {
    listTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    changeTaskStatus: vi.fn(),
    completeTask: vi.fn(),
    archiveTask: vi.fn(),
  },
}));

const { useTasksStore } = await import('../../../stores/useTasksStore.js');
const { TaskRepository } = await import('../../../api/repositories/TaskRepository.js');

describe('useTasksStore API mode', () => {
  beforeEach(() => {
    useTasksStore.setState({ tasks: [], error: null });
    vi.clearAllMocks();
  });

  it('hydrate/list', async () => {
    TaskRepository.listTasks.mockResolvedValue([
      {
        id: 'ptask_1',
        title: 't',
        subject: { entityType: 'COMPANY', entityId: 'co_1' },
        status: 'OPEN',
      },
    ]);
    await useTasksStore.getState().fetchTasks({ entityType: 'COMPANY', entityId: 'co_1' });
    expect(useTasksStore.getState().listBySubject({
      entityType: 'COMPANY',
      entityId: 'co_1',
    })).toHaveLength(1);
  });

  it('create SERVER_FIRST', async () => {
    TaskRepository.createTask.mockResolvedValue({
      id: 'ptask_new',
      title: 'N',
      subject: { entityType: 'RAW_LEAD', entityId: 'lead_1' },
      status: 'OPEN',
    });
    const saved = await useTasksStore.getState().createTaskAsync({
      title: 'N',
      subjectType: 'RAW_LEAD',
      subjectId: 'lead_1',
    });
    expect(saved.id).toBe('ptask_new');
  });

  it('failed create → cache unchanged', async () => {
    TaskRepository.createTask.mockRejectedValue(new Error('down'));
    await expect(
      useTasksStore.getState().createTaskAsync({ title: 'x', subjectType: 'COMPANY', subjectId: 'c' }),
    ).rejects.toThrow('down');
    expect(useTasksStore.getState().tasks).toHaveLength(0);
  });

  it('update / status / complete / archive', async () => {
    useTasksStore.setState({
      tasks: [{
        id: 'ptask_u',
        title: 'old',
        subject: { entityType: 'COMPANY', entityId: 'co_1' },
        status: 'OPEN',
      }],
    });
    TaskRepository.updateTask.mockResolvedValue({
      id: 'ptask_u',
      title: 'new',
      subject: { entityType: 'COMPANY', entityId: 'co_1' },
      status: 'OPEN',
    });
    await useTasksStore.getState().updateTaskAsync('ptask_u', { title: 'new' });
    expect(useTasksStore.getState().getTask('ptask_u').title).toBe('new');

    TaskRepository.changeTaskStatus.mockResolvedValue({
      id: 'ptask_u',
      title: 'new',
      subject: { entityType: 'COMPANY', entityId: 'co_1' },
      status: 'IN_PROGRESS',
    });
    await useTasksStore.getState().changeTaskStatusAsync('ptask_u', 'IN_PROGRESS');
    expect(useTasksStore.getState().getTask('ptask_u').status).toBe('IN_PROGRESS');

    TaskRepository.completeTask.mockResolvedValue({
      id: 'ptask_u',
      title: 'new',
      subject: { entityType: 'COMPANY', entityId: 'co_1' },
      status: 'COMPLETED',
    });
    await useTasksStore.getState().completeTaskAsync('ptask_u');
    expect(useTasksStore.getState().getTask('ptask_u').status).toBe('COMPLETED');

    TaskRepository.archiveTask.mockResolvedValue({ id: 'ptask_u', archived: true });
    await useTasksStore.getState().archiveTaskAsync('ptask_u');
    expect(useTasksStore.getState().getTask('ptask_u')).toBeNull();
  });

  it('Company and Raw Lead subjects', async () => {
    TaskRepository.createTask
      .mockResolvedValueOnce({
        id: 'a',
        title: 'c',
        subject: { entityType: 'COMPANY', entityId: 'co_9' },
        status: 'OPEN',
      })
      .mockResolvedValueOnce({
        id: 'b',
        title: 'l',
        subject: { entityType: 'RAW_LEAD', entityId: 'lead_9' },
        status: 'OPEN',
      });
    await useTasksStore.getState().createTaskAsync({
      title: 'c', subjectType: 'COMPANY', subjectId: 'co_9',
    });
    await useTasksStore.getState().createTaskAsync({
      title: 'l', subjectType: 'RAW_LEAD', subjectId: 'lead_9',
    });
    expect(useTasksStore.getState().listBySubject({
      entityType: 'COMPANY', entityId: 'co_9',
    })).toHaveLength(1);
    expect(useTasksStore.getState().listBySubject({
      entityType: 'RAW_LEAD', entityId: 'lead_9',
    })).toHaveLength(1);
  });
});
