import sarbargJpg from '../../../assets/sarbarg/sarbarg.jpg';
import { ORG_SELF } from '../models/officialRecord';
import { ensureLetterHtml } from '../services/letterHtml';
import './printableOfficialLetter.css';

const SIGN_SRC = '/assets/signature/sign.png';
const STAMP_SRC = '/assets/signature/stamp.png';
const ISSUER_TITLE = 'صادرکننده';

function formatRecipient(record) {
  const receiver = record.participants?.receiver;
  if (!receiver) return '—';
  const bits = [
    receiver.name,
    receiver.companyName && receiver.companyName !== receiver.name ? receiver.companyName : null,
    receiver.position,
  ].filter(Boolean);
  return bits.join(' · ') || '—';
}

/**
 * A4 printable official letter on provided letterhead (sarbarg.jpg).
 * Reuses existing company signature/stamp assets — no new seal system.
 */
export default function PrintableOfficialLetter({ record }) {
  if (!record) return null;

  const registryNumber = record.registryNumber || record.number || '—';
  const date = record.recordDate || record.date || record.receivedDate || '—';
  const recipient = formatRecipient(record);
  const showSeal = Boolean(record.isLocked);
  const issuerName = record.issuedBy
    || record.participants?.sender?.name
    || ORG_SELF.name;
  const issuerTitle = record.issuerTitle || ISSUER_TITLE;

  return (
    <article
      className="printable-official-letter font-meem"
      dir="rtl"
      aria-label="نامه رسمی قابل چاپ"
    >
      <img
        className="printable-official-letter__letterhead"
        src={sarbargJpg}
        alt=""
        aria-hidden="true"
      />

      <div className="printable-official-letter__meta font-yekan">
        <div className="printable-official-letter__meta-row printable-official-letter__meta-row--number">
          <strong>{registryNumber}</strong>
        </div>
        <div className="printable-official-letter__meta-row printable-official-letter__meta-row--date">
          <strong>{date}</strong>
        </div>
      </div>

      <div className="printable-official-letter__content">
        <p className="printable-official-letter__subject">
          <span className="font-meem">موضوع:</span>
          {' '}
          <span className="font-meem">{record.subject || '—'}</span>
        </p>

        <p className="printable-official-letter__parties font-meem">
          <span>گیرنده:</span>
          {' '}
          {recipient}
        </p>

        <div
          className="printable-official-letter__body font-meem gahshomar-letter-html"
          dangerouslySetInnerHTML={{ __html: ensureLetterHtml(record.body || '') }}
        />

        <footer className="printable-official-letter__seal" aria-label="مهر و امضا">
          <div className="printable-official-letter__sign-block">
            <span className="printable-official-letter__sign-title font-meem">مهر و امضا</span>
            {showSeal ? (
              <div className="printable-official-letter__sign-marks" aria-hidden="true">
                <img src={SIGN_SRC} alt="" className="printable-official-letter__sign-img" />
                <img src={STAMP_SRC} alt="" className="printable-official-letter__stamp-img" />
              </div>
            ) : null}
            <div className="printable-official-letter__issuer font-meem">
              <strong>{issuerName}</strong>
              <span>{issuerTitle}</span>
            </div>
          </div>
        </footer>
      </div>
    </article>
  );
}
