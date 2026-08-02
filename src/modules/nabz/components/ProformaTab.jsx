import { useCallback, useMemo } from 'react';
import {
  JarianMoney,
  JarianMoneyFooter,
  JarianProductCell,
} from '../../../components/jarian/JarianPresentation';
import { buildProformaViewModel } from '../proformaService';
import { DEFAULT_PROFORMA_TERMS } from '../proformaConfig';
import {
  MOCK_DOCUMENT_TRACKING,
  createWhatsAppMessage,
} from '../documentTracking';
import DocumentTrackingPanel from './DocumentTrackingPanel';

/**
 * محتوای خلاصه پیش‌فاکتور در نمایش سریع.
 */
export default function ProformaTab({
  order,
  terms,
  termsEditable,
  onTermsChange,
  onToggleTermsEdit,
}) {
  const viewModel = useMemo(() => buildProformaViewModel(order), [order]);

  const tracking = useMemo(() => ({
    ...MOCK_DOCUMENT_TRACKING,
    documentId: viewModel.documentNumber || order?.code || MOCK_DOCUMENT_TRACKING.documentId,
  }), [viewModel.documentNumber, order?.code]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tracking.secureLink);
    } catch {
      window.prompt('لینک را کپی کنید:', tracking.secureLink);
    }
  }, [tracking.secureLink]);

  const handleSendWhatsApp = useCallback(() => {
    const text = createWhatsAppMessage(tracking.secureLink);
    const phone = String(order?.phone || order?.mobile || '').replace(/\D/g, '');
    const base = phone ? `https://wa.me/${phone}?text=` : 'https://wa.me/?text=';
    window.open(`${base}${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }, [tracking.secureLink, order?.phone, order?.mobile]);

  return (
    <div className="nabz-proforma-tab">
      <DocumentTrackingPanel
        documentId={tracking.documentId}
        secureLink={tracking.secureLink}
        status={tracking.status}
        openedCount={tracking.openedCount}
        lastOpenedAt={tracking.lastOpenedAt}
        stepTimes={tracking.stepTimes}
        onCopyLink={handleCopyLink}
        onSendWhatsApp={handleSendWhatsApp}
      />

      <div className="nabz-proforma-table-wrap">
        <table className="nabz-proforma-table jarian-table">
          <thead>
            <tr>
              <th>ردیف</th>
              <th>شرح کالا</th>
              <th>مقدار</th>
              <th>واحد</th>
              <th>{viewModel.salePriceLabel}</th>
              <th>مبلغ کل</th>
            </tr>
          </thead>
          <tbody>
            {viewModel.lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="nabz-items-table__empty">اقلامی ثبت نشده است.</td>
              </tr>
            ) : (
              viewModel.lines.map((line) => (
                <tr key={line.row}>
                  <td>{line.row.toLocaleString('fa-IR')}</td>
                  <td className="jarian-td-product">
                    <JarianProductCell name={line.productName} description={line.productNote} />
                  </td>
                  <td>{Number(line.qty).toLocaleString('fa-IR')}</td>
                  <td>{line.unit}</td>
                  <td className="jarian-td-money"><JarianMoney amount={line.saleUnitPrice} /></td>
                  <td className="jarian-td-money"><JarianMoney amount={line.lineTotal} emphasis /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="nabz-proforma-footer">
        <div className="nabz-proforma-footer__row">
          <span>جمع پیش‌فاکتور</span>
          <strong><JarianMoneyFooter amount={viewModel.subtotal} /></strong>
        </div>
        {(viewModel.showVatBreakdown ?? viewModel.isOfficial) && (
          <div className="nabz-proforma-footer__row">
            <span>جمع مالیات ارزش افزوده (۱۰٪)</span>
            <strong><JarianMoneyFooter amount={viewModel.vatAmount} /></strong>
          </div>
        )}
        <div className="nabz-proforma-footer__row nabz-proforma-footer__row--grand">
          <span>جمع کل پیش‌فاکتور</span>
          <strong><JarianMoneyFooter amount={viewModel.grandTotal} emphasis /></strong>
        </div>
      </section>

      <section className="nabz-proforma-terms">
        <h4>توضیحات و شروط حقوقی فاکتور</h4>
        {termsEditable ? (
          <textarea
            className="nabz-form__textarea nabz-proforma-terms__editor"
            value={terms}
            onChange={(e) => onTermsChange(e.target.value)}
            rows={10}
            aria-label="شروط حقوقی پیش‌فاکتور"
          />
        ) : (
          <div className="nabz-proforma-terms__static">{terms || DEFAULT_PROFORMA_TERMS}</div>
        )}
        <label className="nabz-proforma-terms__toggle">
          <input
            type="checkbox"
            checked={termsEditable}
            onChange={(e) => onToggleTermsEdit(e.target.checked)}
          />
          <span>نیاز به ویرایش شروط است</span>
        </label>
      </section>
    </div>
  );
}
