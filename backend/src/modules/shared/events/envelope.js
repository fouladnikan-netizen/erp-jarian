import { EVENT } from './eventNames.js';

const KNOWN = new Set(Object.values(EVENT));

/**
 * @param {{
 *   name: string,
 *   producer: string,
 *   payload?: Record<string, unknown>,
 *   requestId?: string | null,
 *   occurredAt?: Date | string,
 * }} input
 */
export function createEnvelope(input) {
  const name = String(input?.name || '').trim();
  if (!name) {
    throw new Error('DOMAIN_EVENT_NAME_REQUIRED');
  }
  if (!KNOWN.has(name)) {
    throw new Error(`DOMAIN_EVENT_UNKNOWN:${name}`);
  }
  const producer = String(input?.producer || '').trim();
  if (!producer) {
    throw new Error('DOMAIN_EVENT_PRODUCER_REQUIRED');
  }
  const occurredAt = input?.occurredAt
    ? new Date(input.occurredAt).toISOString()
    : new Date().toISOString();
  return Object.freeze({
    name,
    producer,
    occurredAt,
    requestId: input?.requestId ?? null,
    payload: input?.payload && typeof input.payload === 'object' ? { ...input.payload } : {},
  });
}
