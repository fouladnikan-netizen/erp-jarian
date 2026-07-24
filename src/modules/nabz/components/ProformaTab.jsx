import { useMemo } from 'react';
import { formatAmountRial } from '../orderCode';
import { buildProformaViewModel } from '../proformaService';
import { DEFAULT_PROFORMA_TERMS } from '../proformaConfig';

function formatPriceLine(amount) {
  return (
    <span className="nabz-price-line">
      <span className="nabz-price-line__value">{formatAmountRial(amount)}</span>
      <span className="nabz-price-line__currency">ریال</span>
    </span>
  );
}

/**
 * محتوای خلاصه پیش‌فاکتور در نمایش سریع.
 * صدور / نمایش / به‌روزرسانی و چاپ/ارسال در هدر مودال و صفحهٔ پیش‌نمایش انجام می‌شود
 * (هم‌منطق با پروفایل سفارش). مشخصات خریدار در هدر مودال است نه اینجا.
 */
export default function ProformaTab({
  order,
  terms,
  termsEditable,
  onTermsChange,
  onToggleTermsEdit,
}) {
  const viewModel = useMemo(() => buildProformaViewModel(order), [order]);

  return (
    <div className="nabz-proforma-tab">
      <div className="nabz-proforma-table-wrap">
        <table className="nabz-proforma-table">
          <thead>
            <tr>
              <th>ردیف</th>
              <th>شرح کالا - توضیحات</th>
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
                  <td>{line.description}</td>
                  <td>{Number(line.qty).toLocaleString('fa-IR')}</td>
                  <td>{line.unit}</td>
                  <td>{formatPriceLine(line.saleUnitPrice)}</td>
                  <td><strong>{formatPriceLine(line.lineTotal)}</strong></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="nabz-proforma-footer">
        <div className="nabz-proforma-footer__row">
          <span>جمع پیش‌فاکتور</span>
          <strong>{formatPriceLine(viewModel.subtotal)}</strong>
        </div>
        {viewModel.isOfficial && (
          <div className="nabz-proforma-footer__row">
            <span>جمع مالیات ارزش افزوده (۱۰٪)</span>
            <strong>{formatPriceLine(viewModel.vatAmount)}</strong>
          </div>
        )}
        <div className="nabz-proforma-footer__row nabz-proforma-footer__row--grand">
          <span>جمع کل پیش‌فاکتور</span>
          <strong>{formatPriceLine(viewModel.grandTotal)}</strong>
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
