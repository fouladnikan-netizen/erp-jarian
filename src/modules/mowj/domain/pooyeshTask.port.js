/**
 * PooyeshTaskPort — contract boundary for internal task creation.
 * Mowj domain never imports Pooyesh stores/facades.
 */

/**
 * @typedef {object} TaskAssignee
 * @property {string} userId
 * @property {string} name
 */

/**
 * @typedef {object} TaskCreationIntent
 * @property {string} kind  pooyesh.createTask
 * @property {string} title
 * @property {string|null} description
 * @property {TaskAssignee|null} assignedTo
 * @property {{ contactId?: string }|null} contactReference
 * @property {{ companyId?: string }|null} companyReference
 * @property {{ campaignId: string, campaignName?: string }|null} campaignReference
 * @property {string|null} dueDate
 * @property {string} priority
 * @property {string} [campaignId]
 * @property {string} [actionId]
 * @property {string} [templateId]
 * @property {object} [meta]
 */

/**
 * @typedef {object} TaskCreationResult
 * @property {boolean} ok
 * @property {string|null} taskId
 * @property {string} status  CREATED | FAILED
 * @property {string|null} [error]
 * @property {TaskAssignee|null} [assignedTo]
 */

export const TASK_CREATION_RESULT_STATUS = Object.freeze({
  CREATED: 'CREATED',
  FAILED: 'FAILED',
});

/**
 * @typedef {object} PooyeshTaskPort
 * @property {(intent: TaskCreationIntent) => TaskCreationResult} createTask
 * @property {(taskId: string) => object|null} [getTask]
 */

/**
 * Empty / failing port for tests without Pooyesh wiring.
 * @returns {PooyeshTaskPort}
 */
export function createEmptyPooyeshTaskPort() {
  return {
    createTask() {
      return {
        ok: false,
        taskId: null,
        status: TASK_CREATION_RESULT_STATUS.FAILED,
        error: 'PooyeshTaskPort پیاده‌سازی نشده است.',
        assignedTo: null,
      };
    },
    getTask() {
      return null;
    },
  };
}

/**
 * In-memory port for domain/unit tests (no Pooyesh module import).
 * @returns {PooyeshTaskPort & { __tasks: object[] }}
 */
export function createInMemoryPooyeshTaskPort() {
  /** @type {object[]} */
  const tasks = [];
  let seq = 0;
  return {
    __tasks: tasks,
    createTask(intent) {
      if (!intent || !String(intent.title || '').trim()) {
        return {
          ok: false,
          taskId: null,
          status: TASK_CREATION_RESULT_STATUS.FAILED,
          error: 'title الزامی است.',
          assignedTo: null,
        };
      }
      seq += 1;
      const taskId = `pooyesh-task-${seq}`;
      const row = {
        id: taskId,
        title: String(intent.title).trim(),
        description: intent.description || null,
        assignedTo: intent.assignedTo || null,
        contactReference: intent.contactReference || null,
        companyReference: intent.companyReference || null,
        campaignReference: intent.campaignReference || null,
        dueDate: intent.dueDate || null,
        priority: intent.priority || 'normal',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        sourceModule: 'mowj',
      };
      tasks.unshift(row);
      return {
        ok: true,
        taskId,
        status: TASK_CREATION_RESULT_STATUS.CREATED,
        error: null,
        assignedTo: row.assignedTo,
      };
    },
    getTask(taskId) {
      return tasks.find((item) => String(item.id) === String(taskId)) || null;
    },
  };
}
