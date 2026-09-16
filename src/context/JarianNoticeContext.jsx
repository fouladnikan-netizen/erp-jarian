import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import JarianNotice from '../components/ui/JarianNotice';

const JarianNoticeContext = createContext(null);

function toSpec(input) {
  return typeof input === 'string' ? { message: input } : (input || {});
}

export function JarianNoticeProvider({ children }) {
  const [notice, setNotice] = useState(null);
  const resolverRef = useRef(null);

  const finish = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setNotice(null);
    resolve?.(result);
  }, []);

  const open = useCallback((spec) => (
    new Promise((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setNotice(spec);
    })
  ), []);

  const alert = useCallback((input) => {
    const spec = toSpec(input);
    return open({
      kind: 'alert',
      title: spec.title || 'توجه',
      entity: spec.entity || '',
      message: spec.message || '',
      hint: spec.hint || '',
      confirmLabel: spec.confirmLabel || 'متوجه شدم',
      cancelLabel: '',
      danger: Boolean(spec.danger),
      ltr: Boolean(spec.ltr),
    }).then(() => undefined);
  }, [open]);

  const confirm = useCallback((input) => {
    const spec = toSpec(input);
    return open({
      kind: 'confirm',
      title: spec.title || 'تأیید',
      entity: spec.entity || '',
      message: spec.message || '',
      hint: spec.hint || '',
      confirmLabel: spec.confirmLabel || 'تأیید',
      cancelLabel: spec.cancelLabel || 'انصراف',
      danger: Boolean(spec.danger),
      ltr: Boolean(spec.ltr),
    }).then(Boolean);
  }, [open]);

  const copyText = useCallback(async (text, title = 'کپی') => {
    const value = String(text || '');
    if (!value) return false;
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      await alert({
        title,
        message: value,
        hint: 'این متن را انتخاب و کپی کنید.',
        ltr: true,
      });
      return false;
    }
  }, [alert]);

  const value = useMemo(() => ({ alert, confirm, copyText }), [alert, confirm, copyText]);

  return (
    <JarianNoticeContext.Provider value={value}>
      {children}
      <JarianNotice
        notice={notice}
        onCancel={() => finish(false)}
        onConfirm={() => finish(true)}
      />
    </JarianNoticeContext.Provider>
  );
}

export function useJarianNotice() {
  const ctx = useContext(JarianNoticeContext);
  if (!ctx) {
    throw new Error('useJarianNotice must be used within JarianNoticeProvider');
  }
  return ctx;
}
