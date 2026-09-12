import JarianModal from './JarianModal';

/**
 * Shared confirm / info dialog — glass modal, Theme Tokens, Meem type.
 * Opened via `useJarianNotice()`; never use window.alert / window.confirm.
 */
export default function JarianNotice({ notice, onCancel, onConfirm }) {
  if (!notice) return null;

  const isConfirm = notice.kind === 'confirm';
  const confirmClass = notice.danger ? 'btn btn--outline-danger font-meem' : 'btn btn--primary font-meem';

  return (
    <JarianModal
      open
      onClose={onCancel}
      title={notice.title}
      size="sm"
      className="jarian-notice"
      footer={(
        <div className="jarian-notice__actions">
          <button type="button" className={confirmClass} onClick={onConfirm} autoFocus>
            {notice.confirmLabel}
          </button>
          {isConfirm ? (
            <button type="button" className="btn btn--outline font-meem" onClick={onCancel}>
              {notice.cancelLabel}
            </button>
          ) : null}
        </div>
      )}
    >
      {notice.entity ? (
        <p className="jarian-notice__entity font-meem">«{notice.entity}»</p>
      ) : null}
      {notice.message ? (
        <p className={`jarian-notice__message font-meem${notice.ltr ? ' jarian-notice__message--ltr' : ''}`}>
          {notice.message}
        </p>
      ) : null}
      {notice.hint ? (
        <p className="jarian-notice__hint font-meem">{notice.hint}</p>
      ) : null}
    </JarianModal>
  );
}
