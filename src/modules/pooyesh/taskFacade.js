/**
 * Pooyesh Task Facade — internal ERP tasks created from Mowj (and future callers).
 * Storage is in-memory SSOT for Pooyesh tasks (no channel send).
 */

import { createEntityId } from '../../domain/identity';

/** @type {Array<object>} */
let tasks = [];

function copy(row) {
  return {
    ...row,
    assignedTo: row.assignedTo ? { ...row.assignedTo } : null,
    contactReference: row.contactReference ? { ...row.contactReference } : null,
    companyReference: row.companyReference ? { ...row.companyReference } : null,
    campaignReference: row.campaignReference ? { ...row.campaignReference } : null,
  };
}

/**
 * @param {object} intent
 * @returns {{ ok: boolean, taskId: string|null, status: string, error: string|null, assignedTo: object|null }}
 */
export function createPooyeshTask(intent) {
  if (!intent || !String(intent.title || '').trim()) {
    return {
      ok: false,
      taskId: null,
      status: 'FAILED',
      error: 'title الزامی است.',
      assignedTo: null,
    };
  }

  const taskId = createEntityId('ptask');
  const row = {
    id: taskId,
    title: String(intent.title).trim(),
    description: intent.description != null ? String(intent.description) : null,
    assignedTo: intent.assignedTo
      ? {
        userId: String(intent.assignedTo.userId || 'user-unknown'),
        name: String(intent.assignedTo.name || '—'),
      }
      : null,
    contactReference: intent.contactReference || null,
    companyReference: intent.companyReference || null,
    campaignReference: intent.campaignReference || null,
    dueDate: intent.dueDate || null,
    priority: intent.priority || 'normal',
    status: 'OPEN',
    sourceModule: intent.meta?.sourceModule || 'mowj',
    createdAt: new Date().toISOString(),
  };
  tasks = [row, ...tasks];

  return {
    ok: true,
    taskId: row.id,
    status: 'CREATED',
    error: null,
    assignedTo: row.assignedTo,
  };
}

export function getPooyeshTask(taskId) {
  if (taskId == null || taskId === '') return null;
  const row = tasks.find((item) => String(item.id) === String(taskId));
  return row ? copy(row) : null;
}

export function listPooyeshTasks(filters = {}) {
  let rows = tasks.map(copy);
  if (filters.campaignId) {
    rows = rows.filter((row) => (
      String(row.campaignReference?.campaignId) === String(filters.campaignId)
    ));
  }
  return rows;
}

export function __resetPooyeshTasksForTests() {
  tasks = [];
}

export const pooyeshTaskFacade = {
  createTask: createPooyeshTask,
  getTask: getPooyeshTask,
  listTasks: listPooyeshTasks,
};
