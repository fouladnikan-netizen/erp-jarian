/**
 * Prints the sales tax invoice in an isolated document so SPA @page
 * portrait rules (proforma / shipping / sooratbar) cannot override landscape.
 */

const TAX_INVOICE_PRINT_CSS = `
  @page {
    size: 297mm 210mm;
    margin: 8mm;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    width: 297mm;
    min-height: 210mm;
    background: #fff;
    color: #111827;
    direction: rtl;
    font-family: 'Vazirmatn', Tahoma, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .font-meem {
    font-family: 'Vazirmatn', Tahoma, sans-serif !important;
  }

  .font-yekan {
    font-family: 'Yekan Bakh', Tahoma, sans-serif !important;
  }

  .saranjam-taxdoc {
    width: 277mm;
    max-width: none;
    margin: 0 auto;
    padding: 2mm;
    background: #fff;
    border: none;
    color: #111827;
  }

  .saranjam-taxdoc__top {
    display: grid;
    grid-template-columns: 1fr 1.4fr 1fr;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.55rem;
    padding-bottom: 0.45rem;
    border-bottom: 1px solid #CBD5E1;
  }

  .saranjam-taxdoc__top-brand {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .saranjam-taxdoc__logo {
    width: 42px;
    height: 42px;
    object-fit: contain;
  }

  .saranjam-taxdoc__top-company {
    font-size: 0.82rem;
    font-weight: 700;
  }

  .saranjam-taxdoc__title {
    margin: 0;
    text-align: center;
    font-size: 1.05rem;
    font-weight: 800;
    color: #111827;
  }

  .saranjam-taxdoc__top-meta {
    text-align: left;
    font-size: 0.78rem;
    line-height: 1.55;
  }

  .saranjam-taxdoc__top-meta p {
    margin: 0.1rem 0;
  }

  .saranjam-taxdoc__party-box {
    display: grid;
    grid-template-columns: 1.6rem 1fr;
    border: 1px solid #94A3B8;
    margin-bottom: 0.45rem;
    background: #fff;
  }

  .saranjam-taxdoc__party-side {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F1F5F9;
    border-left: 1px solid #94A3B8;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .saranjam-taxdoc__party-body {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 0.35rem 0.75rem;
    padding: 0.45rem 0.6rem;
    font-size: 0.72rem;
    line-height: 1.5;
  }

  .saranjam-taxdoc__party-col p {
    margin: 0.12rem 0;
  }

  .saranjam-taxdoc__k {
    font-weight: 700;
    color: #475569;
  }

  .saranjam-taxdoc__table-wrap {
    overflow: visible;
    border: 1px solid #94A3B8;
  }

  .saranjam-taxdoc__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .saranjam-taxdoc__table th,
  .saranjam-taxdoc__table td {
    border: 1px solid #94A3B8;
    padding: 0.28rem 0.22rem;
    font-size: 0.62rem;
    text-align: center;
    vertical-align: middle;
    background: #fff;
    color: #111827;
    word-wrap: break-word;
  }

  .saranjam-taxdoc__table th {
    background: #F8FAFC;
    font-weight: 700;
    line-height: 1.35;
  }

  .saranjam-taxdoc__desc {
    text-align: right !important;
    padding-right: 0.35rem !important;
  }

  .saranjam-taxdoc__table th:nth-child(1),
  .saranjam-taxdoc__table td:nth-child(1) { width: 3.5%; }
  .saranjam-taxdoc__table th:nth-child(2),
  .saranjam-taxdoc__table td:nth-child(2) { width: 6%; }
  .saranjam-taxdoc__table th:nth-child(3),
  .saranjam-taxdoc__table td:nth-child(3) { width: 18%; }
  .saranjam-taxdoc__table th:nth-child(4),
  .saranjam-taxdoc__table td:nth-child(4) { width: 6%; }
  .saranjam-taxdoc__table th:nth-child(5),
  .saranjam-taxdoc__table td:nth-child(5) { width: 7%; }

  .saranjam-taxdoc__sum-row td {
    background: #F8FAFC;
    font-weight: 700;
  }

  .saranjam-taxdoc__sum-label {
    text-align: left !important;
    padding-left: 0.5rem !important;
  }

  .saranjam-taxdoc__bottom {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 0.45rem;
    margin-top: 0.5rem;
  }

  .saranjam-taxdoc__notes {
    border: 1px solid #94A3B8;
    padding: 0.45rem 0.55rem;
    font-size: 0.7rem;
    line-height: 1.55;
    background: #fff;
  }

  .saranjam-taxdoc__notes p {
    margin: 0.2rem 0;
  }

  .saranjam-taxdoc__sign {
    border: 1px solid #94A3B8;
    min-height: 5.5rem;
    padding: 0.45rem;
    text-align: center;
    font-size: 0.74rem;
    font-weight: 700;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }

  .saranjam-taxdoc__sign p {
    margin: 0;
  }

  .saranjam-taxdoc__sign-logo {
    width: 40px;
    height: 40px;
    object-fit: contain;
    margin-top: 0.35rem;
    opacity: 0.85;
  }

  .saranjam-taxdoc__party-box,
  .saranjam-taxdoc__table tr,
  .saranjam-taxdoc__bottom {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

function resolveAbsoluteUrl(href) {
  try {
    return new URL(href, window.location.href).href;
  } catch {
    return href;
  }
}

function prepareCloneForPrint(sourceEl) {
  const clone = sourceEl.cloneNode(true);

  clone.querySelectorAll('input').forEach((input) => {
    const span = document.createElement('span');
    span.className = 'font-yekan';
    span.textContent = input.value ?? '';
    input.replaceWith(span);
  });

  clone.querySelectorAll('img[src]').forEach((img) => {
    img.setAttribute('src', resolveAbsoluteUrl(img.getAttribute('src')));
  });

  return clone;
}

function buildPrintHtml(taxdocEl) {
  const clone = prepareCloneForPrint(taxdocEl);
  const origin = window.location.origin;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>چاپ صورتحساب فروش</title>
  <base href="${origin}/" />
  <style>
    @font-face {
      font-family: 'Vazirmatn';
      src: url('${origin}/assets/fonts/vazirmatn/Vazirmatn-Regular.woff2') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Vazirmatn';
      src: url('${origin}/assets/fonts/vazirmatn/Vazirmatn-Bold.woff2') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Yekan Bakh';
      src: url('${origin}/assets/fonts/yekan-bakh/YekanBakh-Regular.woff2') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Yekan Bakh';
      src: url('${origin}/assets/fonts/yekan-bakh/YekanBakh-Bold.woff2') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    ${TAX_INVOICE_PRINT_CSS}
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;
}

/**
 * @param {HTMLElement | null} taxdocEl
 * @returns {boolean}
 */
export function printTaxInvoice(taxdocEl) {
  if (!taxdocEl || typeof window === 'undefined') return false;

  const html = buildPrintHtml(taxdocEl);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'چاپ فاکتور');
  iframe.setAttribute('aria-hidden', 'true');
  // Non-zero size off-screen — zero-size iframes often print blank / wrong orientation in Chrome
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1200px;height:850px;border:0;';
  document.body.appendChild(iframe);

  const frameWin = iframe.contentWindow;
  const frameDoc = iframe.contentDocument || frameWin?.document;
  if (!frameWin || !frameDoc) {
    iframe.remove();
    return false;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 500);
  };

  const triggerPrint = async () => {
    try {
      if (frameDoc.fonts?.ready) {
        await frameDoc.fonts.ready;
      }
    } catch {
      /* ignore */
    }

    frameWin.focus();
    frameWin.addEventListener('afterprint', cleanup, { once: true });
    frameWin.print();
    // Fallback cleanup if afterprint never fires
    window.setTimeout(cleanup, 2000);
  };

  window.setTimeout(() => {
    triggerPrint();
  }, 300);

  return true;
}
