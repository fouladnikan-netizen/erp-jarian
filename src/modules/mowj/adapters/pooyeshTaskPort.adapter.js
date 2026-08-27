/**
 * PooyeshTaskPort adapter — Mowj → Pooyesh taskFacade (no store in domain).
 * Supports sync (mock) and Promise (API SERVER_FIRST) createTask results.
 */

import {
  createPooyeshTask,
  getPooyeshTask,
  __resetPooyeshTasksForTests,
} from '../../pooyesh/taskFacade';
import { TASK_CREATION_RESULT_STATUS } from '../domain/pooyeshTask.port';

function mapResult(result) {
  return {
    ok: Boolean(result?.ok),
    taskId: result?.taskId || null,
    status: result?.ok
      ? TASK_CREATION_RESULT_STATUS.CREATED
      : TASK_CREATION_RESULT_STATUS.FAILED,
    error: result?.error || null,
    assignedTo: result?.assignedTo || null,
  };
}

/**
 * @returns {import('../domain/pooyeshTask.port').PooyeshTaskPort}
 */
export function createPooyeshTaskPortAdapter() {
  return {
    createTask(intent) {
      const result = createPooyeshTask(intent);
      if (result && typeof result.then === 'function') {
        return result.then(mapResult);
      }
      return mapResult(result);
    },
    getTask(taskId) {
      return getPooyeshTask(taskId);
    },
  };
}

export function __resetPooyeshTaskPortForTests() {
  __resetPooyeshTasksForTests();
}
