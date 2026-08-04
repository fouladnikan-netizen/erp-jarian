import sarbargJpg from '../../../assets/sarbarg/sarbarg.jpg';
import {
  LETTER_BISMILLAH,
  ensureEditableLetterBody,
  formatHonorableCompany,
  getLetterSignatory,
} from '../services/letterDocument';
import './printableOfficialLetter.css';

/** @typedef {'letterhead' | 'plain'} PrintLetterVariant */

export const PRINT_LETTER_VARIANT = Object.freeze({
  LETTERHEAD: 'letterhead',
  PLAIN: 'plain',
});

function resolveCompanyName(record) {
  const party = record?.direction === 'INCOMING'
    ? record.participants?.sender
    : record.participants?.receiver;
  return String(party?.companyName || party?.name || '').trim();
}

/**
 * A4 printable official letter.
 * Layout is IDENTICAL for letterhead and plain — only overlays differ:
 * - letterhead: sarbarg background + seal/signature
 * - plain: blank sheet (for physical letterhead paper), no seal/signature
 *
 * @param {{ record: object, variant?: PrintLetterVariant }} props
 */
export default function PrintableOfficialLetter({
  record,
  variant = PRINT_LETTER_VARIANT.LETTERHEAD,
}) {
  if (!record) return null;

  const withLetterhead = variant === PRINT_LETTER_VARIANT.LETTERHEAD;
  const registryNumber = record.registryNumber || record.number || '—';
  const date = record.recordDate || record.date || record.receivedDate || '—';
  const showSeal = withLetterhead && Boolean(record.isLocked);
  const signatory = getLetterSignatory();
  const issuerName = record.issuedBy || signatory.name;
  const issuerTitle = record.issuerTitle || signatory.title;
  const companyLine = formatHonorableCompany(resolveCompanyName(record));
  const personLine = String(record.attentionName || '').trim();
  const bodyHtml = ensureEditableLetterBody(record.body || '');

  return (
    <article
      className="printable-official-letter font-meem"
      dir="rtl"
      aria-label={withLetterhead ? 'نامه رسمی با سربرگ' : 'نامه رسمی بدون سربرگ'}
      data-print-variant={variant}
    >
      {withLetterhead ? (
        <img
          className="printable-official-letter__letterhead"
          src={sarbargJpg}
          alt=""
          aria-hidden="true"
        />
      ) : null}

      <div className="printable-official-letter__meta font-yekan">
        <div className="printable-official-letter__meta-row printable-official-letter__meta-row--number">
          <strong>{registryNumber}</strong>
        </div>
        <div className="printable-official-letter__meta-row printable-official-letter__meta-row--date">
          <strong>{date}</strong>
        </div>
      </div>

      <div className="printable-official-letter__content">
        <p className="printable-official-letter__bismillah">{LETTER_BISMILLAH}</p>
        {companyLine ? (
          <p className="printable-official-letter__company-line">{companyLine}</p>
        ) : null}
        {personLine ? (
          <p className="printable-official-letter__person-line">{personLine}</p>
        ) : null}

        <div
          className="printable-official-letter__body font-meem gahshomar-letter-html"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        <div className="printable-official-letter__closing font-meem">
          <strong>{issuerName}</strong>
          <strong>{issuerTitle}</strong>
          <strong>{signatory.company}</strong>
        </div>

        {/*
          Reserve identical footprint always so text layout never shifts.
          Seal/stamp only rendered for electronic letterhead sends.
        */}
        <footer
          className="printable-official-letter__seal"
          aria-label={showSeal ? 'مهر و امضا' : undefined}
          aria-hidden={!showSeal}
        >
          <div className="printable-official-letter__sign-block">
            {showSeal ? (
              <div className="printable-official-letter__sign-marks" aria-hidden="true">
                <img src="/assets/signature/sign.png" alt="" className="printable-official-letter__sign-img" />
                <img src="/assets/signature/stamp.png" alt="" className="printable-official-letter__stamp-img" />
              </div>
            ) : null}
          </div>
        </footer>
      </div>
    </article>
  );
}
