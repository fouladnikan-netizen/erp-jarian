import { useState } from 'react';
import {
  Copy,
  Check,
  Link2,
  MessageCircle,
  Eye,
} from 'lucide-react';
import { toPersianDigits } from '../dateUtils';
import {
  getTrackingStepState,
  getTrackingStatusBadge,
} from '../documentTracking';
import {
  DOCUMENT_TRACKER_EVENTS,
  useDocumentTracker,
} from '../../../context/DocumentTrackerContext';
import './document-tracking-panel.css';

const ICON = { size: 15, strokeWidth: 1.75 };

const PULSE_STEPS = [
  { id: 'generated', label: 'لینک ساخته شد', Icon: Check },
  { id: 'sent', label: 'ارسال از طریق واتساپ', Icon: MessageCircle },
  { id: 'opened', label: 'مشاهده توسط مشتری', Icon: Eye },
];

/**
 * پنل ردیابی سند امن (Path B).
 * Props کنترل‌شده؛ منطق کپی/واتساپ از والد via callbacks.
 *
 * @param {object} props
 * @param {string} props.documentId
 * @param {string} props.secureLink
 * @param {'generated'|'sent'|'opened'} props.status
 * @param {number} props.openedCount
 * @param {string} props.lastOpenedAt
 * @param {{ generated?: string, sent?: string, opened?: string }} [props.stepTimes]
 * @param {() => void} props.onCopyLink
 * @param {() => void} props.onSendWhatsApp
 */
export default function DocumentTrackingPanel({
  documentId,
  secureLink,
  status = 'generated',
  openedCount = 0,
  lastOpenedAt = '—',
  stepTimes = {},
  onCopyLink,
  onSendWhatsApp,
}) {
  const [copied, setCopied] = useState(false);
  const { showDocumentAlert } = useDocumentTracker();
  const displayUrl = String(secureLink || '').replace(/^https?:\/\//, '');
  const badge = getTrackingStatusBadge(status);

  const handleCopy = () => {
    onCopyLink?.();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleSimulateOpen = () => {
    showDocumentAlert({
      type: DOCUMENT_TRACKER_EVENTS.DOCUMENT_OPENED,
      documentNumber: documentId || 'PI-1405-00027',
      customerName: '',
      openedAt: new Date(),
    });
  };

  return (
    <section className="doc-track" dir="rtl" aria-label="ردیابی سند امن">
      {/* Section 1 — Secure Link */}
      <header className="doc-track__section">
        <div className="doc-track__section-head">
          <h3 className="doc-track__title font-meem">لینک امن</h3>
          <p className="doc-track__sub font-meem">
            به‌جای ارسال فایل PDF، این لینک محافظت‌شده را به اشتراک بگذارید.
          </p>
          {documentId ? (
            <p className="doc-track__doc-id font-yekan">{documentId}</p>
          ) : null}
        </div>

        <div className="doc-track__link-row">
          <div className="doc-track__url-shell">
            <Link2 size={14} strokeWidth={1.75} className="doc-track__url-icon" aria-hidden="true" />
            <input
              type="text"
              className="doc-track__url font-yekan"
              value={displayUrl}
              readOnly
              aria-label="آدرس لینک امن"
            />
          </div>
          <button
            type="button"
            className="doc-track__icon-btn"
            onClick={handleCopy}
            aria-label="کپی لینک"
            title="کپی لینک"
          >
            {copied ? <Check size={15} strokeWidth={2} /> : <Copy {...ICON} />}
          </button>
        </div>
        {copied ? (
          <p className="doc-track__flash font-meem" role="status">لینک در کلیپ‌بورد کپی شد</p>
        ) : null}
      </header>

      {/* Section 2 — Document Pulse */}
      <div className="doc-track__section">
        <h4 className="doc-track__section-title font-meem">پالس سند</h4>
        <ol className="doc-track__pulse" aria-label="پالس سند">
          {PULSE_STEPS.map((step, index) => {
            const state = getTrackingStepState(status, step.id);
            const StepIcon = step.Icon;
            const time = stepTimes[step.id];
            return (
              <li key={step.id} className={`doc-track__pulse-item is-${state}`}>
                <span className="doc-track__pulse-rail" aria-hidden="true">
                  <span className="doc-track__pulse-dot">
                    <StepIcon size={12} strokeWidth={2} />
                  </span>
                  {index < PULSE_STEPS.length - 1 ? (
                    <span className="doc-track__pulse-line" />
                  ) : null}
                </span>
                <div className="doc-track__pulse-body">
                  <span className="doc-track__pulse-label font-meem">{step.label}</span>
                  {time && state !== 'pending' ? (
                    <span className="doc-track__pulse-meta font-yekan">{time}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Section 3 — Analytics */}
      <div className="doc-track__section doc-track__analytics" aria-label="خلاصه آمار">
        <div className="doc-track__stat">
          <span className="doc-track__stat-label font-meem">بازدید</span>
          <strong className="doc-track__stat-value font-yekan">
            {toPersianDigits(openedCount)}
          </strong>
        </div>
        <div className="doc-track__stat">
          <span className="doc-track__stat-label font-meem">آخرین مشاهده</span>
          <strong className="doc-track__stat-value font-yekan">{lastOpenedAt}</strong>
        </div>
        <div className="doc-track__stat doc-track__stat--badge">
          <span className="doc-track__stat-label font-meem">وضعیت</span>
          <span className={`doc-track__status-badge doc-track__status-badge--${badge.tone} font-meem`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Section 4 — Primary action */}
      <footer className="doc-track__foot">
        <button
          type="button"
          className="doc-track__wa-btn"
          onClick={() => onSendWhatsApp?.()}
        >
          <MessageCircle size={15} strokeWidth={1.75} aria-hidden="true" />
          <span className="font-meem">ارسال پیام واتساپ</span>
        </button>
        <button
          type="button"
          className="doc-track__sim-btn font-meem"
          onClick={handleSimulateOpen}
        >
          <Eye size={14} strokeWidth={1.75} aria-hidden="true" />
          شبیه‌سازی باز شدن توسط مشتری
        </button>
      </footer>
    </section>
  );
}
