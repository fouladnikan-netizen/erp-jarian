const SIGN_SRC = '/assets/signature/sign.png';
const STAMP_SRC = '/assets/signature/stamp.png';

/**
 * Compact seller/buyer labels (no table/box look).
 * Signature + stamp render over the «مهر و امضای فروشنده» label.
 */
export default function ProformaSeal({ sealState = 'idle' }) {
  const showSellerMarks = sealState === 'signing' || sealState === 'approved';

  return (
    <div
      className={`invoice-doc__signatures${sealState === 'approved' ? ' is-approved' : ''}${sealState === 'signing' ? ' is-signing' : ''}`}
    >
      <div className="invoice-doc__sign-block invoice-doc__sign-block--seller">
        <div className="invoice-doc__sign-slot">
          <span className="invoice-doc__sign-title">مهر و امضای فروشنده</span>
          {showSellerMarks && (
            <div className="invoice-doc__sign-marks" aria-hidden="true">
              <div
                className={`invoice-doc__signature${sealState === 'signing' ? ' is-drawing' : ''}${sealState === 'approved' ? ' is-drawn' : ''}`}
              >
                <img src={SIGN_SRC} alt="" className="invoice-doc__signature-img" />
              </div>
              <div
                className={`invoice-doc__stamp${sealState === 'signing' ? ' is-smashing' : ''}${sealState === 'approved' ? ' is-stamped' : ''}`}
              >
                <img src={STAMP_SRC} alt="" className="invoice-doc__stamp-img" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="invoice-doc__sign-block invoice-doc__sign-block--buyer">
        <span className="invoice-doc__sign-title">مهر و امضای خریدار</span>
      </div>
    </div>
  );
}
