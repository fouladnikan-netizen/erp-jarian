import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Phone,
  Mail,
  Users,
  BookOpen,
  StickyNote,
  Sparkles,
  Calendar,
  Activity,
  CheckSquare,
  Plus,
} from 'lucide-react';
import { useCompany, useCompanies, CONTACT_RECORD_TYPES } from '../kanoon/public/index.js';
import { useActivitiesVersion, useTasksVersion } from './public/index.js';
import { companyReference, ENTITY_REF_TYPE } from '../../domain/entityReference';
import {
  fetchActivityTypes,
  listActiveActivityTypes,
  resolveActivityTypeLabel,
  useActivityTypesVersion,
} from '../../domain/activityTypes/activityTypesFacade.js';
import { mockAiRewrite } from '../../utils/aiRewrite';
import JalaliDatePicker from '../nabz/components/JalaliDatePicker';
import {
  compareJalaliDates,
  getTodayJalali,
  isValidJalaliDate,
  jalaliToGregorian,
  parseJalaliDate,
} from '../nabz/dateUtils';
import { IncompleteCompanyDialog } from '../../components/customerCompletion';
import { evaluateCompanyCompletion } from '../../domain/customerCompletion';
import {
  createActivity,
} from './timeline/companyTimelineFacade';
import { listCompanyInteractions, fetchInteractions } from './interactionFacade';
import {
  createPooyeshTask,
  completePooyeshTask,
  fetchPooyeshTasks,
  listPooyeshTasks,
} from './taskFacade';
import { ProfileTabSectionHeader } from '../../components/profileLayout';
import EntityMentionText from '../../components/navigation/EntityMentionText';
import { getDisplayName } from '../kanoon/columns';
import { useCan } from '../../stores/useSessionStore';
import { PERMISSIONS } from '../../auth/permissions.catalog.js';
import '../kanoon/customerProfile.css';
import './pooyesh-panel.css';

/** Icon is a UI-only concern — the type list/labels come from the Shirazeh registry (Gap 1). */
const ACTIVITY_TYPE_ICONS = {
  call: Phone,
  message: Mail,
  meeting: Users,
  catalog: BookOpen,
  note: StickyNote,
};

const NON_ACTIVITY_TYPE_LABELS = {
  task: 'وظیفه',
  system: 'سیستم',
};

function nodeColorFor(type) {
  const t = String(type || '');
  if (t === 'فروش' || t === 'تحقق' || t === 'success' || t === 'sale') return 'var(--success)';
  if (t === 'مرجوعی' || t === 'هشدار' || t === 'alert' || t === 'return') return 'var(--danger)';
  return 'var(--color-neutral-400)';
}

function typeLabelFor(type) {
  if (NON_ACTIVITY_TYPE_LABELS[type]) return NON_ACTIVITY_TYPE_LABELS[type];
  return resolveActivityTypeLabel(type, type || 'رویداد');
}

function formatFaDate(value) {
  if (!value) return '—';
  if (/^\d{4}-/.test(value)) {
    return new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return value;
}

export function MagicInput({ companyId }) {
  const contact = useCompany(companyId);
  const canWriteActivities = useCan(PERMISSIONS.ACTIVITIES_WRITE);
  const activityTypesVersion = useActivityTypesVersion();
  useEffect(() => { fetchActivityTypes(); }, []);
  const activityTypeOptions = useMemo(() => listActiveActivityTypes().map((t) => ({
    id: t.key,
    label: t.labelFa,
    Icon: ACTIVITY_TYPE_ICONS[t.key] || StickyNote,
  })), [activityTypesVersion]);
  const [expanded, setExpanded] = useState(false);
  const [activityType, setActivityType] = useState('call');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [completionGateOpen, setCompletionGateOpen] = useState(false);
  const rewriteTimer = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => () => clearTimeout(rewriteTimer.current), []);

  const trimmed = note.trim();
  const hasDate = Boolean(followUpDate);
  const hasValidDate = isValidJalaliDate(followUpDate);
  const isFutureDate = hasValidDate && compareJalaliDates(followUpDate, getTodayJalali()) > 0;
  const canSubmit = Boolean(trimmed) && (!hasDate || isFutureDate) && !isRewriting;

  const reset = () => {
    clearTimeout(rewriteTimer.current);
    setIsRewriting(false);
    setNote('');
    setFollowUpDate('');
    setExpanded(false);
  };

  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') reset();
    };
    const onPointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target) && !note.trim()) {
        reset();
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  });

  const handleAiRewrite = () => {
    if (!trimmed || isRewriting) return;
    setIsRewriting(true);
    rewriteTimer.current = setTimeout(() => {
      setNote((current) => mockAiRewrite(current, activityType));
      setIsRewriting(false);
    }, 1000);
  };

  const commitActivity = async () => {
    let iso = null;
    if (hasDate && isFutureDate) {
      const { year, month, day } = parseJalaliDate(followUpDate);
      const g = jalaliToGregorian(year, month, day);
      iso = new Date(g.year, g.month - 1, g.day, 9, 0, 0).toISOString();
    }
    await createActivity(companyId, {
      note: trimmed,
      type: activityType,
      nextFollowUpDate: iso,
    });
    reset();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    // Quarantine: raw LEAD should still allow Pooyesh interactions (notes/calls/…).
    if (contact && contact.recordType !== CONTACT_RECORD_TYPES.LEAD && !evaluateCompanyCompletion(contact).isOperational) {
      setCompletionGateOpen(true);
      return;
    }
    void commitActivity();
  };

  const gateDialog = (
    <IncompleteCompanyDialog
      open={completionGateOpen}
      companyId={companyId}
      onClose={() => setCompletionGateOpen(false)}
      onResolved={commitActivity}
    />
  );

  if (!canWriteActivities) {
    return null;
  }

  if (!expanded) {
    return (
      <>
        <div className="kprofile-magic">
          <button type="button" className="kprofile-magic__pill font-meem" onClick={() => setExpanded(true)}>
            <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
            ثبت فعالیت جدید… (تماس، جلسه، یادداشت)
          </button>
        </div>
        {gateDialog}
      </>
    );
  }

  return (
    <>
      <div className="kprofile-magic" ref={panelRef}>
        <form className="kprofile-magic__panel" onSubmit={handleSubmit}>
          <div className="kprofile-magic__types" role="tablist" aria-label="نوع فعالیت پویش">
            {activityTypeOptions.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activityType === id}
                className={`kprofile-magic__type font-meem${activityType === id ? ' is-active' : ''}`}
                onClick={() => setActivityType(id)}
                disabled={isRewriting}
              >
                <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <div className={`kprofile-ai-wrap${isRewriting ? ' is-busy' : ''}`} aria-busy={isRewriting}>
            <textarea
              className="kprofile-magic__textarea font-meem"
              placeholder="شرح فعالیت… (نتیجه تماس، توافق‌ها، اقدام بعدی)"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={isRewriting}
              autoFocus
            />
            <button
              type="button"
              className="kprofile-ai-btn"
              title="بازنویسی خلاصه نتایج با هوش مصنوعی"
              aria-label="بازنویسی خلاصه نتایج با هوش مصنوعی"
              onClick={handleAiRewrite}
              disabled={!trimmed || isRewriting}
            >
              <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
            {isRewriting && (
              <div className="kprofile-ai-overlay font-meem" role="status">
                <span className="kprofile-ai-spinner" aria-hidden="true" />
                دستیار هوش مصنوعی در حال پردازش...
              </div>
            )}
          </div>

          <div className="kprofile-magic__row">
            <div className="kprofile-magic__date">
              <JalaliDatePicker
                label="پیگیری بعدی (اختیاری)"
                value={followUpDate}
                onChange={setFollowUpDate}
                placeholder="انتخاب تاریخ"
              />
            </div>
            <div className="kprofile-magic__actions">
              <button type="button" className="kprofile-magic__cancel font-meem" onClick={reset}>
                انصراف
              </button>
              <button type="submit" className="btn btn--primary font-meem" disabled={!canSubmit}>
                ثبت فعالیت
              </button>
            </div>
          </div>
          {hasDate && hasValidDate && !isFutureDate && (
            <p className="kprofile-magic__hint font-meem">تاریخ پیگیری باید بعد از امروز باشد.</p>
          )}
        </form>
      </div>
      {gateDialog}
    </>
  );
}

function HeartbeatTimeline({ interactions, returnTo, returnName, companyName, companyId }) {
  if (!interactions.length) {
    return (
      <div className="kprofile-empty font-meem">
        هنوز تعاملی ثبت نشده است — از نوار ثبت سریع بالا اولین فعالیت را ثبت کنید.
      </div>
    );
  }

  const companies = companyId && companyName
    ? [{ id: companyId, name: companyName }]
    : [];

  return (
    <ol className="kprofile-timeline">
      {interactions.map((item, index) => {
        const color = nodeColorFor(item.type);
        return (
          <li
            key={item.id || index}
            id={item.id != null ? `pooyesh-activity-${item.id}` : undefined}
            className="kprofile-timeline__item"
            style={{ '--node-color': color }}
          >
            <span className="kprofile-timeline__node" aria-hidden="true" />
            <article className="kprofile-timeline__card">
              <header className="kprofile-timeline__head">
                <span className="kprofile-timeline__type font-meem">{typeLabelFor(item.type)}</span>
                <span className="kprofile-timeline__date font-yekan">{formatFaDate(item.date)}</span>
                {item.operator && (
                  <span className="kprofile-timeline__operator font-meem">{item.operator}</span>
                )}
              </header>
              <p className="kprofile-timeline__note font-meem">
                <EntityMentionText
                  text={item.note || item.summary || '—'}
                  returnTo={returnTo}
                  returnName={returnName}
                  companies={companies}
                />
              </p>
              {item.nextFollowUp && (
                <span className="kprofile-timeline__followup font-meem">
                  <Calendar size={12} strokeWidth={1.75} aria-hidden="true" />
                  پیگیری بعدی:
                  {' '}
                  <span className="font-yekan">{formatFaDate(item.nextFollowUp)}</span>
                </span>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Pooyesh ownership surface for canonical Tasks (future work — distinct from Activity).
 * Minimal task board: create + list + complete for a Company/Raw Lead subject.
 */
export function PooyeshTaskBoard({ companyId }) {
  const canWriteTasks = useCan(PERMISSIONS.TASKS_WRITE);
  const tasksVersion = useTasksVersion();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (companyId == null) return undefined;
    void fetchPooyeshTasks({ entityType: ENTITY_REF_TYPE.COMPANY, entityId: companyId });
    return undefined;
  }, [companyId]);

  const tasks = useMemo(() => {
    if (companyId == null) return [];
    return listPooyeshTasks({ entityType: ENTITY_REF_TYPE.COMPANY, entityId: companyId })
      .filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
      .sort((a, b) => new Date(a.dueAt || a.dueDate || 0) - new Date(b.dueAt || b.dueDate || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read when task cache ticks
  }, [companyId, tasksVersion]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      let iso = null;
      if (dueDate && isValidJalaliDate(dueDate)) {
        const { year, month, day } = parseJalaliDate(dueDate);
        const g = jalaliToGregorian(year, month, day);
        iso = new Date(g.year, g.month - 1, g.day, 9, 0, 0).toISOString();
      }
      const result = await createPooyeshTask({
        title: trimmed,
        subject: companyReference(companyId),
        dueDate: iso,
        sourceModule: 'pooyesh',
      });
      if (!result?.ok) {
        setError(result?.error || 'ثبت وظیفه ناموفق بود.');
        return;
      }
      setTitle('');
      setDueDate('');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async (taskId) => {
    const result = await completePooyeshTask(taskId);
    if (result && result.ok === false) {
      setError(result.error || 'تکمیل وظیفه ناموفق بود.');
    }
  };

  return (
    <section className="pooyesh-tasks" data-domain="pooyesh" aria-label="پویش — وظایف">
      <ProfileTabSectionHeader
        title="پویش — وظایف"
        subtitle="اقدامات بعدی زمان‌دار — مجزا از فعالیت‌ها"
        Icon={CheckSquare}
      />

      {canWriteTasks && (
        <form className="pooyesh-tasks__form" onSubmit={handleCreate}>
          <input
            type="text"
            className="pooyesh-tasks__input font-meem"
            placeholder="عنوان وظیفه بعدی…"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={busy}
          />
          <div className="pooyesh-tasks__date">
            <JalaliDatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="سررسید (اختیاری)"
            />
          </div>
          <button type="submit" className="btn btn--primary font-meem" disabled={!title.trim() || busy}>
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
            افزودن وظیفه
          </button>
        </form>
      )}

      {error && <p className="pooyesh-tasks__error font-meem">{error}</p>}

      {!tasks.length ? (
        <div className="kprofile-empty font-meem">وظیفه بازی برای این مخاطب ثبت نشده است.</div>
      ) : (
        <ul className="pooyesh-tasks__list">
          {tasks.map((task) => (
            <li key={task.id} className="pooyesh-tasks__item" data-testid="pooyesh-task-item">
              <span className="pooyesh-tasks__check" aria-hidden="true">
                <CheckSquare size={15} strokeWidth={1.75} />
              </span>
              <span className="pooyesh-tasks__body">
                <strong className="pooyesh-tasks__title font-meem">{task.title}</strong>
                <span className="pooyesh-tasks__due font-yekan">{formatFaDate(task.dueAt || task.dueDate)}</span>
              </span>
              {canWriteTasks && (
                <button
                  type="button"
                  className="pooyesh-tasks__complete"
                  onClick={() => handleComplete(task.id)}
                >
                  ✓ تکمیل
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Pooyesh ownership surface for soft customer interactions (history stream).
 * Quick activity logging lives globally on CustomerProfilePage above tabs.
 * CustomerProfilePage must only compose this panel — not own interaction state.
 */
export default function PooyeshInteractionsPanel({
  company,
  returnTo: returnToProp,
  returnName: returnNameProp,
}) {
  const companyId = company?.id;
  // Subscribe so the panel re-renders when Activity cache / contacts change.
  useCompanies();
  useActivitiesVersion();
  const interactions = listCompanyInteractions(companyId);
  const companyName = getDisplayName(company) || '';
  const returnTo = returnToProp ?? (companyId != null
    ? `/kanoon/contact/${companyId}?tab=interactions`
    : undefined);
  const returnName = returnNameProp ?? (companyName || 'پروفایل مشتری');

  useEffect(() => {
    if (companyId == null) return undefined;
    void fetchInteractions(companyReference(companyId));
    return undefined;
  }, [companyId]);

  return (
    <section className="pooyesh-panel" data-domain="pooyesh" aria-label="پویش — موتور تعاملات">
      <ProfileTabSectionHeader
        title="پویش — تعاملات"
        subtitle="تماس‌ها، جلسات، پیگیری‌ها و یادداشت‌های فروش"
        Icon={Activity}
      />
      <HeartbeatTimeline
        interactions={interactions}
        returnTo={returnTo}
        returnName={returnName}
        companyName={companyName}
        companyId={companyId}
      />

      <PooyeshTaskBoard companyId={companyId} />
    </section>
  );
}
