import { createEventBus } from './createEventBus.js';
import { createEnvelope } from './envelope.js';
import { EVENT, EVENT_CATALOG, PRODUCER } from './eventNames.js';

export { createEventBus } from './createEventBus.js';
export { createEnvelope } from './envelope.js';
export { EVENT, EVENT_CATALOG, PRODUCER } from './eventNames.js';

function logHandlerError(error, event) {
  console.error(JSON.stringify({
    level: 'error',
    msg: 'domain_event_handler_failed',
    event: event?.name || null,
    producer: event?.producer || null,
    requestId: event?.requestId || null,
    error: error?.code || error?.name || 'Error',
    message: error?.message || String(error),
  }));
}

export const domainEvents = createEventBus({ onError: logHandlerError });

let wired = false;

export async function ensureDomainEventHandlers(bus = domainEvents) {
  if (bus === domainEvents && wired) return bus;
  const { registerDomainEventHandlers } = await import('./registerHandlers.js');
  registerDomainEventHandlers(bus);
  if (bus === domainEvents) wired = true;
  return bus;
}

/**
 * Publish a typed internal event on the process bus.
 * Consumers are wired lazily on first publish (and at `createApp`).
 */
export async function publishDomainEvent(partial, bus = domainEvents) {
  if (bus === domainEvents) {
    await ensureDomainEventHandlers(bus);
  }
  const event = createEnvelope(partial);
  await bus.publish(event);
  return event;
}

/**
 * After-commit notification: never throw to the producer.
 * Handler failures are already isolated inside the bus.
 */
export async function notifyDomainEvent(partial, bus = domainEvents) {
  try {
    return await publishDomainEvent(partial, bus);
  } catch (err) {
    logHandlerError(err, { name: partial?.name, producer: partial?.producer });
    return null;
  }
}

export default {
  EVENT,
  EVENT_CATALOG,
  PRODUCER,
  domainEvents,
  publishDomainEvent,
  notifyDomainEvent,
  ensureDomainEventHandlers,
};
