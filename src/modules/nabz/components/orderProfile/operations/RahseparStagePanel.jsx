import { useMemo, useRef, useState } from 'react';
import { getFulfilledPurchaseRows } from '../../../tajhizStageService';
import {
  getQcInspectionForRow,
  getQcRowKey,
  isOrderQcComplete,
} from '../../../qcInspectionConfig';
import './RahseparStagePanel.css';

const MOCK_LOAD_LINES = [
  {
    id: 'load-1',
    name: 'تیرآهن ۱۸ ذوب آهن',
    thicknessDims: '۱۸۰×۹۱ میلی‌متر / ۱۲ متر',
    scaleWeight: '',
    warehouseFee: '',
  },
  {
    id: 'load-2',
    name: 'ورق سیاه ۲ میل',
    thicknessDims: '۲ میلی‌متر / ۱۲۵۰×۲۵۰۰',
    scaleWeight: '',
    warehouseFee: '',
  },
];

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function buildLoadLinesFromOrder(order) {
  const rows = getFulfilledPurchaseRows(order);
  if (!rows.length) return null;

  return rows.map((row) => {
    const qc = getQcInspectionForRow(order, row);
    const thickness = qc?.thickness || '';
    const dimensions = qc?.dimensions || '';
    const thicknessDims = [thickness, dimensions].filter(Boolean).join(' / ') || '—';
    return {
      id: getQcRowKey(row),
      name: row.name,
      thicknessDims,
      scaleWeight: '',
      warehouseFee: '',
    };
  });
}

/** All purchase rows have a non-rejected QC inspection. */
export function computeIsQcComplete(order) {
  return isOrderQcComplete(order, getFulfilledPurchaseRows(order));
}

export default function RahseparStagePanel({
  order,
  onUpdateOrder,
  compact = false,
}) {
  const uploadRef = useRef(null);
  const derivedComplete = useMemo(() => computeIsQcComplete(order), [order]);

  /** Test toggle — overrides derived QC gate for UI verification */
  const [qcGateOverride, setQcGateOverride] = useState(null);
  const isQcComplete = qcGateOverride === null ? derivedComplete : qcGateOverride;

  const [driverName, setDriverName] = useState(order?.rahsepar?.driverName || '');
  const [licensePlate, setLicensePlate] = useState(order?.rahsepar?.licensePlate || '');
  const [phone, setPhone] = useState(order?.rahsepar?.phone || '');
  const [carrierName, setCarrierName] = useState(order?.rahsepar?.carrierName || '');
  const [signedVoucherName, setSignedVoucherName] = useState(order?.rahsepar?.signedVoucherName || '');
  const [loadLines, setLoadLines] = useState(() => {
    const fromOrder = order ? buildLoadLinesFromOrder(order) : null;
    return fromOrder || MOCK_LOAD_LINES.map((line) => ({ ...line }));
  });

  const updateLine = (id, key, value) => {
    setLoadLines((prev) => prev.map((line) => (
      line.id === id ? { ...line, [key]: value } : line
    )));
  };

  const persistLogistics = (patch) => {
    onUpdateOrder?.((current) => ({
      ...current,
      rahsepar: {
        ...(current.rahsepar || {}),
        driverName,
        licensePlate,
        phone,
        carrierName,
        signedVoucherName,
        loadLines,
        ...patch,
      },
    }));
  };

  const handlePrint = () => {
    if (!isQcComplete) return;
    persistLogistics({ printedAt: new Date().toISOString() });
    window.print();
  };

  return (
    <section className={`rahsepar-stage font-meem${compact ? ' rahsepar-stage--compact' : ''}`}>
      <header className="rahsepar-stage__head">
        <div>
          <h2 className="rahsepar-stage__title">رهسپار — بارگیری و حواله خروج</h2>
          <p className="rahsepar-stage__subtitle">
            تکمیل اطلاعات راننده و اوزان باسکول؛ چاپ حواله منوط به تأیید QC است
          </p>
        </div>
        <label className="rahsepar-stage__qc-toggle">
          <input
            type="checkbox"
            checked={isQcComplete}
            onChange={(event) => setQcGateOverride(event.target.checked)}
          />
          <span>
            وضعیت QC کامل
            {' '}
            <span className="font-yekan">({isQcComplete ? 'فعال' : 'غیرفعال'})</span>
            {' '}
            — برای تست
          </span>
        </label>
      </header>

      <section className="rahsepar-stage__card" aria-labelledby="rahsepar-logistics-title">
        <h3 id="rahsepar-logistics-title" className="rahsepar-stage__card-title">اطلاعات لجستیک</h3>
        <div className="rahsepar-stage__grid">
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">نام راننده</span>
            <input
              type="text"
              className="rahsepar-stage__input"
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              placeholder="نام و نام خانوادگی راننده"
            />
          </label>
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">شماره پلاک</span>
            <input
              type="text"
              className="rahsepar-stage__input font-yekan"
              value={licensePlate}
              onChange={(event) => setLicensePlate(event.target.value)}
              placeholder="۱۲ب ۳۴۵ ایران ۶۷"
            />
          </label>
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">شماره تماس</span>
            <input
              type="tel"
              className="rahsepar-stage__input font-yekan"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            />
          </label>
          <label className="rahsepar-stage__field">
            <span className="rahsepar-stage__label">نام باربری</span>
            <input
              type="text"
              className="rahsepar-stage__input"
              value={carrierName}
              onChange={(event) => setCarrierName(event.target.value)}
              placeholder="شرکت حمل‌ونقل"
            />
          </label>
        </div>
      </section>

      <section className="rahsepar-stage__table-section" aria-labelledby="rahsepar-load-title">
        <h3 id="rahsepar-load-title" className="rahsepar-stage__section-title">جدول بارگیری</h3>
        <div className="rahsepar-stage__table-wrap">
          <table className="rahsepar-stage__table">
            <thead>
              <tr>
                <th>ردیف</th>
                <th>شرح کالا</th>
                <th>ضخامت و ابعاد</th>
                <th>وزن نهایی باسکول (کیلوگرم)</th>
                <th>
                  هزینه انبارداری/باسکول (ریال)
                  <span className="rahsepar-stage__th-hint">
                    (پرداخت توسط راننده - صرفاً جهت اطلاع مشتری)
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loadLines.map((line, index) => (
                <tr key={line.id}>
                  <td className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>
                  <td>{line.name}</td>
                  <td className="font-yekan">{line.thicknessDims}</td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="rahsepar-stage__cell-input font-yekan"
                      value={line.scaleWeight}
                      onChange={(event) => updateLine(line.id, 'scaleWeight', event.target.value)}
                      placeholder="۰"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="rahsepar-stage__cell-input font-yekan"
                      value={line.warehouseFee}
                      onChange={(event) => updateLine(line.id, 'warehouseFee', event.target.value)}
                      placeholder="۰"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="rahsepar-stage__footer">
        {!isQcComplete && (
          <p className="rahsepar-stage__qc-warning" role="status">
            ⚠️ چاپ حواله خروج منوط به تأیید نهایی کنترل کیفیت (QC) تمامی اقلام است.
          </p>
        )}

        <div className="rahsepar-stage__actions">
          <button
            type="button"
            className="rahsepar-stage__print-btn"
            disabled={!isQcComplete}
            onClick={handlePrint}
            title={!isQcComplete ? 'تأیید QC همه اقلام الزامی است' : undefined}
          >
            چاپ پکینگ‌لیست و حواله خروج
          </button>

          <div className="rahsepar-stage__upload">
            <button
              type="button"
              className="rahsepar-stage__upload-btn"
              onClick={() => uploadRef.current?.click()}
            >
              <UploadIcon />
              آپلود حواله خروج امضاشده
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept="image/*,.pdf"
              className="rahsepar-stage__file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                const name = file ? file.name : '';
                setSignedVoucherName(name);
                persistLogistics({ signedVoucherName: name });
              }}
            />
            {signedVoucherName && (
              <span className="rahsepar-stage__upload-name">{signedVoucherName}</span>
            )}
          </div>
        </div>
      </footer>
    </section>
  );
}
