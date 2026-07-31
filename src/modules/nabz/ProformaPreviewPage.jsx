import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProformaDocument from './components/ProformaDocument';
import {
  readProformaPreviewPayload,
  PROFORMA_SEND_MESSAGE_TYPE,
  PROFORMA_SIGNED_MESSAGE_TYPE,
} from './proformaPrint';
import './proforma.css';

const SEAL_IDLE = 'idle';
const SEAL_SIGNING = 'signing';
const SEAL_APPROVED = 'approved';

/** Signature draw ~1.5s; stamp smash starts ~0.7s; approve at ~2s */
const APPROVE_AFTER_MS = 2000;

const SEND_CHANNELS = [
  { id: 'email', label: 'ایمیل' },
  { id: 'sms', label: 'پیامک' },
  { id: 'whatsapp', label: 'واتساپ' },
];

export default function ProformaPreviewPage() {
  const [payload, setPayload] = useState(null);
  const [sealState, setSealState] = useState(SEAL_IDLE);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const shouldPrint = searchParams.get('print') === '1';
  const previewId = searchParams.get('id');
  const timersRef = useRef([]);
  const sendMenuRef = useRef(null);

  useEffect(() => {
    document.fonts.load('400 1rem Meem');
    document.fonts.load('700 1rem Meem');
  }, []);

  useEffect(() => {
    const data = readProformaPreviewPayload(previewId);
    setPayload(data);
    if (data?.signed) {
      setSealState(SEAL_APPROVED);
    }
  }, [previewId]);

  useEffect(() => {
    if (!shouldPrint || !payload) return undefined;

    const printWhenReady = async () => {
      try {
        await document.fonts.ready;
      } catch {
        /* ignore */
      }
      window.print();
    };

    const timer = window.setTimeout(() => {
      printWhenReady();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [shouldPrint, payload]);

  useEffect(() => () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    if (!sendMenuOpen) return undefined;
    const onPointerDown = (event) => {
      if (sendMenuRef.current && !sendMenuRef.current.contains(event.target)) {
        setSendMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSendMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [sendMenuOpen]);

  const postToOpener = (message) => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(message, window.location.origin);
      return true;
    }
    return false;
  };

  const handleSend = (channel = null) => {
    const documentNumber = payload?.viewModel?.documentNumber || payload?.viewModel?.orderCode;
    const sent = postToOpener({
      type: PROFORMA_SEND_MESSAGE_TYPE,
      orderId: payload?.orderId,
      versionId: payload?.versionId,
      documentNumber,
      channel,
      signed: sealState === SEAL_APPROVED,
    });
    setSendMenuOpen(false);
    if (!sent) {
      window.alert('برای ارسال پیش‌فاکتور، این پنجره را از صفحه سفارش باز کنید یا از تب سوابق اقدام کنید.');
    }
  };

  const archiveSignedSnapshot = () => {
    const documentNumber = payload?.viewModel?.documentNumber || payload?.viewModel?.orderCode;
    const snapshotName = `پیش‌فاکتور مهرشده ${documentNumber || ''}.pdf`.trim();
    postToOpener({
      type: PROFORMA_SIGNED_MESSAGE_TYPE,
      orderId: payload?.orderId,
      versionId: payload?.versionId,
      documentNumber,
      attachment: {
        name: snapshotName,
        type: 'pdf',
        size: '۲۴۸ کیلوبایت',
        note: 'نسخه مهر و امضا شده پیش‌فاکتور',
      },
    });
  };

  const handleSignAndStamp = () => {
    if (sealState !== SEAL_IDLE) return;
    setSealState(SEAL_SIGNING);
    setSendMenuOpen(false);

    const approveTimer = window.setTimeout(() => {
      setSealState(SEAL_APPROVED);
      archiveSignedSnapshot();
    }, APPROVE_AFTER_MS);

    timersRef.current.push(approveTimer);
  };

  if (!payload) {
    return (
      <div className="proforma-preview-page proforma-preview-page--empty">
        <p>داده پیش‌فاکتور یافت نشد. لطفاً دوباره از دکمه «صدور پیش‌فاکتور» اقدام کنید.</p>
      </div>
    );
  }

  const isSigning = sealState === SEAL_SIGNING;
  const isApproved = sealState === SEAL_APPROVED;

  return (
    <div className={`proforma-preview-page${isApproved ? ' proforma-preview-page--approved' : ''}`}>
      {!shouldPrint && (
        <div className="proforma-preview-page__toolbar proforma-preview-page__toolbar--top no-print">
          <button type="button" className="btn btn--ghost" onClick={() => window.close()}>
            بستن
          </button>
        </div>
      )}

      <ProformaDocument
        viewModel={payload.viewModel}
        terms={payload.terms}
        termsCustom={payload.termsCustom}
        sealState={sealState}
        layoutEditable={!shouldPrint}
      />

      {!shouldPrint && (
        <div className="proforma-preview-page__toolbar proforma-preview-page__toolbar--bottom no-print">
          {!isApproved && (
            <button
              type="button"
              className={`btn btn--primary proforma-preview-page__sign-btn${isSigning ? ' is-loading' : ''}`}
              onClick={handleSignAndStamp}
              disabled={isSigning}
              aria-busy={isSigning}
            >
              {isSigning ? (
                <>
                  <span className="proforma-preview-page__spinner" aria-hidden="true" />
                  در حال مهر و امضا…
                </>
              ) : (
                'مهر و امضای رسمی'
              )}
            </button>
          )}

          {isApproved && (
            <div className="proforma-preview-page__approved-bar" role="group" aria-label="اقدامات پس از تایید">
              <span className="proforma-preview-page__status-pill">تایید شده</span>
              <button type="button" className="btn btn--outline" onClick={() => window.print()}>
                چاپ
              </button>
              <div className="proforma-preview-page__send-wrap" ref={sendMenuRef}>
                <button
                  type="button"
                  className="btn btn--outline"
                  aria-expanded={sendMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setSendMenuOpen((open) => !open)}
                >
                  ارسال مستقیم
                </button>
                {sendMenuOpen && (
                  <div className="proforma-preview-page__send-menu proforma-preview-page__send-menu--up" role="menu">
                    {SEND_CHANNELS.map((channel) => (
                      <button
                        key={channel.id}
                        type="button"
                        role="menuitem"
                        className="proforma-preview-page__send-item"
                        onClick={() => handleSend(channel.id)}
                      >
                        {channel.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
