import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatJarianMoney } from '../../../config/JarianUI.config';
import { toPersianDigits, toPersianInvoiceText } from '../dateUtils';
import {
  PROFORMA_BANK_ACCOUNTS,
  PROFORMA_TERMS_ITEMS,
} from '../proformaConfig';
import { InvoiceDocBrandHeader, InvoiceDocFooter } from './InvoiceDocChrome';
import ProformaSeal from './ProformaSeal';

function formatInvoiceNumber(amount, { withCurrency = false } = {}) {
  return formatJarianMoney(amount, { withCurrency });
}

function ProformaTermsBlock({ terms, termsCustom }) {
  if (termsCustom && terms) {
    return (
      <div className="invoice-doc__terms-custom">
        <h4 className="invoice-doc__terms-heading">شرایط و ضوابط پیش‌فاکتور</h4>
        <p className="invoice-doc__terms-custom-text">{toPersianInvoiceText(terms)}</p>
      </div>
    );
  }

  return (
    <>
      <div className="invoice-doc__accounts">
        <h4 className="invoice-doc__terms-heading">اطلاعات حساب‌های بانکی به‌نام «پترو فولاد نیکان»</h4>
        <div className="invoice-doc__accounts-list">
          {PROFORMA_BANK_ACCOUNTS.map((account) => (
            <p key={account.sheba}>
              {account.bank}: شماره حساب: {toPersianInvoiceText(account.account)} | شماره شبا:{' '}
              {toPersianInvoiceText(account.sheba)}
            </p>
          ))}
        </div>
      </div>
      <div className="invoice-doc__terms-list-wrap">
        <h4 className="invoice-doc__terms-heading">شرایط و ضوابط پیش‌فاکتور</h4>
        <ul className="invoice-doc__terms-list">
          {PROFORMA_TERMS_ITEMS.map((item, index) => (
            <li key={item.title}>
              <strong>{`${toPersianDigits(index + 1)}. ${item.title}:`}</strong>{' '}
              {item.body}
              {item.subItems && (
                <ul className="invoice-doc__terms-sublist">
                  {item.subItems.map((sub) => (
                    <li key={sub}>{sub}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function ProductDescription({ name, note }) {
  const detail = String(note || '').trim();
  return (
    <div
      className="jarian-product-cell invoice-doc__product-desc"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.35rem',
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        width: '100%',
        minWidth: 0,
        textAlign: 'right',
      }}
    >
      <span
        className="jarian-product-name invoice-doc__product-name"
        style={{
          display: 'inline',
          width: 'auto',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
      {detail ? (
        <span
          className="jarian-product-desc invoice-doc__product-note"
          style={{
            display: 'inline',
            width: 'auto',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--text-muted)',
            marginInlineStart: '0.25rem',
          }}
        >
          - {detail}
        </span>
      ) : null}
    </div>
  );
}

function ProformaDocHeader({ viewModel }) {
  return (
    <>
      <InvoiceDocBrandHeader viewModel={viewModel} />

      <section className="invoice-doc__buyer">
        <div className="invoice-doc__buyer-row">
          <h3 className="invoice-doc__buyer-title">خریدار</h3>
          <div className="invoice-doc__buyer-inline">
            <strong className="invoice-doc__buyer-name invoice-doc__buyer-nowrap">{viewModel.customerName}</strong>
            <span className="invoice-doc__buyer-item invoice-doc__buyer-nowrap">
              <span className="invoice-doc__field-label">شناسه ملی:</span>
              <span>{toPersianInvoiceText(viewModel.customerNationalId)}</span>
            </span>
            <span className="invoice-doc__buyer-item invoice-doc__buyer-nowrap">
              <span className="invoice-doc__field-label">درخواست‌کننده:</span>
              <span>{viewModel.requesterName}</span>
            </span>
          </div>
        </div>
      </section>
    </>
  );
}

const COL_KEYS = ['row', 'desc', 'qty', 'unit', 'price', 'total'];
const COL_LABELS = ['ردیف', 'شرح کالا', 'مقدار', 'واحد', 'قیمت واحد', 'قیمت کل'];
const DEFAULT_COL_WIDTHS = [8, 42, 10, 10, 15, 15];
const MIN_COL_WIDTH = 3.5;
/** ارتفاع سطر جدول (px) — فونت ثابت می‌ماند؛ فقط فاصله عمودی عوض می‌شود */
const DEFAULT_ROW_H_PX = 42;
const MIN_ROW_H_PX = 24;
const MAX_ROW_H_PX = 64;
const ROW_TEXT_LH_PX = 14;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function normalizeWidths(widths) {
  const next = widths.map((w) => clamp(w, MIN_COL_WIDTH, 70));
  const sum = next.reduce((a, b) => a + b, 0);
  if (sum <= 0) return [...DEFAULT_COL_WIDTHS];
  return next.map((w) => (w / sum) * 100);
}

function Colgroup({ widths }) {
  return (
    <colgroup>
      {COL_KEYS.map((key, index) => (
        <col
          key={key}
          className={`invoice-doc__colg invoice-doc__colg--${key}`}
          style={widths ? { width: `${widths[index]}%` } : undefined}
        />
      ))}
    </colgroup>
  );
}

function ColumnHeads({ editable = false, onColResizeStart }) {
  return (
    <tr className="invoice-doc__col-head">
      {COL_KEYS.map((key, index) => (
        <th
          key={key}
          scope="col"
          className={`invoice-doc__col invoice-doc__col--${key}`}
        >
          {COL_LABELS[index]}
          {editable && index > 0 && (
            <span
              className="invoice-doc__col-resize no-print"
              role="separator"
              aria-orientation="vertical"
              aria-label={`تغییر عرض ستون ${COL_LABELS[index]}`}
              onPointerDown={(event) => onColResizeStart?.(event, index)}
            />
          )}
        </th>
      ))}
    </tr>
  );
}

function LineRow({ line, index, measure = false }) {
  return (
    <tr
      className={`invoice-doc__table-row${index % 2 === 1 ? ' is-alt' : ''}`}
      data-measure={measure ? 'row' : undefined}
      data-row-index={index}
    >
      <td className="invoice-doc__col invoice-doc__col--row">{line.row.toLocaleString('fa-IR')}</td>
      <td className="invoice-doc__col invoice-doc__col--desc">
        <ProductDescription name={line.productName} note={line.productNote} />
      </td>
      <td className="invoice-doc__col invoice-doc__col--qty">{Number(line.qty).toLocaleString('fa-IR')}</td>
      <td className="invoice-doc__col invoice-doc__col--unit">{toPersianInvoiceText(line.unit)}</td>
      <td className="invoice-doc__col invoice-doc__col--price">{formatInvoiceNumber(line.saleUnitPrice)}</td>
      <td className="invoice-doc__col invoice-doc__col--total invoice-doc__col--bold">
        {formatInvoiceNumber(line.lineTotal)}
      </td>
    </tr>
  );
}

function TotalsBlock({ viewModel, measure = false }) {
  return (
    <section
      className="invoice-doc__totals-wrap"
      data-measure={measure ? 'totals' : undefined}
    >
      <div className="invoice-doc__totals">
        <div className="invoice-doc__totals-row">
          <span>جمع پیش فاکتور:</span>
          <span>{formatInvoiceNumber(viewModel.subtotal, { withCurrency: true })}</span>
        </div>
        {(viewModel.showVatBreakdown ?? viewModel.isOfficial) && (
          <div className="invoice-doc__totals-row">
            <span>جمع مالیات بر ارزش افزوده:</span>
            <span>{formatInvoiceNumber(viewModel.vatAmount, { withCurrency: true })}</span>
          </div>
        )}
        <div className="invoice-doc__totals-row invoice-doc__totals-row--grand">
          <span>جمع کل پیش فاکتور:</span>
          <span>{formatInvoiceNumber(viewModel.grandTotal, { withCurrency: true })}</span>
        </div>
        <p className="invoice-doc__totals-words">
          <span className="invoice-doc__totals-words-label">مبلغ به حروف:</span>{' '}
          {viewModel.grandTotalWords}
        </p>
      </div>
    </section>
  );
}

function TermsFootBlock({ terms, termsCustom, sealState, isOfficial = true, measure = false }) {
  return (
    <div
      className="invoice-doc__terms-foot"
      data-measure={measure ? 'terms' : undefined}
    >
      <section className="invoice-doc__terms-section">
        <ProformaTermsBlock terms={terms} termsCustom={termsCustom} />
      </section>
      {isOfficial ? <ProformaSeal sealState={sealState} /> : null}
    </div>
  );
}

function DocFooter({ measure = false, isOfficial = true }) {
  return <InvoiceDocFooter measure={measure} isOfficial={isOfficial} />;
}

/**
 * صفحه‌بندی ۵بخشی:
 * هدر+خریدار (همیشه) · جدول (+تیتر تکراری) · محاسبات · توضیحات(چسبیده به فوتر) · فوتر(همیشه)
 */
function packPages(rowHeights, headerH, colHeadH, totalsH, termsH, bodyMax) {
  const chromeTable = headerH + colHeadH;
  const chromePlain = headerH;
  const maxRowsOnly = Math.max(1, bodyMax - chromeTable);
  const pages = [];
  let i = 0;

  const sumRows = (idxs) => idxs.reduce((sum, idx) => sum + (rowHeights[idx] || 0), 0);

  // ۱) محصولات: تا جایی که در صفحه جا می‌شود
  while (i < rowHeights.length) {
    const idxs = [];
    let used = 0;
    while (i < rowHeights.length) {
      const h = rowHeights[i] || 0;
      if (idxs.length > 0 && used + h > maxRowsOnly) break;
      if (idxs.length === 0 && h > maxRowsOnly) {
        idxs.push(i);
        i += 1;
        used += h;
        break;
      }
      idxs.push(i);
      used += h;
      i += 1;
    }
    pages.push({ rowIndexes: idxs, showTotals: false, showTerms: false });
  }

  if (!pages.length) {
    pages.push({ rowIndexes: [], showTotals: false, showTerms: false });
  }

  const last = pages[pages.length - 1];
  const rowsH = sumRows(last.rowIndexes);
  const remainingOnLast = bodyMax - (last.rowIndexes.length ? chromeTable : chromePlain) - rowsH;

  // ۲) محاسبات — اگر جا بود همان صفحه؛ وگرنه صفحه بعد (بدون پوست‌کردن سطرها)
  if (remainingOnLast >= totalsH + termsH - 0.5) {
    last.showTotals = true;
    last.showTerms = true;
    return pages;
  }

  if (remainingOnLast >= totalsH - 0.5) {
    last.showTotals = true;
    // ۳) توضیحات جا نشد → صفحه بعد، چسبیده به فوتر
    pages.push({ rowIndexes: [], showTotals: false, showTerms: true });
    return pages;
  }

  // محاسبات هم جا نشد → صفحه بعد
  if (chromePlain + totalsH + termsH <= bodyMax + 0.5) {
    pages.push({ rowIndexes: [], showTotals: true, showTerms: true });
    return pages;
  }

  if (chromePlain + totalsH <= bodyMax + 0.5) {
    pages.push({ rowIndexes: [], showTotals: true, showTerms: false });
    pages.push({ rowIndexes: [], showTotals: false, showTerms: true });
    return pages;
  }

  // نادر: محاسبات از صفحه بزرگ‌تر — فقط محاسبات را بگذار
  pages.push({ rowIndexes: [], showTotals: true, showTerms: true });
  return pages;
}

function InvoicePage({
  viewModel,
  terms,
  termsCustom,
  sealState,
  lines,
  lineIndexes,
  showTotals,
  showTerms,
  pageIndex,
  pageCount,
  approved,
  widths,
  editable,
  onColResizeStart,
}) {
  const isOfficial = viewModel.isOfficial !== false;
  return (
    <article
      className={[
        'invoice-doc',
        'invoice-doc--page',
        approved ? 'invoice-doc--approved' : '',
        pageIndex === pageCount - 1 ? 'is-last' : '',
        isOfficial ? '' : 'invoice-doc--unofficial',
      ].filter(Boolean).join(' ')}
      data-page={pageIndex + 1}
      data-page-count={pageCount}
      data-official={isOfficial ? '1' : '0'}
    >
      <div className="invoice-doc__page-body">
        {/* ۱+۲: هدر و مشخصات خریدار — همیشه */}
        <div className="invoice-doc__print-header">
          <ProformaDocHeader viewModel={viewModel} />
        </div>

        {/* ۳: جدول سفارشات (+ تکرار تیتر در صفحات بعدی) */}
        {lineIndexes.length > 0 && (
          <table className="invoice-doc__sheet">
            <Colgroup widths={widths} />
            <thead>
              <ColumnHeads
                editable={editable && pageIndex === 0}
                onColResizeStart={onColResizeStart}
              />
            </thead>
            <tbody>
              {lineIndexes.map((lineIndex) => (
                <LineRow
                  key={lines[lineIndex].row}
                  line={lines[lineIndex]}
                  index={lineIndex}
                />
              ))}
            </tbody>
          </table>
        )}

        {/* ۴: محاسبات — ادامه جدول وقتی جا باشد */}
        {showTotals && <TotalsBlock viewModel={viewModel} />}

        {/* ۵: توضیحات — همیشه نزدیک فوتر */}
        {showTerms && (
          <TermsFootBlock
            terms={terms}
            termsCustom={termsCustom}
            sealState={sealState}
            isOfficial={isOfficial}
          />
        )}
      </div>

      {/* فوتر — همیشه */}
      <DocFooter isOfficial={isOfficial} />
    </article>
  );
}

export default function ProformaDocument({
  viewModel,
  terms,
  termsCustom = false,
  sealState = 'idle',
  layoutEditable = false,
}) {
  const measureRef = useRef(null);
  const dragRef = useRef(null);
  const lines = viewModel.lines || [];
  const [pagePlan, setPagePlan] = useState(null);
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);
  const [rowHPx, setRowHPx] = useState(DEFAULT_ROW_H_PX);

  const layoutStyle = useMemo(() => {
    const pad = Math.max(0, (rowHPx - ROW_TEXT_LH_PX) / 2);
    const style = {
      '--invoice-row-h': `${rowHPx}px`,
      '--invoice-row-pad': `${pad}px`,
    };
    colWidths.forEach((width, index) => {
      style[`--invoice-col-${index}`] = `${width}%`;
    });
    return style;
  }, [colWidths, rowHPx]);

  const measureKey = useMemo(
    () => JSON.stringify({
      lines: lines.map((l) => [l.row, l.productName, l.productNote, l.qty, l.unit, l.saleUnitPrice, l.lineTotal]),
      terms,
      termsCustom,
      sealState,
      isOfficial: viewModel.isOfficial !== false,
      showVat: viewModel.showVatBreakdown ?? viewModel.isOfficial,
      subtotal: viewModel.subtotal,
      vat: viewModel.vatAmount,
      grand: viewModel.grandTotal,
      colWidths,
      rowHPx,
    }),
    [lines, terms, termsCustom, sealState, viewModel.isOfficial, viewModel.showVatBreakdown, viewModel.subtotal, viewModel.vatAmount, viewModel.grandTotal, colWidths, rowHPx],
  );

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return undefined;

    const measure = () => {
      const bodyEl = root.querySelector('.invoice-doc__page-body');
      const headerEl = root.querySelector('[data-measure="header"]');
      const colHeadEl = root.querySelector('[data-measure="colhead"]');
      const totalsEl = root.querySelector('[data-measure="totals"]');
      const termsEl = root.querySelector('[data-measure="terms"]');
      const rowEls = root.querySelectorAll('[data-measure="row"]');

      const headerH = headerEl?.offsetHeight || 0;
      const colHeadH = colHeadEl?.offsetHeight || 0;
      const totalsH = totalsEl?.offsetHeight || 0;
      const termsH = termsEl?.offsetHeight || 0;
      const bodyMax = bodyEl?.clientHeight || Math.max(120, root.clientHeight - 80);
      const rowHeights = Array.from(rowEls).map((el) => el.offsetHeight || 0);

      setPagePlan(packPages(rowHeights, headerH, colHeadH, totalsH, termsH, bodyMax));
    };

    measure();

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => measure())
      : null;
    ro?.observe(root);

    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) measure();
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [measureKey]);

  useLayoutEffect(() => {
    if (!layoutEditable) return undefined;

    const onMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.type === 'col') {
        const table = document.querySelector('.invoice-doc-stack--editable .invoice-doc__sheet');
        const tableWidth = table?.getBoundingClientRect().width || 1;
        // RTL: dragging left grows the column to the right of the handle (DOM index-1)
        const deltaPct = ((drag.startX - event.clientX) / tableWidth) * 100;
        const next = [...drag.startWidths];
        const left = drag.edgeIndex - 1;
        const right = drag.edgeIndex;
        next[left] = drag.startWidths[left] + deltaPct;
        next[right] = drag.startWidths[right] - deltaPct;
        setColWidths(normalizeWidths(next));
        return;
      }

      if (drag.type === 'row') {
        const delta = event.clientY - drag.startY;
        const next = clamp(drag.startH + delta / 3, MIN_ROW_H_PX, MAX_ROW_H_PX);
        setRowHPx(Math.round(next));
      }
    };

    const onUp = () => {
      dragRef.current = null;
      document.body.classList.remove('is-invoice-resizing');
      delete document.body.dataset.resize;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [layoutEditable]);

  const handleColResizeStart = (event, edgeIndex) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      type: 'col',
      edgeIndex,
      startX: event.clientX,
      startWidths: [...colWidths],
    };
    document.body.classList.add('is-invoice-resizing');
    document.body.dataset.resize = 'col';
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleRowResizeStart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      type: 'row',
      startY: event.clientY,
      startH: rowHPx,
    };
    document.body.classList.add('is-invoice-resizing');
    document.body.dataset.resize = 'row';
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const approved = sealState === 'approved';
  const isOfficial = viewModel.isOfficial !== false;
  const plan = pagePlan || [{
    rowIndexes: lines.map((_, i) => i),
    showTotals: true,
    showTerms: true,
  }];

  return (
    <div
      className={`invoice-doc-stack${layoutEditable ? ' invoice-doc-stack--editable' : ''}${isOfficial ? '' : ' invoice-doc-stack--unofficial'}`}
      style={layoutStyle}
    >
      {layoutEditable && (
        <div className="invoice-doc-stack__toolbar no-print">
          <p className="invoice-doc-stack__hint">
            لبه تیترها را برای عرض ستون بکشید · ارتفاع سطر را از نوار زیر تنظیم کنید
          </p>
          <label className="invoice-doc-stack__row-control">
            <span>ارتفاع سطر</span>
            <input
              type="range"
              min={MIN_ROW_H_PX}
              max={MAX_ROW_H_PX}
              step={1}
              value={rowHPx}
              onChange={(event) => setRowHPx(Number(event.target.value))}
              aria-label="ارتفاع سطرهای جدول"
            />
            <span className="invoice-doc-stack__row-value">{rowHPx}px</span>
            <button
              type="button"
              className="invoice-doc-stack__row-drag"
              aria-label="کشیدن برای تغییر ارتفاع سطر"
              onPointerDown={handleRowResizeStart}
            >
              ↕
            </button>
          </label>
        </div>
      )}

      <div className="invoice-doc-stack__measure" aria-hidden="true">
        <article
          className={`invoice-doc invoice-doc--page invoice-doc--measure${isOfficial ? '' : ' invoice-doc--unofficial'}`}
          ref={measureRef}
        >
          <div className="invoice-doc__page-body">
            <div className="invoice-doc__print-header" data-measure="header">
              <ProformaDocHeader viewModel={viewModel} />
            </div>
            <table className="invoice-doc__sheet">
              <Colgroup widths={colWidths} />
              <thead data-measure="colhead">
                <ColumnHeads />
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <LineRow key={`m-${line.row}`} line={line} index={index} measure />
                ))}
              </tbody>
            </table>
            <TotalsBlock viewModel={viewModel} measure />
            <TermsFootBlock
              terms={terms}
              termsCustom={termsCustom}
              sealState={sealState}
              isOfficial={isOfficial}
              measure
            />
          </div>
          <DocFooter measure isOfficial={isOfficial} />
        </article>
      </div>

      {plan.map((page, pageIndex) => (
        <InvoicePage
          key={`page-${pageIndex}-${page.rowIndexes.join(',')}-${page.showTotals}-${page.showTerms}`}
          viewModel={viewModel}
          terms={terms}
          termsCustom={termsCustom}
          sealState={sealState}
          lines={lines}
          lineIndexes={page.rowIndexes}
          showTotals={page.showTotals}
          showTerms={page.showTerms}
          pageIndex={pageIndex}
          pageCount={plan.length}
          approved={approved}
          widths={colWidths}
          editable={layoutEditable}
          onColResizeStart={handleColResizeStart}
        />
      ))}
    </div>
  );
}
