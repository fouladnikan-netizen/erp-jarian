/**
 * PooyeshTaskPort adapter — Mowj → Pooyesh taskFacade (no store in domain).
 */

import {
  createPooyeshTask,
  getPooyeshTask,
  __resetPooyeshTasksForTests,
} from '../../pooyesh/taskFacade';
import { TASK_CREATION_RESULT_STATUS } from '../domain/pooyeshTask.port';

/**
 * @returns {import('../domain/pooyeshTask.port').PooyeshTaskPort}
 */
export function createPooyeshTaskPortAdapter() {
  return {
    createTask(intent) {
      const result = createPooyeshTask(intent);
      return {
        ok: Boolean(result.ok),
        taskId: result.taskId || null,
        status: result.ok
          ? TASK_CREATION_RESULT_STATUS.CREATED
          : TASK_CREATION_RESULT_STATUS.FAILED,
        error: result.error || null,
        assignedTo: result.assignedTo || null,
      };
    },
    getTask(taskId) {
      return getPooyeshTask(taskId);
    },
  };
}

export function __resetPooyeshTaskPortForTests() {
  __resetPooyeshTasksForTests();
}
