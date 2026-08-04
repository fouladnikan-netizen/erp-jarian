import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getEventConfig } from '../config/notificationEvents';
import NotificationContainer from '../components/notifications/NotificationContainer';
import { createEntityId, ENTITY_ID_PREFIX } from '../domain/identity';

const EXIT_MS = 220;

function createNotificationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return createEntityId(ENTITY_ID_PREFIX.NOTIFICATION);
}

/**
 * نرمال‌سازی payload ایزوله — بدون منطق دامنه پیش‌فاکتور.
 * @param {object} payload
 * @returns {{ id: string, type: string, title: string, message: string, metadata: object, exiting: boolean }}
 */
function normalizePayload(payload = {}) {
  return {
    id: payload.id || createNotificationId(),
    type: payload.type || 'DEFAULT',
    title: payload.title || '',
    message: payload.message || '',
    metadata: payload.metadata && typeof payload.metadata === 'object'
      ? payload.metadata
      : {},
    exiting: false,
  };
}

const NotificationEngineContext = createContext({
  queue: [],
  dispatchNotification: () => {},
  dismissNotification: () => {},
});

export function NotificationEngineProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const timersRef = useRef(new Map());
  const exitTimersRef = useRef(new Map());

  const clearTimer = useCallback((mapRef, id) => {
    const timerId = mapRef.current.get(id);
    if (timerId != null) {
      window.clearTimeout(timerId);
      mapRef.current.delete(id);
    }
  }, []);

  const removeFromQueue = useCallback((id) => {
    clearTimer(timersRef, id);
    clearTimer(exitTimersRef, id);
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, [clearTimer]);

  const dismissNotification = useCallback((id) => {
    clearTimer(timersRef, id);
    setQueue((prev) => {
      const target = prev.find((item) => item.id === id);
      if (!target || target.exiting) return prev;
      return prev.map((item) => (
        item.id === id ? { ...item, exiting: true } : item
      ));
    });
    clearTimer(exitTimersRef, id);
    const exitTimer = window.setTimeout(() => {
      removeFromQueue(id);
    }, EXIT_MS);
    exitTimersRef.current.set(id, exitTimer);
  }, [clearTimer, removeFromQueue]);

  const dispatchNotification = useCallback((payload) => {
    const item = normalizePayload(payload);
    const { duration } = getEventConfig(item.type);

    setQueue((prev) => [...prev, item]);

    clearTimer(timersRef, item.id);
    const hideTimer = window.setTimeout(() => {
      dismissNotification(item.id);
    }, duration);
    timersRef.current.set(item.id, hideTimer);

    return item.id;
  }, [clearTimer, dismissNotification]);

  /* شبیه‌سازی توسعه: Shift + O → رویداد ایزوله DOCUMENT_OPENED */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!event.shiftKey) return;
      if (event.key !== 'O' && event.key !== 'o') return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      event.preventDefault();
      dispatchNotification({
        id: createNotificationId(),
        type: 'DOCUMENT_OPENED',
        title: 'مشتری پیش‌فاکتور را باز کرد',
        message: 'پیش‌فاکتور شماره PI-1405-00027 هم‌اکنون مشاهده شد.',
        metadata: {
          documentId: 'PI-1405-00027',
          timestamp: new Date(),
        },
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatchNotification]);

  useEffect(() => () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    exitTimersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current.clear();
    exitTimersRef.current.clear();
  }, []);

  const value = useMemo(() => ({
    queue,
    dispatchNotification,
    dismissNotification,
  }), [queue, dispatchNotification, dismissNotification]);

  return (
    <NotificationEngineContext.Provider value={value}>
      {children}
      <NotificationContainer queue={queue} onDismiss={dismissNotification} />
    </NotificationEngineContext.Provider>
  );
}

export function useNotificationEngine() {
  return useContext(NotificationEngineContext);
}
