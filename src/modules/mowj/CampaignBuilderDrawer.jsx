import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Filter,
  Zap,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Users,
  Sparkles,
  Plus,
} from 'lucide-react';
import {
  CAMPAIGN_ACTION_TYPE_LABELS,
  CAMPAIGN_PURPOSE,
  CAMPAIGN_PURPOSE_LABELS,
  CAMPAIGN_TYPE,
  CAMPAIGN_TYPE_LABELS,
  EXECUTION_CHANNELS,
  TEMPLATE_TYPE,
  TRIGGER_RULE_CATALOG,
  buildTriggerRule,
  createCampaignDraft,
  getCompatibleTemplateType,
  getDefaultActionTypeForCampaign,
  listKpiDefinitionsForPurpose,
  normalizeCampaignAction,
} from './domain';
import { listSegments, listTemplates } from './services/campaignFacade';
import AudienceBuilderDrawer from './AudienceBuilderDrawer';
import TemplateQuickCreateDrawer from './TemplateQuickCreateDrawer';
import SurveyFormCreateDrawer from './SurveyFormCreateDrawer';
import { SURVEY_FORMS } from './surveyForms';

const ICON = { size: 16, strokeWidth: 1.75 };

const STEPS = [
  { id: 1, title: 'هدف و شرط', subtitle: 'نگهداشت / جذب و رویداد آغازگر', Icon: Filter },
  { id: 2, title: 'نوع و کانال', subtitle: 'نوع کمپین و کانال اجرا', Icon: Zap },
  { id: 3, title: 'مخاطب', subtitle: 'انتخاب مخاطب هدف', Icon: Users },
  { id: 4, title: 'انتخاب اقدام', subtitle: 'اقدام و قالب اجرا', Icon: Sparkles },
  { id: 5, title: 'بازبینی', subtitle: 'نام، KPI و ثبت', Icon: ClipboardCheck },
];

const DEFAULT_TEMPLATE_BY_ACTION = Object.freeze({
  BROADCAST_MESSAGE: 'tpl-msg-inventory',
  SURVEY_REQUEST: 'tpl-survey-delivery',
  CREATE_TASK: 'tpl-task-call',
  PHYSICAL_DELIVERY: 'tpl-physical-gift',
});

function OptionCard({ selected, title, hint, onClick }) {
  return (
    <button
      type="button"
      className={`mowj-option${selected ? ' is-selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="mowj-option__body">
        <span className="mowj-option__title font-meem">{title}</span>
        {hint ? <span className="mowj-option__hint">{hint}</span> : null}
      </span>
      {selected ? (
        <span className="mowj-option__check" aria-hidden="true">
          <Check size={14} strokeWidth={2} />
        </span>
      ) : null}
    </button>
  );
}

function draftFromEmpty() {
  const base = createCampaignDraft({ name: 'پیش‌نویس' }) || createCampaignDraft();
  if (!base) {
    return {
      name: '',
      description: '',
      purpose: CAMPAIGN_PURPOSE.RETENTION,
      campaignType: CAMPAIGN_TYPE.SURVEY,
      executionChannelId: 'WHATSAPP',
      triggerRuleId: TRIGGER_RULE_CATALOG[0]?.id,
      kpiMetricKey: 'SURVEY_RESPONSES',
      surveyFormId: SURVEY_FORMS[0]?.id,
      audienceSegmentId: null,
      actionType: getDefaultActionTypeForCampaign(CAMPAIGN_TYPE.SURVEY),
      templateId: DEFAULT_TEMPLATE_BY_ACTION.SURVEY_REQUEST,
    };
  }
  const actionType = getDefaultActionTypeForCampaign(base.campaignType);
  return {
    name: '',
    description: '',
    purpose: base.purpose,
    campaignType: base.campaignType,
    executionChannelId: base.executionChannelId,
    triggerRuleId: base.triggerRule?.id || TRIGGER_RULE_CATALOG[0].id,
    kpiMetricKey: base.kpiDefinition?.metricKey || 'SURVEY_RESPONSES',
    surveyFormId: base.surveyFormId,
    audienceSegmentId: null,
    actionType,
    templateId: actionType ? DEFAULT_TEMPLATE_BY_ACTION[actionType] : null,
  };
}

export default function CampaignBuilderDrawer({
  open,
  onClose,
  onActivate,
  initialDraft = null,
  mode = 'create',
}) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(draftFromEmpty);
  const [segmentBuilderOpen, setSegmentBuilderOpen] = useState(false);
  const [templateBuilderOpen, setTemplateBuilderOpen] = useState(false);
  const [surveyBuilderOpen, setSurveyBuilderOpen] = useState(false);
  const [segmentTick, setSegmentTick] = useState(0);
  const [templateTick, setTemplateTick] = useState(0);
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (!open) return undefined;
    setStep(1);
    setDraft(initialDraft ? { ...draftFromEmpty(), ...initialDraft } : draftFromEmpty());
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, initialDraft]);

  const kpiOptions = useMemo(
    () => listKpiDefinitionsForPurpose(draft.purpose),
    [draft.purpose],
  );

  const segments = useMemo(
    () => listSegments({ selectableOnly: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segmentTick, open],
  );

  const selectedSegment = useMemo(
    () => segments.find((row) => row.id === draft.audienceSegmentId) || null,
    [segments, draft.audienceSegmentId],
  );

  const actionType = draft.actionType || getDefaultActionTypeForCampaign(draft.campaignType);
  const templateType = actionType ? getCompatibleTemplateType(actionType) : null;
  const templates = useMemo(
    () => (templateType
      ? listTemplates({ type: templateType, selectableOnly: true })
      : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templateType, templateTick],
  );

  const needsAction = Boolean(actionType);
  const canNext = useMemo(() => {
    if (step === 1) return Boolean(draft.purpose && draft.triggerRuleId);
    if (step === 2) return Boolean(draft.campaignType);
    if (step === 3) return Boolean(draft.audienceSegmentId);
    if (step === 4) {
      if (!needsAction) return true;
      return Boolean(draft.templateId);
    }
    return Boolean(draft.name.trim() && draft.kpiMetricKey);
  }, [step, draft, needsAction]);

  if (!open) return null;

  const patch = (partial) => setDraft((prev) => ({ ...prev, ...partial }));

  const handleCampaignTypeChange = (type) => {
    const nextAction = getDefaultActionTypeForCampaign(type);
    patch({
      campaignType: type,
      actionType: nextAction,
      templateId: nextAction ? DEFAULT_TEMPLATE_BY_ACTION[nextAction] : null,
      surveyFormId: type === CAMPAIGN_TYPE.SURVEY
        ? (draft.surveyFormId || SURVEY_FORMS[0].id)
        : null,
    });
  };

  const handleActivate = () => {
    if (!draft.name.trim()) return;
    const kpi = kpiOptions.find((item) => item.metricKey === draft.kpiMetricKey) || kpiOptions[0];
    const resolvedActionType = draft.actionType || getDefaultActionTypeForCampaign(draft.campaignType);
    const action = resolvedActionType
      ? normalizeCampaignAction({
        actionType: resolvedActionType,
        templateId: draft.templateId,
        configuration: resolvedActionType === 'SURVEY_REQUEST'
          ? { surveyFormId: draft.surveyFormId || templates.find((t) => t.id === draft.templateId)?.content?.surveyFormId }
          : {},
      })
      : null;

    onActivate({
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      purpose: draft.purpose,
      campaignType: draft.campaignType,
      executionChannelId: draft.executionChannelId || null,
      triggerRule: buildTriggerRule(draft.triggerRuleId),
      kpiDefinition: kpi ? { ...kpi } : null,
      surveyFormId: draft.campaignType === CAMPAIGN_TYPE.SURVEY ? draft.surveyFormId : null,
      audienceSegmentId: draft.audienceSegmentId,
      action,
      status: isEdit ? undefined : 'READY',
    });
  };

  return createPortal(
    <div className="mowj-drawer-root" dir="rtl">
      <button type="button" className="mowj-drawer-backdrop" aria-label="بستن" onClick={onClose} />
      <aside className="mowj-drawer" role="dialog" aria-modal="true" aria-label={isEdit ? 'ویرایش کمپین' : 'ایجاد کمپین جدید'}>
        <header className="mowj-drawer__head">
          <div>
            <h2 className="mowj-drawer__title font-meem">{isEdit ? 'ویرایش کمپین' : 'ایجاد کمپین جدید'}</h2>
            <p className="mowj-drawer__sub font-meem">موج — نگهداشت و جذب</p>
          </div>
          <button type="button" className="mowj-drawer__close" aria-label="بستن" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <nav className="mowj-steps" aria-label="مراحل ساخت کمپین">
          {STEPS.map(({ id, title, Icon }) => (
            <button
              key={id}
              type="button"
              className={`mowj-steps__item${step === id ? ' is-active' : ''}${step > id ? ' is-done' : ''}`}
              onClick={() => setStep(id)}
            >
              <span className="mowj-steps__num font-yekan">{id.toLocaleString('fa-IR')}</span>
              <Icon {...ICON} aria-hidden="true" />
              <span className="font-meem">{title}</span>
            </button>
          ))}
        </nav>

        <div className="mowj-drawer__body">
          {step === 1 ? (
            <section className="mowj-block">
              <header className="mowj-block__head">
                <Filter {...ICON} aria-hidden="true" />
                <div>
                  <h3 className="font-meem">هدف کمپین</h3>
                  <p>نگهداشت مشتریان فعلی یا جذب سرنخ جدید</p>
                </div>
              </header>
              <div className="mowj-option-grid">
                {Object.values(CAMPAIGN_PURPOSE).map((purpose) => (
                  <OptionCard
                    key={purpose}
                    selected={draft.purpose === purpose}
                    title={CAMPAIGN_PURPOSE_LABELS[purpose]}
                    hint={purpose === CAMPAIGN_PURPOSE.RETENTION
                      ? 'مخاطبین و مشتریان موجود'
                      : 'سرنخ‌ها و مخاطبان جدید'}
                    onClick={() => {
                      const nextKpis = listKpiDefinitionsForPurpose(purpose);
                      patch({
                        purpose,
                        kpiMetricKey: nextKpis[0]?.metricKey || draft.kpiMetricKey,
                      });
                    }}
                  />
                ))}
              </div>

              <header className="mowj-block__head" style={{ marginTop: '1rem' }}>
                <div>
                  <h3 className="font-meem">شرط آغاز (Trigger)</h3>
                  <p>فقط تعریف ساختاری — موتور اتوماسیون هنوز فعال نیست</p>
                </div>
              </header>
              <div className="mowj-option-grid">
                {TRIGGER_RULE_CATALOG.map((rule) => (
                  <OptionCard
                    key={rule.id}
                    selected={draft.triggerRuleId === rule.id}
                    title={rule.label}
                    hint={rule.hint}
                    onClick={() => patch({ triggerRuleId: rule.id })}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="mowj-block">
              <header className="mowj-block__head">
                <Zap {...ICON} aria-hidden="true" />
                <div>
                  <h3 className="font-meem">نوع کمپین</h3>
                  <p>نوع اقدام کسب‌وکاری</p>
                </div>
              </header>
              <div className="mowj-option-grid">
                {Object.values(CAMPAIGN_TYPE).map((type) => (
                  <OptionCard
                    key={type}
                    selected={draft.campaignType === type}
                    title={CAMPAIGN_TYPE_LABELS[type]}
                    hint={type === CAMPAIGN_TYPE.DIGITAL_AD
                      ? 'فقط ثبت رکورد — بدون اتصال API'
                      : undefined}
                    onClick={() => handleCampaignTypeChange(type)}
                  />
                ))}
              </div>

              <div className="mowj-field">
                <label className="font-meem" htmlFor="mowj-channel">کانال اجرا (اختیاری — بدون ارسال)</label>
                <select
                  id="mowj-channel"
                  className="mowj-select"
                  value={draft.executionChannelId || ''}
                  onChange={(e) => patch({ executionChannelId: e.target.value || null })}
                >
                  <option value="">بدون کانال</option>
                  {EXECUTION_CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="mowj-block">
              <header className="mowj-block__head">
                <Users {...ICON} aria-hidden="true" />
                <div>
                  <h3 className="font-meem">مخاطب کمپین</h3>
                  <p>انتخاب سگمنت موجود یا ساخت مخاطب جدید</p>
                </div>
              </header>

              {selectedSegment ? (
                <div className="mowj-audience-target-card">
                  <div className="mowj-audience-target-card__body">
                    <span className="mowj-audience-target-card__label font-meem">مخاطب هدف</span>
                    <strong className="mowj-audience-target-card__name font-meem">
                      {selectedSegment.name}
                    </strong>
                    <span className="mowj-audience-target-card__count font-meem">
                      تعداد:
                      {' '}
                      <strong className="font-yekan">
                        {Number(selectedSegment.estimatedCount || 0).toLocaleString('fa-IR')}
                      </strong>
                      {' '}
                      نفر
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mowj-audience-target-empty font-meem">
                  مخاطب هدف انتخاب نشده است
                </p>
              )}

              <ul className="mowj-segment-pick-list">
                {segments.map((seg) => {
                  const selected = draft.audienceSegmentId === seg.id;
                  return (
                    <li key={seg.id}>
                      <button
                        type="button"
                        className={`mowj-segment-pick${selected ? ' is-selected' : ''}`}
                        onClick={() => patch({ audienceSegmentId: seg.id })}
                      >
                        <span className="mowj-segment-pick__body">
                          <span className="mowj-segment-pick__title font-meem">{seg.name}</span>
                          <span className="mowj-segment-pick__count font-yekan">
                            {Number(seg.estimatedCount || 0).toLocaleString('fa-IR')}
                            {' '}
                            نفر
                          </span>
                        </span>
                        {selected ? (
                          <span className="mowj-segment-pick__check" aria-hidden="true">
                            <Check size={14} strokeWidth={2} />
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mowj-audience-target-actions">
                <button
                  type="button"
                  className="mowj-btn mowj-btn--primary"
                  onClick={() => setSegmentBuilderOpen(true)}
                >
                  <Plus {...ICON} aria-hidden="true" />
                  ساخت مخاطب جدید
                </button>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="mowj-block">
              <header className="mowj-block__head">
                <Sparkles {...ICON} aria-hidden="true" />
                <div>
                  <h3 className="font-meem">انتخاب اقدام</h3>
                  <p>چه اتفاقی پس از هدف‌گیری بیفتد — بدون ارسال کانال</p>
                </div>
              </header>

              {!needsAction ? (
                <p className="mowj-detail-hint font-meem">
                  این نوع کمپین اقدام اجرایی داخلی ندارد (فقط ثبت رکورد).
                </p>
              ) : (
                <>
                  <div className="mowj-field">
                    <span className="font-meem">نوع اقدام</span>
                    <strong className="font-meem">
                      {CAMPAIGN_ACTION_TYPE_LABELS[actionType] || actionType}
                    </strong>
                  </div>

                  <div className="mowj-option-grid">
                    {templates.map((tpl) => (
                      <OptionCard
                        key={tpl.id}
                        selected={draft.templateId === tpl.id}
                        title={tpl.name}
                        hint={tpl.typeLabel}
                        onClick={() => {
                          const next = { templateId: tpl.id };
                          if (tpl.content?.surveyFormId) {
                            next.surveyFormId = tpl.content.surveyFormId;
                          }
                          patch(next);
                        }}
                      />
                    ))}
                  </div>

                  <div className="mowj-audience-target-actions">
                    <button
                      type="button"
                      className="mowj-btn mowj-btn--ghost"
                      onClick={() => {
                        if (templateType === TEMPLATE_TYPE.SURVEY_TEMPLATE) {
                          setSurveyBuilderOpen(true);
                          return;
                        }
                        setTemplateBuilderOpen(true);
                      }}
                    >
                      <Plus {...ICON} aria-hidden="true" />
                      {templateType === TEMPLATE_TYPE.SURVEY_TEMPLATE
                        ? 'ساخت فرم جدید'
                        : 'ساخت قالب جدید'}
                    </button>
                  </div>

                  {actionType === 'CREATE_TASK' ? (
                    <p className="mowj-detail-hint font-meem">
                      اقدام وظیفه فقط قرارداد پویش می‌سازد — تسک مستقیم ایجاد نمی‌شود.
                    </p>
                  ) : null}
                </>
              )}
            </section>
          ) : null}

          {step === 5 ? (
            <section className="mowj-block">
              <header className="mowj-block__head">
                <ClipboardCheck {...ICON} aria-hidden="true" />
                <div>
                  <h3 className="font-meem">بازبینی و KPI هدف</h3>
                  <p>شاخص هدف تعریف می‌شود — بدون عدد ساختگی موفقیت</p>
                </div>
              </header>

              <div className="mowj-field">
                <label className="font-meem" htmlFor="mowj-name">نام کمپین</label>
                <input
                  id="mowj-name"
                  className="mowj-input"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="مثلاً: نظرسنجی پس از ارسال بار"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
              </div>

              <div className="mowj-field">
                <label className="font-meem" htmlFor="mowj-kpi">KPI هدف</label>
                <select
                  id="mowj-kpi"
                  className="mowj-select"
                  value={draft.kpiMetricKey}
                  onChange={(e) => patch({ kpiMetricKey: e.target.value })}
                >
                  {kpiOptions.map((kpi) => (
                    <option key={kpi.metricKey} value={kpi.metricKey}>{kpi.label}</option>
                  ))}
                </select>
              </div>

              <dl className="mowj-summary">
                <div>
                  <dt>هدف</dt>
                  <dd className="font-meem">{CAMPAIGN_PURPOSE_LABELS[draft.purpose]}</dd>
                </div>
                <div>
                  <dt>نوع</dt>
                  <dd className="font-meem">{CAMPAIGN_TYPE_LABELS[draft.campaignType]}</dd>
                </div>
                <div>
                  <dt>مخاطب</dt>
                  <dd className="font-meem">
                    {selectedSegment
                      ? `${selectedSegment.name} (${Number(selectedSegment.estimatedCount || 0).toLocaleString('fa-IR')} نفر)`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>اقدام</dt>
                  <dd className="font-meem">
                    {actionType ? CAMPAIGN_ACTION_TYPE_LABELS[actionType] : '—'}
                  </dd>
                </div>
                <div>
                  <dt>قالب</dt>
                  <dd className="font-meem">
                    {templates.find((t) => t.id === draft.templateId)?.name || '—'}
                  </dd>
                </div>
                <div>
                  <dt>شرط</dt>
                  <dd className="font-meem">
                    {TRIGGER_RULE_CATALOG.find((r) => r.id === draft.triggerRuleId)?.label || '—'}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}
        </div>

        <footer className="mowj-drawer__foot">
          <button
            type="button"
            className="mowj-btn mowj-btn--ghost"
            onClick={() => (step === 1 ? onClose() : setStep((s) => s - 1))}
          >
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            {step === 1 ? 'انصراف' : 'قبلی'}
          </button>

          {step < 5 ? (
            <button
              type="button"
              className="mowj-btn mowj-btn--primary"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
            >
              بعدی
              <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="mowj-btn mowj-btn--launch"
              disabled={!canNext}
              onClick={handleActivate}
            >
              {isEdit ? 'ذخیره تغییرات' : 'ثبت کمپین'}
              <Zap size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </footer>
      </aside>
      <AudienceBuilderDrawer
        open={segmentBuilderOpen}
        onClose={() => setSegmentBuilderOpen(false)}
        onSaved={(saved) => {
          setSegmentTick((n) => n + 1);
          patch({ audienceSegmentId: saved.id });
        }}
      />
      <TemplateQuickCreateDrawer
        open={templateBuilderOpen && Boolean(templateType) && templateType !== TEMPLATE_TYPE.SURVEY_TEMPLATE}
        onClose={() => setTemplateBuilderOpen(false)}
        lockedType={templateType}
        onSaved={(saved) => {
          setTemplateTick((n) => n + 1);
          patch({ templateId: saved.id });
        }}
      />
      <SurveyFormCreateDrawer
        open={surveyBuilderOpen}
        onClose={() => setSurveyBuilderOpen(false)}
        onSaved={(saved) => {
          setTemplateTick((n) => n + 1);
          patch({
            templateId: saved.id,
            surveyFormId: saved.content?.surveyFormId || null,
          });
        }}
      />
    </div>,
    document.body,
  );
}
