/**
 * Pooyesh Task Facade — internal ERP tasks (DDL-14 + DDL-16).
 *
 * Mock: in-memory array (offline / unit tests).
 * API mode: PostgreSQL SSOT via TaskRepository / useTasksStore (SERVER_FIRST).
 *
 * Subject may be CompanyReference or RawLeadReference.
 * Mowj calls this only through PooyeshTaskPort adapter.
 */

import { createEntityId } from '../../domain/identity';
import { useMockApi } from '../../api/useMockApi';
import { useTasksStore } from '../../stores/useTasksStore';
import { can } from '../../auth/permissions.js';
import { PERMISSIONS } from '../../auth/permissions.catalog.js';
import { FORBIDDEN_MESSAGE } from '../../api/apiErrors.js';
import { getAuthPermissions } from '../auth/authSession.js';
import {
  ENTITY_REF_TYPE,
  subjectFromTaskIntent,
  assertEntityEligibleFor,
  ERP_CAPABILITY,
  parseEntityReference,
} from '../../domain/entityReference';
import { resolveSubjectEntity } from './ports/subjectEntity.port.js';

/** @type {Array<object>} */
let tasks = [];

function copy(row) {
  return {
    ...row,
    assignedTo: row.assignedTo ? { ...row.assignedTo } : null,
    contactReference: row.contactReference ? { ...row.contactReference } : null,
    companyReference: row.companyReference ? { ...row.companyReference } : null,
    campaignReference: row.campaignReference ? { ...row.campaignReference } : null,
    subject: row.subject ? { ...row.subject } : null,
    rawLeadReference: row.rawLeadReference ? { ...row.rawLeadReference } : null,
  };
}

function fail(error, code = 'VALIDATION') {
  return {
    ok: false,
    taskId: null,
    status: 'FAILED',
    error,
    code,
    assignedTo: null,
  };
}

function validateIntent(intent) {
  if (!intent || !String(intent.title || '').trim()) {
    return fail('title الزامی است.');
  }

  const subject = subjectFromTaskIntent(intent);
  if (!subject) {
    return fail('subject (Company یا Raw Lead) الزامی است.', 'INVALID_ENTITY_REFERENCE');
  }

  const parsed = parseEntityReference(subject);
  if (!parsed.ok) {
    return fail(parsed.error, parsed.code);
  }

  const gate = assertEntityEligibleFor(parsed.ref, ERP_CAPABILITY.TASK);
  if (!gate.ok) {
    return fail(gate.message, gate.code);
  }

  const resolved = resolveSubjectEntity(parsed.ref);
  if (parsed.ref.entityType === ENTITY_REF_TYPE.RAW_LEAD && !resolved.ok) {
    return fail(
      'سرنخ موضوع وظیفه یافت نشد.',
      resolved.error || 'INVALID_ENTITY_REFERENCE',
    );
  }

  return { ok: true, parsed, resolved };
}

function createLocal(intent, parsed) {
  const taskId = createEntityId('ptask');
  const companyReference = parsed.ref.entityType === ENTITY_REF_TYPE.COMPANY
    ? { companyId: parsed.ref.entityId }
    : (intent.companyReference || null);
  const rawLeadReference = parsed.ref.entityType === ENTITY_REF_TYPE.RAW_LEAD
    ? { leadId: parsed.ref.entityId }
    : null;

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
    subject: { ...parsed.ref },
    contactReference: intent.contactReference || null,
    companyReference,
    rawLeadReference,
    campaignReference: intent.campaignReference || null,
    dueDate: intent.dueDate || null,
    priority: intent.priority || 'normal',
    status: 'OPEN',
    sourceModule: intent.meta?.sourceModule || intent.sourceModule || 'pooyesh',
    createdAt: new Date().toISOString(),
  };
  tasks = [row, ...tasks];

  return {
    ok: true,
    taskId: row.id,
    status: 'CREATED',
    error: null,
    assignedTo: row.assignedTo,
    subject: row.subject,
  };
}

async function createRemote(intent, parsed) {
  try {
    const saved = await useTasksStore.getState().createTaskAsync({
      title: String(intent.title).trim(),
      description: intent.description != null ? String(intent.description) : null,
      assignedTo: intent.assignedTo || null,
      subject: parsed.ref,
      subjectType: parsed.ref.entityType,
      subjectId: parsed.ref.entityId,
      contactReference: intent.contactReference || null,
      companyReference: parsed.ref.entityType === ENTITY_REF_TYPE.COMPANY
        ? { companyId: parsed.ref.entityId }
        : (intent.companyReference || null),
      rawLeadReference: parsed.ref.entityType === ENTITY_REF_TYPE.RAW_LEAD
        ? { leadId: parsed.ref.entityId }
        : null,
      campaignReference: intent.campaignReference || null,
      dueDate: intent.dueDate || null,
      priority: intent.priority || 'normal',
      sourceModule: intent.meta?.sourceModule || intent.sourceModule || 'pooyesh',
      meta: intent.meta,
      payload: intent.payload || undefined,
    });

    if (!saved) {
      return fail('ایجاد وظیفه روی سرور ناموفق بود.');
    }

    return {
      ok: true,
      taskId: saved.id,
      status: 'CREATED',
      error: null,
      assignedTo: saved.assignedTo,
      subject: saved.subject,
    };
  } catch (error) {
    return fail(
      error?.response?.data?.message || error?.message || 'ایجاد وظیفه ناموفق بود.',
      error?.response?.data?.error || 'FAILED',
    );
  }
}

/**
 * @param {object} intent
 * @returns {{ ok: boolean, taskId: string|null, status: string, error: string|null, code?: string, assignedTo: object|null }|Promise<object>}
 */
export function createPooyeshTask(intent) {
  const perms = getAuthPermissions();
  // Only soft-block when session permissions are known and lack write.
  if (perms.length > 0 && !can(PERMISSIONS.TASKS_WRITE)) {
    return {
      ok: false,
      taskId: null,
      status: 'forbidden',
      error: FORBIDDEN_MESSAGE,
      code: 'FORBIDDEN',
      assignedTo: null,
    };
  }

  const check = validateIntent(intent);
  if (!check.ok) return check;

  if (useMockApi()) {
    return createLocal(intent, check.parsed);
  }
  return createRemote(intent, check.parsed);
}

/**
 * Complete a canonical Pooyesh Task (thin pass-through to backend SSOT).
 * @param {string} taskId
 * @returns {Promise<object|null>|{ ok: boolean, error?: string }}
 */
export function completePooyeshTask(taskId) {
  if (taskId == null || taskId === '') return { ok: false, error: 'شناسه وظیفه الزامی است.' };
  const perms = getAuthPermissions();
  if (perms.length > 0 && !can(PERMISSIONS.TASKS_WRITE)) {
    return { ok: false, error: FORBIDDEN_MESSAGE, code: 'FORBIDDEN' };
  }
  if (useMockApi()) {
    const row = tasks.find((item) => String(item.id) === String(taskId));
    if (row) row.status = 'COMPLETED';
    return { ok: true, task: row ? copy(row) : null };
  }
  return useTasksStore.getState().completeTaskAsync(taskId);
}

export function getPooyeshTask(taskId) {
  if (taskId == null || taskId === '') return null;
  if (useMockApi()) {
    const row = tasks.find((item) => String(item.id) === String(taskId));
    return row ? copy(row) : null;
  }
  return useTasksStore.getState().getTask(taskId);
}

export function listPooyeshTasks(filters = {}) {
  if (useMockApi()) {
    let rows = tasks.map(copy);
    if (filters.campaignId) {
      rows = rows.filter((row) => (
        String(row.campaignReference?.campaignId) === String(filters.campaignId)
      ));
    }
    if (filters.entityType && filters.entityId) {
      rows = rows.filter((row) => (
        row.subject?.entityType === filters.entityType
        && String(row.subject?.entityId) === String(filters.entityId)
      ));
    }
    return rows;
  }

  let rows = useTasksStore.getState().tasks.map(copy);
  if (filters.campaignId) {
    rows = rows.filter((row) => (
      String(row.campaignReference?.campaignId) === String(filters.campaignId)
    ));
  }
  if (filters.entityType && filters.entityId) {
    rows = useTasksStore.getState().listBySubject({
      entityType: filters.entityType,
      entityId: filters.entityId,
    }).map(copy);
  }
  return rows;
}

/**
 * Hydrate Task cache (API mode) — Company/Raw Lead subject or global filters.
 * @param {{ entityType?: string, entityId?: string, status?: string }} [filters]
 */
export function fetchPooyeshTasks(filters = {}) {
  if (useMockApi()) return Promise.resolve(listPooyeshTasks(filters));
  return useTasksStore.getState().fetchTasks(filters);
}

export function __resetPooyeshTasksForTests() {
  tasks = [];
  useTasksStore.setState({ tasks: [], error: null });
}

export const pooyeshTaskFacade = {
  createTask: createPooyeshTask,
  getTask: getPooyeshTask,
  listTasks: listPooyeshTasks,
  fetchTasks: fetchPooyeshTasks,
  completeTask: completePooyeshTask,
};

export default pooyeshTaskFacade;
