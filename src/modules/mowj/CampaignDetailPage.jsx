import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  History,
  Pencil,
  PlayCircle,
  Waves,
} from 'lucide-react';
import {
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_LABELS,
  EXECUTION_STATUS_LABELS,
} from './domain';
import {
  prepareCampaignExecution,
  saveCampaign,
  useCampaignDetail,
} from './services/campaignFacade';
import CampaignBuilderDrawer from './CampaignBuilderDrawer';
import './mowj.css';

const ICON = { size: 16, strokeWidth: 1.75 };

function StatusBadge({ status, kind = 'campaign' }) {
  const labels = kind === 'execution' ? EXECUTION_STATUS_LABELS : CAMPAIGN_STATUS_LABELS;
  const label = labels[status] || status;
  const tone = String(status || '').toLowerCase();
  return <span className={`mowj-status mowj-status--${tone}`}>{label}</span>;
}

function DetailField({ label, children }) {
  return (
    <div className="mowj-detail-field">
      <dt className="font-meem">{label}</dt>
      <dd className="font-meem">{children || '—'}</dd>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const detail = useCampaignDetail(campaignId);
  const [editOpen, setEditOpen] = useState(false);
  const [flash, setFlash] = useState(null);
  const historyRef = useRef(null);

  const campaign = detail?.campaign || null;
  const executions = detail?.executions || [];

  const handlePrepare = () => {
    if (!campaign) return;
    const result = prepareCampaignExecution(campaign.id);
    if (!result.ok) {
      setFlash({ tone: 'danger', text: result.error || 'آماده‌سازی ناموفق بود.' });
      return;
    }
    setFlash({
      tone: 'success',
      text: `اجرای ${result.execution.runNumber.toLocaleString('fa-IR')} آماده‌شد (هدف: ${result.execution.targetCount.toLocaleString('fa-IR')} مخاطب). ارسال کانال انجام نشد.`,
    });
    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleEditSave = (draft) => {
    if (!campaign) return;
    saveCampaign({
      ...campaign,
      ...draft,
      id: campaign.id,
      status: campaign.status,
    });
    setEditOpen(false);
    setFlash({ tone: 'success', text: 'اطلاعات کمپین به‌روز شد.' });
  };

  const editInitial = useMemo(() => {
    if (!campaign) return null;
    return {
      name: campaign.name,
      description: campaign.description || '',
      purpose: campaign.purpose,
      campaignType: campaign.campaignType,
      executionChannelId: campaign.executionChannelId,
      triggerRuleId: campaign.triggerRule?.id,
      kpiMetricKey: campaign.kpiDefinition?.metricKey,
      surveyFormId: campaign.surveyFormId,
      audienceSegmentId: campaign.audienceSegmentId || null,
      actionType: campaign.action?.actionType || null,
      templateId: campaign.action?.templateId || null,
    };
  }, [campaign]);

  if (!campaign) {
    return (
      <div className="module-page mowj-page" data-module="mowj" dir="rtl">
        <div className="mowj-detail-empty glass-panel">
          <p className="font-meem">کمپین یافت نشد.</p>
          <button type="button" className="mowj-btn mowj-btn--ghost" onClick={() => navigate('/mowj')}>
            بازگشت به فهرست
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page mowj-page mowj-detail-page" data-module="mowj" dir="rtl">
      <header className="mowj-detail-hero glass-panel">
        <button
          type="button"
          className="mowj-btn mowj-btn--ghost mowj-detail-back"
          onClick={() => navigate('/mowj')}
        >
          <ArrowRight {...ICON} aria-hidden="true" />
          بازگشت
        </button>
        <div className="mowj-detail-hero__main">
          <div className="mowj-detail-hero__title-row">
            <Waves {...ICON} aria-hidden="true" />
            <h1 className="font-meem">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          {campaign.description ? (
            <p className="mowj-detail-hero__desc font-meem">{campaign.description}</p>
          ) : null}
        </div>
        <div className="mowj-detail-actions">
          <button
            type="button"
            className="mowj-btn mowj-btn--ghost"
            onClick={() => setEditOpen(true)}
            disabled={campaign.status === CAMPAIGN_STATUS.CANCELLED}
          >
            <Pencil {...ICON} aria-hidden="true" />
            ویرایش
          </button>
          <button
            type="button"
            className="mowj-btn mowj-btn--launch"
            onClick={handlePrepare}
            disabled={!detail.canPrepareExecution}
            title={!detail.canPrepareExecution ? 'در این وضعیت آماده‌سازی مجاز نیست' : undefined}
          >
            <PlayCircle {...ICON} aria-hidden="true" />
            آماده‌سازی اجرا
          </button>
          <button
            type="button"
            className="mowj-btn mowj-btn--ghost"
            onClick={() => historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <History {...ICON} aria-hidden="true" />
            مشاهده تاریخچه
          </button>
        </div>
      </header>

      {flash ? (
        <div
          className={`mowj-detail-flash mowj-detail-flash--${flash.tone} font-meem`}
          role="status"
        >
          {flash.text}
        </div>
      ) : null}

      <section className="mowj-detail-grid" aria-label="اطلاعات کمپین">
        <article className="mowj-detail-card glass-panel">
          <h2 className="mowj-detail-card__title font-meem">اطلاعات کمپین</h2>
          <dl className="mowj-detail-dl">
            <DetailField label="هدف">{campaign.purposeLabel}</DetailField>
            <DetailField label="نوع">{campaign.campaignTypeLabel}</DetailField>
            <DetailField label="کانال">{campaign.channelLabel}</DetailField>
            <DetailField label="KPI هدف">{campaign.kpiLabel}</DetailField>
            <DetailField label="مالک">{campaign.owner?.name}</DetailField>
            <DetailField label="بازه">
              {[campaign.startDate, campaign.endDate].filter(Boolean).join(' — ') || '—'}
            </DetailField>
          </dl>
        </article>

        <article className="mowj-detail-card glass-panel" aria-label="مخاطب">
          <h2 className="mowj-detail-card__title font-meem">مخاطب</h2>
          <dl className="mowj-detail-dl">
            <DetailField label="سگمنت">
              {campaign.audienceSegmentName || detail.audience?.name}
            </DetailField>
            <DetailField label="منبع">{detail.audience?.source}</DetailField>
            <DetailField label="قانون">
              {campaign.audienceSegmentSummary || detail.audience?.rule}
            </DetailField>
            <DetailField label="تخمین تعداد">
              <span className="font-yekan">
                {(detail.audience?.estimatedCount ?? 0).toLocaleString('fa-IR')}
              </span>
            </DetailField>
          </dl>
        </article>

        <article className="mowj-detail-card glass-panel" aria-label="تریگر">
          <h2 className="mowj-detail-card__title font-meem">تریگر</h2>
          <dl className="mowj-detail-dl">
            <DetailField label="رویداد">{detail.trigger?.event}</DetailField>
            <DetailField label="شرط">{detail.trigger?.condition}</DetailField>
            <DetailField label="تأخیر">{detail.trigger?.delay}</DetailField>
          </dl>
        </article>

        <article className="mowj-detail-card glass-panel" aria-label="اقدام">
          <h2 className="mowj-detail-card__title font-meem">اقدام</h2>
          <dl className="mowj-detail-dl">
            <DetailField label="نوع اقدام">{detail.action?.actionTypeLabel}</DetailField>
            <DetailField label="قالب">{detail.action?.templateName}</DetailField>
            <DetailField label="نسخه قالب">
              {detail.action?.templateVersion != null ? (
                <span className="font-yekan">
                  v{Number(detail.action.templateVersion).toLocaleString('fa-IR')}
                </span>
              ) : '—'}
            </DetailField>
            <DetailField label="نوع قالب">{detail.action?.templateTypeLabel}</DetailField>
            <DetailField label="پیکربندی">{detail.action?.configurationSummary}</DetailField>
          </dl>
        </article>

        <article className="mowj-detail-card glass-panel" aria-label="نتایج کمپین">
          <h2 className="mowj-detail-card__title font-meem">نتایج کمپین</h2>
          <p className="mowj-detail-hint font-meem">
            فقط از attribution رویدادهای واقعی ERP — بدون متریک ساختگی و بدون تبلیغات خارجی.
          </p>
          {detail.results?.hasData ? (
            <dl className="mowj-detail-dl mowj-results-dl">
              <DetailField label="هدف (مخاطب)">
                {detail.results.targetContacts != null ? (
                  <span className="font-yekan">
                    {Number(detail.results.targetContacts).toLocaleString('fa-IR')}
                  </span>
                ) : '—'}
              </DetailField>
              <DetailField label="سرنخ تولیدشده">
                <span className="font-yekan">
                  {Number(detail.results.leadsGenerated || 0).toLocaleString('fa-IR')}
                </span>
              </DetailField>
              <DetailField label="فرصت‌ها">
                <span className="font-yekan">
                  {Number(detail.results.opportunitiesCreated || 0).toLocaleString('fa-IR')}
                </span>
              </DetailField>
              <DetailField label="سفارش‌ها">
                <span className="font-yekan">
                  {Number(detail.results.ordersGenerated || 0).toLocaleString('fa-IR')}
                </span>
              </DetailField>
              {campaign.purpose === 'RETENTION' ? (
                <>
                  <DetailField label="پاسخ نظرسنجی">
                    <span className="font-yekan">
                      {Number(detail.results.surveyResponses || 0).toLocaleString('fa-IR')}
                    </span>
                  </DetailField>
                  <DetailField label="پیگیری تکمیل‌شده">
                    <span className="font-yekan">
                      {Number(detail.results.completedFollowUps || 0).toLocaleString('fa-IR')}
                    </span>
                  </DetailField>
                </>
              ) : null}
            </dl>
          ) : (
            <p className="mowj-results-empty font-meem">
              هنوز نتیجه‌ای ثبت نشده است. نتایج فقط پس از attribution رویدادهای کسب‌وکار نمایش داده می‌شوند.
            </p>
          )}
        </article>

        <article className="mowj-detail-card glass-panel" aria-label="وضعیت کانال">
          <h2 className="mowj-detail-card__title font-meem">وضعیت کانال</h2>
          <p className="mowj-detail-hint font-meem">
            معماری آداپتر — بدون ارسال واقعی و بدون دکمه ارسال.
          </p>
          <dl className="mowj-detail-dl">
            <DetailField label="کانال">{detail.channel?.channelLabel || campaign.channelLabel}</DetailField>
            <DetailField label="وضعیت">
              <span
                className={`mowj-channel-status mowj-channel-status--${String(detail.channel?.status || 'NOT_CONFIGURED').toLowerCase()}`}
              >
                {detail.channel?.statusLabel || 'پیکربندی نشده'}
              </span>
            </DetailField>
          </dl>
        </article>

        <article className="mowj-detail-card glass-panel" aria-label="وضعیت اتوماسیون">
          <h2 className="mowj-detail-card__title font-meem">وضعیت اتوماسیون</h2>
          <p className="mowj-detail-hint font-meem">
            لایه تصمیم داخلی — بدون ارسال کانال و بدون دکمه اجرای خارجی.
          </p>
          <ul className="mowj-automation-status font-meem">
            <li className={detail.automation?.triggerConfigured ? 'is-ready' : 'is-pending'}>
              <span className="mowj-automation-status__dot" aria-hidden="true" />
              {detail.automation?.labels?.triggerConfigured || 'تریگر'}
            </li>
            <li className={detail.automation?.actionConfigured ? 'is-ready' : 'is-pending'}>
              <span className="mowj-automation-status__dot" aria-hidden="true" />
              {detail.automation?.labels?.actionConfigured || 'اقدام'}
            </li>
            <li className={detail.automation?.readyForAutomation ? 'is-ready' : 'is-pending'}>
              <span className="mowj-automation-status__dot" aria-hidden="true" />
              {detail.automation?.labels?.readyForAutomation || 'اتوماسیون'}
            </li>
          </ul>
        </article>

        <article className="mowj-detail-card glass-panel" aria-label="تاریخچه Executor">
          <header className="mowj-detail-card__head">
            <h2 className="mowj-detail-card__title font-meem">وضعیت اجرای Intent</h2>
            <span className="mowj-table-count font-yekan">
              {(detail.executorHistory || []).length.toLocaleString('fa-IR')}
            </span>
          </header>
          <p className="mowj-detail-hint font-meem">
            مصرف Intent توسط لایه Executor — فقط اقدام داخلی پویش؛ بدون دکمه اجرای دستی.
          </p>
          <div className="mowj-table-scroll">
            <table className="jarian-table mowj-table">
              <thead>
                <tr>
                  <th>ردیف</th>
                  <th>اقدام</th>
                  <th>رویداد</th>
                  <th>وضعیت</th>
                  <th>وظیفه ایجادشده</th>
                  <th>اختصاص‌یافته</th>
                </tr>
              </thead>
              <tbody>
                {(detail.executorHistory || []).map((row, index) => (
                  <tr key={row.id}>
                    <td className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>
                    <td className="font-meem">{row.actionTypeLabel}</td>
                    <td className="font-meem">{row.triggerEvent}</td>
                    <td>
                      <span className={`mowj-pipeline mowj-pipeline--${String(row.pipelineStatus || '').toLowerCase()}`}>
                        {row.pipelineStatusLabel}
                      </span>
                    </td>
                    <td className="font-meem">
                      {row.taskId && row.pooyeshHref ? (
                        <Link className="mowj-task-link" to={row.pooyeshHref}>
                          شماره وظیفه:
                          {' '}
                          <span className="font-yekan">{row.taskId}</span>
                        </Link>
                      ) : (row.referenceId || '—')}
                    </td>
                    <td className="font-meem">{row.assignedToLabel || '—'}</td>
                  </tr>
                ))}
                {!(detail.executorHistory || []).length ? (
                  <tr>
                    <td colSpan={6} className="mowj-empty font-meem">
                      هنوز Intent اجرایی ثبت نشده است.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="mowj-detail-card glass-panel" ref={historyRef} id="execution-history">
          <header className="mowj-detail-card__head">
            <h2 className="mowj-detail-card__title font-meem">تاریخچه اجرا</h2>
            <span className="mowj-table-count font-yekan">
              {executions.length.toLocaleString('fa-IR')}
            </span>
          </header>
          <p className="mowj-detail-hint font-meem">
            شمارنده‌ها فقط پس از اجرای واقعی ثبت می‌شوند — بدون ارسال کانال خارجی.
          </p>
          <div className="mowj-table-scroll">
            <table className="jarian-table mowj-table">
              <thead>
                <tr>
                  <th>ردیف</th>
                  <th>شماره اجرا</th>
                  <th>تاریخ</th>
                  <th>هدف (مخاطب)</th>
                  <th>کانال</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((run, index) => (
                  <tr key={run.id}>
                    <td className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>
                    <td className="font-meem">{run.runLabel}</td>
                    <td className="font-yekan">{run.runDate || '—'}</td>
                    <td className="font-yekan">{Number(run.targetCount || 0).toLocaleString('fa-IR')}</td>
                    <td className="font-meem">{run.channelLabel}</td>
                    <td><StatusBadge status={run.status} kind="execution" /></td>
                  </tr>
                ))}
                {!executions.length ? (
                  <tr>
                    <td colSpan={6} className="mowj-empty font-meem">
                      هنوز اجرایی ثبت نشده است. با «آماده‌سازی اجرا» اسنپ‌شات مخاطب و رکورد اجرا ساخته می‌شود.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {editOpen ? (
        <CampaignBuilderDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onActivate={handleEditSave}
          initialDraft={editInitial}
          mode="edit"
        />
      ) : null}
    </div>
  );
}
