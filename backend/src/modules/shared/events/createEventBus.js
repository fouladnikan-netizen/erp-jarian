/**
 * In-process pub/sub. Isolated instances are for tests; production uses
 * `domainEvents` from `./index.js`.
 *
 * Handlers run sequentially after the producer's transaction commits.
 * One handler throwing must not fail the producer or sibling handlers.
 */
export function createEventBus({ onError } = {}) {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  function handlersFor(name) {
    let set = listeners.get(name);
    if (!set) {
      set = new Set();
      listeners.set(name, set);
    }
    return set;
  }

  return {
    /**
     * @param {string} name
     * @param {(event: object) => unknown | Promise<unknown>} handler
     * @returns {() => void} unsubscribe
     */
    on(name, handler) {
      if (typeof handler !== 'function') {
        throw new TypeError('DOMAIN_EVENT_HANDLER_REQUIRED');
      }
      handlersFor(String(name)).add(handler);
      return () => handlersFor(String(name)).delete(handler);
    },

    off(name, handler) {
      listeners.get(String(name))?.delete(handler);
    },

    /**
     * @param {{ name: string, [k: string]: unknown }} event
     */
    async publish(event) {
      const name = event?.name;
      if (!name) {
        throw new Error('DOMAIN_EVENT_NAME_REQUIRED');
      }
      const list = [...(listeners.get(String(name)) || [])];
      for (const handler of list) {
        try {
          await handler(event);
        } catch (err) {
          if (typeof onError === 'function') {
            try {
              onError(err, event, handler);
            } catch {
              /* onError must never fail publish */
            }
          }
        }
      }
    },

    listenerCount(name) {
      return listeners.get(String(name))?.size || 0;
    },

    clear() {
      listeners.clear();
    },
  };
}
