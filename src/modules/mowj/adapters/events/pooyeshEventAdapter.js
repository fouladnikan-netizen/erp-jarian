/**
 * Pooyesh → Mowj event adapters (mapping only, no dispatch).
 */

import {
  createTaskCompletedEvent,
  validateMowjDomainEvent,
} from '../../domain/events.contracts';

/**
 * @param {{ taskId?: string, commitmentId?: string, companyId?: string, interactionId?: string }} input
 */
export function adaptTaskCompletedEvent(input = {}) {
  const taskId = input.taskId || input.interactionId || input.commitmentId;
  if (!taskId) return null;
  const event = createTaskCompletedEvent({
    taskId: String(taskId),
    commitmentId: input.commitmentId != null ? String(input.commitmentId) : undefined,
    companyId: input.companyId != null ? String(input.companyId) : undefined,
  });
  return validateMowjDomainEvent(event).ok ? event : null;
}
