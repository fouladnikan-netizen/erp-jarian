import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ShippingDocument from './components/ShippingDocument';
import { readShippingPreviewPayload } from './shippingPrint';
import './shipping.css';

export default function ShippingPreviewPage() {
  const [payload, setPayload] = useState(null);
  const [searchParams] = useSearchParams();
  const shouldPrint = searchParams.get('print') === '1';
  const previewId = searchParams.get('id');

  useEffect(() => {
    document.fonts.load('400 1rem Vazirmatn');
    document.fonts.load('700 1rem Vazirmatn');
  }, []);

  useEffect(() => {
    setPayload(readShippingPreviewPayload(previewId));
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
      <div className="shipping-preview-page shipping-preview-page--empty">
        <p>داده حواله باربری یافت نشد. لطفاً از مرحله تجهیز اقدام کنید.</p>
      </div>
    );
  }

  return (
    <div className="shipping-preview-page">
      {!shouldPrint && (
        <div className="shipping-preview-page__toolbar no-print">
          <button type="button" className="btn btn--outline" onClick={() => window.print()}>
            چاپ
          </button>
        </div>
      )}
      <ShippingDocument viewModel={payload.viewModel} />
    </div>
  );
}
