import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/** انواع رویداد قابل گسترش برای Event Bus / WebSocket آینده */
export const DOCUMENT_TRACKER_EVENTS = {
  DOCUMENT_OPENED: 'DOCUMENT_OPENED',
};

const AUTO_HIDE_MS = 8000;

const INITIAL_ALERT = {
  visible: false,
  type: '',
  title: '',
  message: '',
  metadata: {},
};

function buildAlertFromPayload(payload = {}) {
  const type = payload.type || DOCUMENT_TRACKER_EVENTS.DOCUMENT_OPENED;
  const documentNumber = payload.documentNumber || '—';
  const customerName = payload.customerName || '';
  const openedAt = payload.openedAt || new Date();

  if (type === DOCUMENT_TRACKER_EVENTS.DOCUMENT_OPENED) {
    return {
      visible: true,
      type,
      title: 'مشتری پیش‌فاکتور را باز کرد',
      message: `پیش‌فاکتور شماره ${documentNumber} هم‌اکنون مشاهده شد.`,
      metadata: {
        documentNumber,
        customerName,
        openedAt,
      },
    };
  }

  return {
    visible: true,
    type,
    title: 'اعلان سند',
    message: payload.message || 'رویداد جدیدی برای سند ثبت شد.',
    metadata: { ...payload },
  };
}

const DocumentTrackerContext = createContext({
  alert: INITIAL_ALERT,
  showDocumentAlert: () => {},
  hideDocumentAlert: () => {},
});

export function DocumentTrackerProvider({ children }) {
  const [alert, setAlert] = useState(INITIAL_ALERT);
  const hideTimerRef = useRef(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hideDocumentAlert = useCallback(() => {
    clearHideTimer();
    setAlert((prev) => ({ ...prev, visible: false }));
  }, [clearHideTimer]);

  const showDocumentAlert = useCallback((payload) => {
    clearHideTimer();
    setAlert(buildAlertFromPayload(payload));
    hideTimerRef.current = window.setTimeout(() => {
      setAlert((prev) => ({ ...prev, visible: false }));
      hideTimerRef.current = null;
    }, AUTO_HIDE_MS);
  }, [clearHideTimer]);

  /* شبیه‌سازی توسعه: Shift + O */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!event.shiftKey) return;
      if (event.key !== 'O' && event.key !== 'o') return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      event.preventDefault();
      showDocumentAlert({
        type: DOCUMENT_TRACKER_EVENTS.DOCUMENT_OPENED,
        documentNumber: 'PI-1405-00027',
        customerName: '',
        openedAt: new Date(),
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDocumentAlert]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const value = useMemo(() => ({
    alert,
    showDocumentAlert,
    hideDocumentAlert,
  }), [alert, showDocumentAlert, hideDocumentAlert]);

  return (
    <DocumentTrackerContext.Provider value={value}>
      {children}
    </DocumentTrackerContext.Provider>
  );
}

export function useDocumentTracker() {
  return useContext(DocumentTrackerContext);
}
