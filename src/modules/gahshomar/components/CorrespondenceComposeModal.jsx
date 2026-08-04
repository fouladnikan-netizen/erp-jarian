import { useEffect, useId, useState } from 'react';
import { X, Inbox, Send, Link2 } from 'lucide-react';
import { createCorrespondence } from '../services/correspondenceService';
import {
  CORRESPONDENCE_DIRECTION,
  CORRESPONDENCE_STATUS,
  CORRESPONDENCE_TYPE,
  CORRESPONDENCE_PRIORITY,
  DEMO_CURRENT_USER_ID,
  DEMO_USERS,
  PRIORITY_LABELS,
} from '../models/correspondence';
import { getDisplayName } from '../../kanoon/columns';
import '../gahshomar-page.css';

/**
 * Compose correspondence — letter first; org relations optional in «ارتباطات».
 */
export default function CorrespondenceComposeModal({
  open,
  initialDirection = 'incoming',
  contacts = [],
  onClose,
  onCreated,
}) {
  const titleId = useId();
  const [direction, setDirection] = useState(CORRESPONDENCE_DIRECTION.INCOMING);
  const [type, setType] = useState(CORRESPONDENCE_TYPE.OFFICIAL);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState(CORRESPONDENCE_PRIORITY.NORMAL);
  const [body, setBody] = useState('');
  const [letterDate, setLetterDate] = useState('');
  const [senderName, setSenderName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverUserId, setReceiverUserId] = useState('emp-b');
  const [companyId, setCompanyId] = useState('');
  const [relatedOrderCode, setRelatedOrderCode] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const nextDirection = initialDirection === 'outgoing'
      ? CORRESPONDENCE_DIRECTION.OUTGOING
      : CORRESPONDENCE_DIRECTION.INCOMING;
    setDirection(nextDirection);
    setType(CORRESPONDENCE_TYPE.OFFICIAL);
    setSubject('');
    setCategory('');
    setPriority(CORRESPONDENCE_PRIORITY.NORMAL);
    setBody('');
    setLetterDate('');
    setSenderName('');
    setReceiverName('');
    setReceiverUserId('emp-b');
    setCompanyId('');
    setRelatedOrderCode('');
    setAttachmentName('');
    setError('');
    return undefined;
  }, [open, initialDirection]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const isInternal = type === CORRESPONDENCE_TYPE.INTERNAL;
    const created = createCorrespondence({
      direction: isInternal ? CORRESPONDENCE_DIRECTION.OUTGOING : direction,
      type,
      status: isInternal
        ? CORRESPONDENCE_STATUS.SENT
        : (direction === CORRESPONDENCE_DIRECTION.OUTGOING
          ? CORRESPONDENCE_STATUS.DRAFT
          : CORRESPONDENCE_STATUS.REGISTERED),
      subject,
      category: category || null,
      priority,
      body: body || null,
      letterDate: letterDate || null,
      receivedDate: direction === CORRESPONDENCE_DIRECTION.INCOMING ? (letterDate || null) : null,
      senderName: isInternal ? null : (senderName || null),
      receiverName: isInternal ? null : (receiverName || null),
      senderUserId: isInternal ? DEMO_CURRENT_USER_ID : null,
      receiverUserIds: isInternal ? [receiverUserId] : [],
      companyId: companyId || null,
      relatedOrderCode: relatedOrderCode || null,
      relatedEntity: relatedOrderCode
        ? { type: 'order', id: relatedOrderCode, name: relatedOrderCode }
        : null,
      attachments: attachmentName.trim()
        ? [{ fileName: attachmentName.trim() }]
        : [],
    });

    if (!created) {
      setError('موضوع و جهت نامه الزامی است.');
      return;
    }

    onCreated?.(created);
    onClose?.();
  };

  return (
    <div className="gahshomar-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="gahshomar-modal gahshomar-modal--wide kprofile-glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="gahshomar-modal__header">
          <div className="gahshomar-modal__title-wrap">
            {direction === CORRESPONDENCE_DIRECTION.INCOMING ? (
              <Inbox size={18} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Send size={18} strokeWidth={1.75} aria-hidden="true" />
            )}
            <h2 id={titleId} className="gahshomar-modal__title font-meem">
              ثبت مکاتبه رسمی
            </h2>
          </div>
          <button type="button" className="gahshomar-modal__close" aria-label="بستن" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <form className="gahshomar-modal__form" onSubmit={handleSubmit}>
          <div className="gahshomar-modal__row">
            <label className="gahshomar-modal__field font-meem">
              جهت
              <select
                className="gahshomar-modal__input font-meem"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                disabled={type === CORRESPONDENCE_TYPE.INTERNAL}
              >
                <option value={CORRESPONDENCE_DIRECTION.INCOMING}>دریافتی</option>
                <option value={CORRESPONDENCE_DIRECTION.OUTGOING}>ارسالی</option>
              </select>
            </label>
            <label className="gahshomar-modal__field font-meem">
              نوع
              <select
                className="gahshomar-modal__input font-meem"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value={CORRESPONDENCE_TYPE.OFFICIAL}>رسمی خارجی</option>
                <option value={CORRESPONDENCE_TYPE.INTERNAL}>داخلی سازمانی</option>
              </select>
            </label>
          </div>

          <label className="gahshomar-modal__field font-meem">
            موضوع
            <input
              className="gahshomar-modal__input font-meem"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </label>

          <div className="gahshomar-modal__row">
            <label className="gahshomar-modal__field font-meem">
              دسته‌بندی
              <input
                className="gahshomar-modal__input font-meem"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="استعلام، قرارداد، داخلی…"
                required
              />
            </label>
            <label className="gahshomar-modal__field font-meem">
              اولویت
              <select
                className="gahshomar-modal__input font-meem"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {Object.entries(PRIORITY_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="gahshomar-modal__field font-meem">
            تاریخ
            <input
              className="gahshomar-modal__input font-yekan"
              value={letterDate}
              onChange={(e) => setLetterDate(e.target.value)}
              placeholder="1404/01/01"
            />
          </label>

          {type === CORRESPONDENCE_TYPE.INTERNAL ? (
            <label className="gahshomar-modal__field font-meem">
              گیرنده داخلی
              <select
                className="gahshomar-modal__input font-meem"
                value={receiverUserId}
                onChange={(e) => setReceiverUserId(e.target.value)}
              >
                {DEMO_USERS.filter((u) => u.id !== DEMO_CURRENT_USER_ID).map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="gahshomar-modal__field font-meem">
              {direction === CORRESPONDENCE_DIRECTION.INCOMING ? 'فرستنده' : 'گیرنده'}
              <input
                className="gahshomar-modal__input font-meem"
                value={direction === CORRESPONDENCE_DIRECTION.INCOMING ? senderName : receiverName}
                onChange={(e) => (
                  direction === CORRESPONDENCE_DIRECTION.INCOMING
                    ? setSenderName(e.target.value)
                    : setReceiverName(e.target.value)
                )}
              />
            </label>
          )}

          <label className="gahshomar-modal__field font-meem">
            متن / شرح
            <textarea
              className="gahshomar-modal__textarea font-meem"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          <label className="gahshomar-modal__field font-meem">
            نام فایل پیوست (فقط متادیتا)
            <input
              className="gahshomar-modal__input font-meem"
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
              placeholder="letter.pdf"
            />
          </label>

          <fieldset className="gahshomar-modal__relations">
            <legend className="font-meem">
              <Link2 size={14} strokeWidth={1.75} aria-hidden="true" />
              ارتباطات (اختیاری)
            </legend>
            <label className="gahshomar-modal__field font-meem">
              سازمان / مخاطب مرتبط
              <select
                className="gahshomar-modal__input font-meem"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">بدون ارتباط سازمانی</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={String(contact.id)}>
                    {getDisplayName(contact)
                      || contact.companyName
                      || contact.personName
                      || `مخاطب ${contact.id}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="gahshomar-modal__field font-meem">
              کد سفارش مرتبط
              <input
                className="gahshomar-modal__input font-yekan"
                value={relatedOrderCode}
                onChange={(e) => setRelatedOrderCode(e.target.value)}
                placeholder="JR…"
              />
            </label>
          </fieldset>

          {error ? <p className="gahshomar-modal__error font-meem">{error}</p> : null}

          <footer className="gahshomar-modal__footer">
            <button type="button" className="gahshomar-btn font-meem" onClick={onClose}>
              انصراف
            </button>
            <button type="submit" className="gahshomar-btn gahshomar-btn--primary font-meem">
              ثبت نامه
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
