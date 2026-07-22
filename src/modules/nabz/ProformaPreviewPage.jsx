import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProformaDocument from './components/ProformaDocument';
import { readProformaPreviewPayload } from './proformaPrint';
import './proforma.css';

export default function ProformaPreviewPage() {
  const [payload, setPayload] = useState(null);
  const [searchParams] = useSearchParams();
  const shouldPrint = searchParams.get('print') === '1';
  const previewId = searchParams.get('id');

  useEffect(() => {
    document.fonts.load('400 1rem Vazirmatn');
    document.fonts.load('700 1rem Vazirmatn');
  }, []);

  useEffect(() => {
    setPayload(readProformaPreviewPayload(previewId));
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

  if (!payload) {
    return (
      <div className="proforma-preview-page proforma-preview-page--empty">
        <p>داده پیش‌فاکتور یافت نشد. لطفاً از مودال نمایش سریع سفارش اقدام کنید.</p>
      </div>
    );
  }

  return (
    <div className="proforma-preview-page">
      {!shouldPrint && (
        <div className="proforma-preview-page__toolbar no-print">
          <button type="button" className="btn btn--outline" onClick={() => window.print()}>
            چاپ / PDF
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => window.close()}>
            بستن
          </button>
        </div>
      )}
      <ProformaDocument
        viewModel={payload.viewModel}
        terms={payload.terms}
        termsCustom={payload.termsCustom}
      />
    </div>
  );
}
