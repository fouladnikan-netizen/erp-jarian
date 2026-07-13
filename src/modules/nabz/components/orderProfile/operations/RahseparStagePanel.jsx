import { useMemo, useRef, useState } from 'react';
import { getFulfilledPurchaseRows } from '../../../tajhizStageService';
import {
  getQcInspectionForRow,
  getQcRowKey,
  isOrderQcComplete,
} from '../../../qcInspectionConfig';
import { getTodayJalali, getNowTimeFa } from '../../../dateUtils';
import { advanceOperationalPhase, getOrderOperationalPhase } from '../../../phase2Service';
import { OPERATIONAL_PHASES } from '../../../phase2Config';
import PrintableSooratBar, { buildSerial } from './PrintableSooratBar';
import './RahseparStagePanel.css';

const MOCK_LOAD_LINES = [
  {
    id: 'load-1',
    name: 'تیرآهن ۱۸ ذوب آهن',
    thicknessDims: '۱۸۰×۹۱ میلی‌متر / ۱۲ متر',
    notes: '',
    unit: 'کیلوگرم',
    preInvoiceWeightKg: 22000,
    scaleWeight: '',
    warehouseFee: '',
    selected: false,
  },
  {
    id: 'load-2',
    name: 'ورق سیاه ۲ میل',
    thicknessDims: '۲ میلی‌متر / ۱۲۵۰×۲۵۰۰',
    notes: '',
    unit: 'کیلوگرم',
    preInvoiceWeightKg: 8500,
    scaleWeight: '',
    warehouseFee: '',
    selected: false,
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

function formatFaNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('fa-IR');
}

/** Convert order qty/unit to kilograms for pre-invoice weight display. */
function toKilograms(qty, unit = 'تن') {
  const amount = Number(qty) || 0;
  const normalized = String(unit || '').trim();
  if (normalized === 'کیلوگرم' || normalized === 'kg' || normalized === 'KG') return amount;
  if (normalized === 'تن' || normalized === 'تنه') return amount * 1000;
  return amount;
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
      notes: '',
      unit: 'کیلوگرم',
      preInvoiceWeightKg: toKilograms(row.qty, row.unit),
      scaleWeight: '',
      warehouseFee: '',
      selected: false,
    };
  });
}

export function computeIsQcComplete(order) {
  return isOrderQcComplete(order, getFulfilledPurchaseRows(order));
}

export function getSelectedRahseparLines(lines) {
  return (lines || []).filter((line) => line.selected);
}

export default function RahseparStagePanel({
  order,
  onUpdateOrder,
  onOperationalPhaseChange,
  compact = false,
}) {
  const derivedComplete = useMemo(() => computeIsQcComplete(order), [order]);

  const [qcGateOverride, setQcGateOverride] = useState(null);
  const isQcComplete = qcGateOverride === null ? derivedComplete : qcGateOverride;

  const [driverName, setDriverName] = useState(order?.rahsepar?.driverName || '');
  const [licensePlate, setLicensePlate] = useState(order?.rahsepar?.licensePlate || '');
  const [phone, setPhone] = useState(order?.rahsepar?.phone || '');
  const [carrierName, setCarrierName] = useState(order?.rahsepar?.carrierName || '');
  const [signedVoucherName, setSignedVoucherName] = useState(order?.rahsepar?.signedVoucherName || '');
  const [isDispatchNoteUploaded, setIsDispatchNoteUploaded] = useState(
    Boolean(order?.rahsepar?.isDispatchNoteUploaded || order?.rahsepar?.signedVoucherName),
  );
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const [printMeta, setPrintMeta] = useState(null);
  const [loadLines, setLoadLines] = useState(() => {
    const saved = order?.rahsepar?.loadLines;
    if (Array.isArray(saved) && saved.length) {
      return saved.map((line) => ({
        ...line,
        selected: Boolean(line.selected),
        notes: line.notes || '',
        unit: line.unit || 'کیلوگرم',
        preInvoiceWeightKg: line.preInvoiceWeightKg ?? 0,
      }));
    }
    const fromOrder = order ? buildLoadLinesFromOrder(order) : null;
    return fromOrder || MOCK_LOAD_LINES.map((line) => ({ ...line }));
  });

  const selectedLines = useMemo(
    () => getSelectedRahseparLines(loadLines),
    [loadLines],
  );
  const selectedCount = selectedLines.length;

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2800);
  };

  const updateLine = (id, key, value) => {
    setLoadLines((prev) => prev.map((line) => (
      line.id === id ? { ...line, [key]: value } : line
    )));
  };

  const toggleLineSelected = (id) => {
    setLoadLines((prev) => prev.map((line) => {
      if (line.id !== id) return line;
      const selected = !line.selected;
      return {
        ...line,
        selected,
        ...(selected ? {} : { scaleWeight: '', warehouseFee: '', notes: '' }),
      };
    }));
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
        isDispatchNoteUploaded,
        loadLines,
        ...patch,
      },
    }));
  };

  const handleSimulateSignedUpload = () => {
    const simulatedName = signedVoucherName || 'حواله-خروج-امضاشده.pdf';
    setIsDispatchNoteUploaded(true);
    setSignedVoucherName(simulatedName);
    persistLogistics({
      isDispatchNoteUploaded: true,
      signedVoucherName: simulatedName,
    });
    showToast('حواله امضاشده با موفقیت ثبت شد.');
  };

  const handleAdvanceToSaranjam = () => {
    if (!isDispatchNoteUploaded) return;
    const result = advanceOperationalPhase(order, OPERATIONAL_PHASES.SARANJAM);
    if (!result.accepted) {
      window.alert(result.reason || 'امکان انتقال به سرانجام وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => ({
      ...result.order,
      rahsepar: {
        ...(result.order.rahsepar || {}),
        driverName,
        licensePlate,
        phone,
        carrierName,
        signedVoucherName,
        isDispatchNoteUploaded: true,
        loadLines,
      },
    }));
    onOperationalPhaseChange?.(getOrderOperationalPhase(result.order));
  };

  const handlePrint = () => {
    if (!isQcComplete) return;
    if (!selectedLines.length) {
      showToast('حداقل یک قلم را برای بارگیری این نوبت انتخاب کنید.');
      return;
    }
    const tripIndex = (order?.rahsepar?.printTripCount || 0) + 1;
    const nextMeta = {
      serial: buildSerial(order?.code, tripIndex),
      date: getTodayJalali(),
      time: getNowTimeFa(),
      tripIndex,
    };
    setPrintMeta(nextMeta);
    persistLogistics({
      printedAt: new Date().toISOString(),
      printTripCount: tripIndex,
      lastPrintedLineIds: selectedLines.map((line) => line.id),
      lastPrintMeta: nextMeta,
    });
    document.body.classList.add('rahsepar-printing');
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        document.body.classList.remove('rahsepar-printing');
      }, 300);
    }, 50);
  };

  return (
    <section className={`rahsepar-stage font-meem${compact ? ' rahsepar-stage--compact' : ''}`}>
      <header className="rahsepar-stage__head rahsepar-stage__no-print">
        <div>
          <h2 className="rahsepar-stage__title">رهسپار — بارگیری و حواله خروج</h2>
          <p className="rahsepar-stage__subtitle">
            فقط اقلام انتخاب‌شده در این نوبت بارگیری چاپ می‌شوند؛ چاپ حواله منوط به تأیید QC است
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
              className="rahsepar-stage__input font-meem"
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
              className="rahsepar-stage__input font-meem"
              value={carrierName}
              onChange={(event) => setCarrierName(event.target.value)}
              placeholder="شرکت حمل‌ونقل"
            />
          </label>
        </div>
      </section>

      <section className="rahsepar-stage__table-section" aria-labelledby="rahsepar-load-title">
        <div className="rahsepar-stage__table-head">
          <h3 id="rahsepar-load-title" className="rahsepar-stage__section-title">جدول بارگیری</h3>
          <p className="rahsepar-stage__selection-meta rahsepar-stage__no-print">
            اقلام این نوبت:
            {' '}
            <span className="font-yekan">{selectedCount.toLocaleString('fa-IR')}</span>
            {' '}
            از
            {' '}
            <span className="font-yekan">{loadLines.length.toLocaleString('fa-IR')}</span>
          </p>
        </div>
        <div className="rahsepar-stage__table-wrap">
          <table className="rahsepar-stage__table">
            <thead>
              <tr>
                <th className="rahsepar-stage__col--select rahsepar-stage__no-print" scope="col">
                  <span className="rahsepar-stage__sr-only">انتخاب</span>
                </th>
                <th scope="col">ردیف</th>
                <th scope="col">شرح کالا</th>
                <th scope="col">توضیحات (تعداد/ابعاد)</th>
                <th scope="col">ضخامت و ابعاد</th>
                <th className="rahsepar-stage__col--preinvoice" scope="col">وزن پیش‌فاکتور (کیلوگرم)</th>
                <th scope="col">وزن قطعی باسکول (کیلوگرم)</th>
                <th scope="col">
                  هزینه انبارداری/باسکول (ریال)
                  <span className="rahsepar-stage__th-hint rahsepar-stage__no-print">
                    (پرداخت توسط راننده - صرفاً جهت اطلاع مشتری)
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loadLines.map((line, index) => {
                const selected = Boolean(line.selected);
                return (
                  <tr
                    key={line.id}
                    className={`rahsepar-stage__row${selected ? ' is-selected' : ' is-deselected'}`}
                    data-selected={selected ? 'true' : 'false'}
                  >
                    <td className="rahsepar-stage__col--select rahsepar-stage__no-print">
                      <input
                        type="checkbox"
                        className="rahsepar-stage__checkbox"
                        checked={selected}
                        onChange={() => toggleLineSelected(line.id)}
                        aria-label={`انتخاب ${line.name} برای این نوبت بارگیری`}
                      />
                    </td>
                    <td>
                      <span className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</span>
                    </td>
                    <td className="font-meem">{line.name}</td>
                    <td>
                      <input
                        type="text"
                        className="rahsepar-stage__cell-input rahsepar-stage__cell-input--notes"
                        value={line.notes || ''}
                        onChange={(event) => updateLine(line.id, 'notes', event.target.value)}
                        placeholder="مثلاً ۲ بندل / ۱۲ متر"
                        disabled={!selected}
                        aria-label="توضیحات تعداد و ابعاد"
                      />
                    </td>
                    <td>
                      <span className="font-yekan">{line.thicknessDims}</span>
                    </td>
                    <td className="rahsepar-stage__col--preinvoice">
                      <span className="font-yekan rahsepar-stage__readonly-num">
                        {formatFaNumber(line.preInvoiceWeightKg)}
                      </span>
                    </td>
                    <td>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="rahsepar-stage__cell-input font-yekan"
                        value={line.scaleWeight}
                        onChange={(event) => updateLine(line.id, 'scaleWeight', event.target.value)}
                        placeholder="۰"
                        disabled={!selected}
                        aria-label="وزن قطعی باسکول"
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
                        disabled={!selected}
                        aria-label="هزینه انبارداری یا باسکول"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="rahsepar-stage__footer rahsepar-stage__no-print">
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
              className={`rahsepar-stage__upload-btn${isDispatchNoteUploaded ? ' is-uploaded' : ''}`}
              onClick={handleSimulateSignedUpload}
            >
              <UploadIcon />
              {isDispatchNoteUploaded ? 'حواله امضاشده ثبت شد' : 'آپلود حواله خروج امضاشده'}
            </button>
            {isDispatchNoteUploaded && signedVoucherName && (
              <span className="rahsepar-stage__upload-name">{signedVoucherName}</span>
            )}
          </div>
        </div>

        {isDispatchNoteUploaded && (
          <div className="rahsepar-stage__transition">
            <button
              type="button"
              className="rahsepar-stage__advance-btn"
              onClick={handleAdvanceToSaranjam}
            >
              تأیید خروج ناوگان و انتقال به سرانجام
            </button>
          </div>
        )}
      </footer>

      {toast && (
        <div className="rahsepar-stage__toast rahsepar-stage__no-print" role="status">
          {toast}
        </div>
      )}

      <PrintableSooratBar
        order={order}
        lines={selectedLines}
        logistics={{
          driverName,
          licensePlate,
          phone,
          carrierName,
        }}
        meta={printMeta || order?.rahsepar?.lastPrintMeta || {}}
      />
    </section>
  );
}
