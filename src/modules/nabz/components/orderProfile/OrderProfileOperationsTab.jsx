import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ORDER_TABS, STAGE_SARANJAM_ID } from '../../config';
import { formatAmountRial } from '../../orderCode';
import MoneyInput from '../MoneyInput';
import { ORDER_SUCCESS_COLOR } from '../../phase2Config';
import {
  OPERATIONAL_PHASE_META,
} from '../../phase2Config';
import {
  appendFinanceRecord,
  appendFreightRecord,
  appendSupplyDoc,
  getOrderFinanceRecords,
  getOrderFreightRecords,
  getOrderSupplyDocs,
} from '../../operationalRecordsService';
import {
  advanceToNextOperationalPhase,
  getOrderOperationalPhase,
  isOrderInPhase2,
} from '../../phase2Service';
import { OPERATIONAL_PHASES } from '../../phase2Config';
import ParvaneStagePanel from './operations/ParvaneStagePanel';
import TadarokStagePanel from './operations/TadarokStagePanel';
import TajhizStagePanel from './operations/TajhizStagePanel';
import RahseparStagePanel from './operations/RahseparStagePanel';

function FlatField({ label, children }) {
  return (
    <label className="ops-flat-field">
      <span className="ops-flat-field__label">{label}</span>
      {children}
    </label>
  );
}

function SectionCard({ title, description, children, action }) {
  return (
    <section className="ops-section">
      <header className="ops-section__head">
        <div>
          <h3 className="ops-section__title">{title}</h3>
          {description && <p className="ops-section__desc">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export default function OrderProfileOperationsTab({
  order,
  operationalViewPhase,
  onUpdateOrder,
  onOperationalPhaseChange,
  onReturnToGateway,
}) {
  const [docTitle, setDocTitle] = useState('');
  const [docFile, setDocFile] = useState('');
  const [carrier, setCarrier] = useState('');
  const [plate, setPlate] = useState('');
  const [destination, setDestination] = useState('');
  const [financeType, setFinanceType] = useState('پیش‌دریافت');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeMethod, setFinanceMethod] = useState('حواله بانکی');
  const [financeRef, setFinanceRef] = useState('');

  const inPhase2 = isOrderInPhase2(order);
  const currentPhase = getOrderOperationalPhase(order);
  const phaseMeta = OPERATIONAL_PHASE_META[operationalViewPhase || currentPhase];
  const supplyDocs = getOrderSupplyDocs(order);
  const freightRecords = getOrderFreightRecords(order);
  const financeRecords = getOrderFinanceRecords(order);

  const handleAdvanceStage = () => {
    const result = advanceToNextOperationalPhase(order);
    if (!result.accepted) {
      window.alert(result.reason || 'امکان تغییر مرحله وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    onOperationalPhaseChange?.(getOrderOperationalPhase(result.order));
  };

  if (order.status !== ORDER_TABS.SUCCESS) {
    return null;
  }

  const activePhase = operationalViewPhase || currentPhase;

  if (activePhase === OPERATIONAL_PHASES.PARVANE) {
    return (
      <ParvaneStagePanel
        order={order}
        operationalViewPhase={activePhase}
        onUpdateOrder={onUpdateOrder}
        onOperationalPhaseChange={onOperationalPhaseChange}
        onReturnToGateway={onReturnToGateway}
      />
    );
  }

  if (activePhase === OPERATIONAL_PHASES.TADAROK) {
    return (
      <TadarokStagePanel
        order={order}
        operationalViewPhase={activePhase}
        onUpdateOrder={onUpdateOrder}
        onOperationalPhaseChange={onOperationalPhaseChange}
        compact={false}
      />
    );
  }

  if (activePhase === OPERATIONAL_PHASES.TAJHIZ) {
    return (
      <TajhizStagePanel
        order={order}
        operationalViewPhase={activePhase}
        onUpdateOrder={onUpdateOrder}
        onOperationalPhaseChange={onOperationalPhaseChange}
        compact={false}
      />
    );
  }

  if (activePhase === OPERATIONAL_PHASES.RAHESPAR) {
    return (
      <RahseparStagePanel
        order={order}
        onUpdateOrder={onUpdateOrder}
        onOperationalPhaseChange={onOperationalPhaseChange}
        compact={false}
      />
    );
  }

  return (
    <div className="ops-panel">
      <header className="ops-panel__hero">
        <div>
          <span className="ops-panel__status" style={{ '--ops-success': ORDER_SUCCESS_COLOR }}>
            وضعیت کلی: موفق
          </span>
          <h2 className="ops-panel__title">
            فاز عملیات —
            {' '}
            {phaseMeta.label}
          </h2>
          <p className="ops-panel__subtitle">{phaseMeta.subtitle}</p>
        </div>
        {inPhase2 && operationalViewPhase === currentPhase && order.stageId < STAGE_SARANJAM_ID && (
          <button
            type="button"
            className="btn btn--primary btn--glow"
            onClick={handleAdvanceStage}
          >
            ثبت پیشرفت به مرحله بعد ➔
          </button>
        )}
      </header>

      <div className="ops-panel__links">
        {order.customerId && (
          <Link to="/kanoon" className="ops-panel__link">
            مشاهده پرونده مشتری
          </Link>
        )}
        <Link to="/nabz" className="ops-panel__link">
          بازگشت به کانبان موفق
        </Link>
      </div>

      <SectionCard
        title="پیوست‌های اسنادی / مجوز تأمین"
        description="اسناد پروانه، مجوز خرید و معرفی‌نامه‌های انبار"
      >
        <ul className="ops-records">
          {supplyDocs.map((doc) => (
            <li key={doc.id} className="ops-record">
              <div>
                <strong>{doc.title}</strong>
                <span className="ops-record__meta">
                  {doc.fileName}
                  {' · '}
                  {doc.uploadedBy}
                  {' · '}
                  {doc.uploadedAt}
                </span>
              </div>
              <span className="ops-record__badge">{doc.status}</span>
            </li>
          ))}
        </ul>
        <form
          className="ops-flat-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!docTitle.trim()) return;
            onUpdateOrder?.((current) => appendSupplyDoc(current, {
              title: docTitle,
              fileName: docFile,
            }));
            setDocTitle('');
            setDocFile('');
          }}
        >
          <div className="ops-flat-form__grid">
            <FlatField label="عنوان سند">
              <input
                className="ops-flat-input"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="مثلاً مجوز تأمین"
              />
            </FlatField>
            <FlatField label="نام فایل">
              <input
                className="ops-flat-input"
                value={docFile}
                onChange={(e) => setDocFile(e.target.value)}
                placeholder="file.pdf"
              />
            </FlatField>
          </div>
          <button type="submit" className="btn btn--outline">افزودن سند</button>
        </form>
      </SectionCard>

      <SectionCard
        title="سوابق باربری"
        description="رهسپاری، حمل و تحویل کالا"
      >
        <ul className="ops-records">
          {freightRecords.map((record) => (
            <li key={record.id} className="ops-record">
              <div>
                <strong>{record.carrier}</strong>
                <span className="ops-record__meta">
                  {record.plate}
                  {' → '}
                  {record.destination}
                  {' · '}
                  {record.departedAt}
                </span>
              </div>
              <span className="ops-record__badge">{record.status}</span>
            </li>
          ))}
        </ul>
        <form
          className="ops-flat-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!carrier.trim()) return;
            onUpdateOrder?.((current) => appendFreightRecord(current, {
              carrier,
              plate,
              destination,
            }));
            setCarrier('');
            setPlate('');
            setDestination('');
          }}
        >
          <div className="ops-flat-form__grid">
            <FlatField label="باربری">
              <input className="ops-flat-input" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            </FlatField>
            <FlatField label="پلاک / شماره">
              <input className="ops-flat-input" value={plate} onChange={(e) => setPlate(e.target.value)} />
            </FlatField>
            <FlatField label="مقصد">
              <input className="ops-flat-input" value={destination} onChange={(e) => setDestination(e.target.value)} />
            </FlatField>
          </div>
          <button type="submit" className="btn btn--outline">ثبت باربری</button>
        </form>
      </SectionCard>

      <SectionCard
        title="سوابق مالی"
        description="پرداخت‌ها، تسویه‌ها و پیگیری مالی فاز عملیات"
      >
        <ul className="ops-records">
          {financeRecords.map((record) => (
            <li key={record.id} className="ops-record">
              <div>
                <strong>{record.type}</strong>
                <span className="ops-record__meta">
                  {formatAmountRial(record.amountRial)}
                  {' ریال · '}
                  {record.method}
                  {' · '}
                  {record.reference}
                  {' · '}
                  {record.at}
                </span>
              </div>
              <span className="ops-record__badge">{record.status}</span>
            </li>
          ))}
        </ul>
        <form
          className="ops-flat-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!financeType.trim()) return;
            onUpdateOrder?.((current) => appendFinanceRecord(current, {
              type: financeType,
              amountRial: financeAmount,
              method: financeMethod,
              reference: financeRef,
            }));
            setFinanceAmount('');
            setFinanceRef('');
          }}
        >
          <div className="ops-flat-form__grid">
            <FlatField label="نوع تراکنش">
              <input className="ops-flat-input" value={financeType} onChange={(e) => setFinanceType(e.target.value)} />
            </FlatField>
            <FlatField label="مبلغ (ریال)">
              <MoneyInput
                className="ops-flat-input"
                value={financeAmount}
                onChange={setFinanceAmount}
              />
            </FlatField>
            <FlatField label="روش پرداخت">
              <input className="ops-flat-input" value={financeMethod} onChange={(e) => setFinanceMethod(e.target.value)} />
            </FlatField>
            <FlatField label="شماره مرجع">
              <input className="ops-flat-input" value={financeRef} onChange={(e) => setFinanceRef(e.target.value)} />
            </FlatField>
          </div>
          <button type="submit" className="btn btn--outline">ثبت سابقه مالی</button>
        </form>
      </SectionCard>
    </div>
  );
}
