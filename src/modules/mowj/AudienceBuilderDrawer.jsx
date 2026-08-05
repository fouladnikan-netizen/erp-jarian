import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  Filter,
  Save,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  AUDIENCE_BASE_SELECTION,
  AUDIENCE_SOURCE_TYPE,
  AUDIENCE_TARGET_LEVEL,
  CONDITION_CATEGORY,
  CONDITION_DATA_TYPE,
  CONDITION_OPERATOR,
  CONDITION_OPERATOR_LABELS,
  RULE_COMBINATOR,
  getConditionDefinition,
  listConditionCategories,
  listConditionDefinitions,
  listOperatorsForCondition,
  normalizeAudienceCondition,
  resolveValueProvider,
} from './domain';
import {
  previewSegment,
  saveSegment,
} from './services/campaignFacade';

const ICON = { size: 16, strokeWidth: 1.75 };
const TARGET_LEVEL = AUDIENCE_TARGET_LEVEL.PERSON;
const SOURCE = AUDIENCE_SOURCE_TYPE.KANOON_PERSON;

function emptyDraft() {
  return {
    name: '',
    description: '',
    source: SOURCE,
    sourceType: SOURCE,
    targetLevel: TARGET_LEVEL,
    baseSelection: AUDIENCE_BASE_SELECTION.ALL_COMPANIES,
    rules: [],
    groups: [],
    groupCombinator: RULE_COMBINATOR.AND,
  };
}

function defaultConditionId() {
  return 'personGender';
}

function emptyRule(conditionId) {
  const available = listConditionDefinitions(undefined, { targetLevel: TARGET_LEVEL });
  const preferred = conditionId || defaultConditionId();
  const def = getConditionDefinition(preferred)
    || available[0];
  if (!def) {
    return {
      id: `rule-${Date.now()}`,
      conditionId: preferred,
      operator: CONDITION_OPERATOR.EQUALS,
      value: '',
      valueTo: '',
      rangeFrom: '',
      rangeTo: '',
      datePreset: '',
    };
  }
  const ops = listOperatorsForCondition(def.id);
  return {
    id: `rule-${Date.now()}`,
    conditionId: def.id,
    operator: ops[0] || CONDITION_OPERATOR.EQUALS,
    value: '',
    valueTo: '',
    rangeFrom: '',
    rangeTo: '',
    datePreset: '',
  };
}

function emptyGroup() {
  return {
    id: `grp-${Date.now()}`,
    combinator: RULE_COMBINATOR.OR,
    rules: [emptyRule(defaultConditionId())],
  };
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function applyRelativeDatePreset(preset, condition) {
  const now = new Date();
  if (preset === 'older_than_6m') {
    const edge = new Date(now);
    edge.setMonth(edge.getMonth() - 6);
    return {
      ...condition,
      datePreset: preset,
      operator: CONDITION_OPERATOR.BEFORE,
      value: toIsoDate(edge),
      valueTo: '',
    };
  }
  if (preset === 'in_last_30d') {
    const edge = new Date(now);
    edge.setDate(edge.getDate() - 30);
    return {
      ...condition,
      datePreset: preset,
      operator: CONDITION_OPERATOR.AFTER,
      value: toIsoDate(edge),
      valueTo: '',
    };
  }
  if (preset === 'between_dates') {
    return {
      ...condition,
      datePreset: preset,
      operator: CONDITION_OPERATOR.BETWEEN,
      value: Array.isArray(condition.value) ? condition.value : ['', ''],
      valueTo: '',
    };
  }
  return {
    ...condition,
    datePreset: preset || 'custom_date',
    operator: condition.operator === CONDITION_OPERATOR.BETWEEN
      ? CONDITION_OPERATOR.BEFORE
      : (condition.operator || CONDITION_OPERATOR.BEFORE),
    value: Array.isArray(condition.value) ? (condition.value[0] || '') : (condition.value || ''),
    valueTo: '',
  };
}

function ConditionValueInput({ condition, definition, onChange }) {
  const dataType = definition?.dataType || CONDITION_DATA_TYPE.TEXT;
  const options = resolveValueProvider(definition?.valueProvider);
  const isBetween = condition.operator === CONDITION_OPERATOR.BETWEEN;
  const isIn = condition.operator === CONDITION_OPERATOR.IN;
  const isOrderCountInRange = definition?.id === 'orderCountInRange';
  const usesRelativeDate = definition?.valueProvider === 'relativeDatePresets';

  if (isOrderCountInRange) {
    return (
      <div className="mowj-condition-values mowj-condition-values--stacked">
        <input
          type="date"
          className="mowj-input"
          aria-label="از تاریخ"
          value={condition.rangeFrom || ''}
          onChange={(e) => onChange({ ...condition, rangeFrom: e.target.value })}
        />
        <input
          type="date"
          className="mowj-input"
          aria-label="تا تاریخ"
          value={condition.rangeTo || ''}
          onChange={(e) => onChange({ ...condition, rangeTo: e.target.value })}
        />
        <input
          type="number"
          className="mowj-input"
          placeholder={isBetween ? 'از تعداد' : 'تعداد سفارش'}
          value={isBetween
            ? (Array.isArray(condition.value) ? condition.value[0] : condition.value)
            : (condition.value ?? '')}
          onChange={(e) => {
            if (isBetween) {
              const hi = Array.isArray(condition.value) ? condition.value[1] : condition.valueTo;
              onChange({ ...condition, value: [e.target.value, hi ?? ''] });
            } else {
              onChange({ ...condition, value: e.target.value });
            }
          }}
        />
        {isBetween ? (
          <input
            type="number"
            className="mowj-input"
            placeholder="تا تعداد"
            value={Array.isArray(condition.value) ? (condition.value[1] ?? '') : (condition.valueTo ?? '')}
            onChange={(e) => {
              const lo = Array.isArray(condition.value) ? condition.value[0] : condition.value;
              onChange({ ...condition, value: [lo ?? '', e.target.value] });
            }}
          />
        ) : null}
      </div>
    );
  }

  if (usesRelativeDate && (dataType === CONDITION_DATA_TYPE.DATE || dataType === CONDITION_DATA_TYPE.DATE_RANGE)) {
    const preset = condition.datePreset || '';
    const showRange = preset === 'between_dates' || isBetween;
    const showSingle = preset === 'custom_date' || (!preset && !showRange);
    return (
      <div className="mowj-condition-values mowj-condition-values--stacked">
        <select
          className="mowj-select"
          aria-label="بازه زمانی"
          value={preset}
          onChange={(e) => onChange(applyRelativeDatePreset(e.target.value, condition))}
        >
          <option value="">انتخاب بازه…</option>
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
          ))}
        </select>
        {showRange ? (
          <>
            <input
              type="date"
              className="mowj-input"
              aria-label="از تاریخ"
              value={Array.isArray(condition.value) ? (condition.value[0] ?? '') : (condition.value ?? '')}
              onChange={(e) => {
                const hi = Array.isArray(condition.value) ? condition.value[1] : condition.valueTo;
                onChange({
                  ...condition,
                  datePreset: 'between_dates',
                  operator: CONDITION_OPERATOR.BETWEEN,
                  value: [e.target.value, hi ?? ''],
                });
              }}
            />
            <input
              type="date"
              className="mowj-input"
              aria-label="تا تاریخ"
              value={Array.isArray(condition.value) ? (condition.value[1] ?? '') : (condition.valueTo ?? '')}
              onChange={(e) => {
                const lo = Array.isArray(condition.value) ? condition.value[0] : condition.value;
                onChange({
                  ...condition,
                  datePreset: 'between_dates',
                  operator: CONDITION_OPERATOR.BETWEEN,
                  value: [lo ?? '', e.target.value],
                });
              }}
            />
          </>
        ) : null}
        {showSingle ? (
          <input
            type="date"
            className="mowj-input"
            value={Array.isArray(condition.value) ? (condition.value[0] ?? '') : (condition.value ?? '')}
            onChange={(e) => onChange({
              ...condition,
              datePreset: 'custom_date',
              value: e.target.value,
            })}
          />
        ) : null}
      </div>
    );
  }

  if (
    dataType === CONDITION_DATA_TYPE.SELECT
    || dataType === CONDITION_DATA_TYPE.USER
    || dataType === CONDITION_DATA_TYPE.BOOLEAN
  ) {
    if (isIn) {
      return (
        <select
          className="mowj-select"
          multiple
          value={Array.isArray(condition.value) ? condition.value.map(String) : []}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
            onChange({ ...condition, value: selected });
          }}
        >
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
          ))}
        </select>
      );
    }
    return (
      <select
        className="mowj-select"
        value={condition.value === true || condition.value === false
          ? String(condition.value)
          : (condition.value ?? '')}
        onChange={(e) => {
          let next = e.target.value;
          if (dataType === CONDITION_DATA_TYPE.BOOLEAN) {
            next = next === 'true';
          }
          onChange({ ...condition, value: next });
        }}
      >
        <option value="">انتخاب…</option>
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (
    dataType === CONDITION_DATA_TYPE.NUMBER
    || dataType === CONDITION_DATA_TYPE.MONEY
  ) {
    return (
      <div className="mowj-condition-values">
        <input
          type="number"
          className="mowj-input"
          placeholder={dataType === CONDITION_DATA_TYPE.MONEY ? 'مبلغ (ریال)' : 'عدد'}
          value={isBetween
            ? (Array.isArray(condition.value) ? condition.value[0] : condition.value)
            : (condition.value ?? '')}
          onChange={(e) => {
            if (isBetween) {
              const hi = Array.isArray(condition.value) ? condition.value[1] : condition.valueTo;
              onChange({ ...condition, value: [e.target.value, hi ?? ''] });
            } else {
              onChange({ ...condition, value: e.target.value });
            }
          }}
        />
        {isBetween ? (
          <input
            type="number"
            className="mowj-input"
            placeholder="تا"
            value={Array.isArray(condition.value) ? (condition.value[1] ?? '') : (condition.valueTo ?? '')}
            onChange={(e) => {
              const lo = Array.isArray(condition.value) ? condition.value[0] : condition.value;
              onChange({ ...condition, value: [lo ?? '', e.target.value] });
            }}
          />
        ) : null}
      </div>
    );
  }

  if (
    dataType === CONDITION_DATA_TYPE.DATE
    || dataType === CONDITION_DATA_TYPE.DATE_RANGE
  ) {
    return (
      <div className="mowj-condition-values">
        <input
          type="date"
          className="mowj-input"
          value={isBetween
            ? (Array.isArray(condition.value) ? condition.value[0] : condition.value)
            : (condition.value ?? '')}
          onChange={(e) => {
            if (isBetween) {
              const hi = Array.isArray(condition.value) ? condition.value[1] : condition.valueTo;
              onChange({ ...condition, value: [e.target.value, hi ?? ''] });
            } else {
              onChange({ ...condition, value: e.target.value });
            }
          }}
        />
        {(isBetween || dataType === CONDITION_DATA_TYPE.DATE_RANGE) ? (
          <input
            type="date"
            className="mowj-input"
            value={Array.isArray(condition.value) ? (condition.value[1] ?? '') : (condition.valueTo ?? '')}
            onChange={(e) => {
              const lo = Array.isArray(condition.value) ? condition.value[0] : condition.value;
              onChange({ ...condition, value: [lo ?? '', e.target.value] });
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <input
      type="text"
      className="mowj-input"
      placeholder={isIn ? 'مقادیر با ویرگول' : 'مقدار'}
      value={Array.isArray(condition.value) ? condition.value.join('، ') : (condition.value ?? '')}
      onChange={(e) => onChange({ ...condition, value: e.target.value })}
    />
  );
}

function ConditionRow({ condition, onChange, onRemove }) {
  const categories = listConditionCategories({ targetLevel: TARGET_LEVEL });
  const definition = getConditionDefinition(condition.conditionId);
  const category = definition?.category || CONDITION_CATEGORY.CONTACT_PERSON;
  const fields = listConditionDefinitions(category, { targetLevel: TARGET_LEVEL });
  const operators = listOperatorsForCondition(condition.conditionId || fields[0]?.id);
  const hideOperator = definition?.valueProvider === 'relativeDatePresets'
    && condition.datePreset
    && condition.datePreset !== 'custom_date'
    && condition.datePreset !== 'between_dates';

  return (
    <div className="mowj-condition-row mowj-condition-row--registry">
      <select
        className="mowj-select"
        value={category}
        onChange={(e) => {
          const nextFields = listConditionDefinitions(e.target.value, { targetLevel: TARGET_LEVEL });
          const nextId = nextFields[0]?.id;
          if (!nextId) return;
          const ops = listOperatorsForCondition(nextId);
          onChange({
            ...condition,
            conditionId: nextId,
            operator: ops[0],
            value: '',
            valueTo: '',
            datePreset: '',
          });
        }}
        aria-label="دسته شرط"
      >
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.label}</option>
        ))}
      </select>
      <select
        className="mowj-select"
        value={condition.conditionId || ''}
        onChange={(e) => {
          const conditionId = e.target.value;
          const ops = listOperatorsForCondition(conditionId);
          onChange({
            ...condition,
            conditionId,
            operator: ops[0],
            value: '',
            valueTo: '',
            datePreset: '',
          });
        }}
        aria-label="شرط"
      >
        {fields.map((field) => (
          <option key={field.id} value={field.id}>{field.label}</option>
        ))}
      </select>
      {!hideOperator ? (
        <select
          className="mowj-select"
          value={condition.operator || ''}
          onChange={(e) => onChange({ ...condition, operator: e.target.value })}
          aria-label="عملگر"
        >
          {operators.map((op) => (
            <option key={op} value={op}>{CONDITION_OPERATOR_LABELS[op] || op}</option>
          ))}
        </select>
      ) : null}
      <ConditionValueInput
        condition={condition}
        definition={definition || getConditionDefinition(fields[0]?.id)}
        onChange={onChange}
      />
      <button
        type="button"
        className="mowj-icon-btn"
        aria-label="حذف شرط"
        onClick={onRemove}
      >
        <Trash2 size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}

/**
 * Single-form Audience Segment creator (no stepper).
 * Domain: always Kanoon related persons; company fields are filters only.
 */
export default function AudienceBuilderDrawer({
  open,
  onClose,
  onSaved,
  initialSegment,
}) {
  const [draft, setDraft] = useState(emptyDraft);
  const [liveCount, setLiveCount] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    setError(null);
    setLiveCount(null);
    if (initialSegment) {
      const hasRules = (
        (initialSegment.rules || initialSegment.conditions || []).length > 0
        || (initialSegment.groups || []).some((g) => g.rules?.length)
      );
      setDraft({
        id: initialSegment.id,
        name: initialSegment.name || '',
        description: initialSegment.description || '',
        source: SOURCE,
        sourceType: SOURCE,
        targetLevel: TARGET_LEVEL,
        baseSelection: hasRules
          ? AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS
          : (initialSegment.baseSelection || AUDIENCE_BASE_SELECTION.ALL_COMPANIES),
        rules: (initialSegment.rules || initialSegment.conditions || []).map((row) => ({
          ...row,
          conditionId: row.conditionId || row.field,
        })),
        groups: Array.isArray(initialSegment.groups)
          ? initialSegment.groups.map((group) => ({
            ...group,
            rules: (group.rules || []).map((row) => ({
              ...row,
              conditionId: row.conditionId || row.field,
            })),
          }))
          : [],
        groupCombinator: initialSegment.groupCombinator || RULE_COMBINATOR.AND,
      });
    } else {
      setDraft(emptyDraft());
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, initialSegment, onClose]);

  const hasAnyRule = (
    (Array.isArray(draft.rules) && draft.rules.length > 0)
    || (Array.isArray(draft.groups) && draft.groups.some((g) => g.rules?.length))
  );

  const effectiveBase = hasAnyRule
    ? AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS
    : AUDIENCE_BASE_SELECTION.ALL_COMPANIES;

  const previewPayload = useMemo(() => ({
    id: draft.id,
    name: draft.name || 'پیش‌نمایش',
    source: SOURCE,
    sourceType: SOURCE,
    targetLevel: TARGET_LEVEL,
    baseSelection: effectiveBase,
    rules: draft.rules,
    groups: draft.groups,
    groupCombinator: draft.groupCombinator,
  }), [draft, effectiveBase]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => {
      const result = previewSegment(previewPayload);
      if (result?.ok) {
        setLiveCount(Number(result.count || 0));
        setError(null);
      } else {
        setLiveCount(null);
        if (result?.error) setError(result.error);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, previewPayload]);

  if (!open) return null;

  const patch = (partial) => setDraft((prev) => ({ ...prev, ...partial }));

  const handleSave = () => {
    setError(null);
    const name = String(draft.name || '').trim();
    if (!name) {
      setError('نام سگمنت الزامی است.');
      return;
    }
    const rules = (draft.rules || [])
      .map((row) => normalizeAudienceCondition(row))
      .filter(Boolean);
    const groups = (draft.groups || [])
      .map((group) => ({
        ...group,
        rules: (group.rules || [])
          .map((row) => normalizeAudienceCondition(row))
          .filter(Boolean),
      }))
      .filter((group) => group.rules.length > 0);
    const baseSelection = (rules.length || groups.length)
      ? AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS
      : AUDIENCE_BASE_SELECTION.ALL_COMPANIES;
    const saved = saveSegment({
      id: draft.id,
      name,
      description: String(draft.description || '').trim() || null,
      source: SOURCE,
      sourceType: SOURCE,
      targetLevel: TARGET_LEVEL,
      baseSelection,
      rules,
      groups,
      groupCombinator: draft.groupCombinator || RULE_COMBINATOR.AND,
    });
    if (!saved) {
      setError('ذخیره سگمنت ناموفق بود.');
      return;
    }
    onSaved?.(saved);
    onClose?.();
  };

  const canSave = Boolean(String(draft.name || '').trim());

  return createPortal(
    <div className="mowj-drawer-root" dir="rtl">
      <button type="button" className="mowj-drawer-backdrop" aria-label="بستن" onClick={onClose} />
      <aside
        className="mowj-drawer mowj-audience-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="ساخت سگمنت مخاطب"
      >
        <header className="mowj-drawer__head">
          <div>
            <h2 className="mowj-drawer__title font-meem">ساخت سگمنت مخاطب</h2>
            <p className="mowj-drawer__sub font-meem">
              افراد مرتبط کانون — شرکت فقط معیار فیلتر است
            </p>
          </div>
          <button type="button" className="mowj-drawer__close" aria-label="بستن" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <div className="mowj-drawer__body">
          {error ? <p className="mowj-form-error font-meem" role="alert">{error}</p> : null}

          <section className="mowj-block">
            <header className="mowj-block__head">
              <Save {...ICON} aria-hidden="true" />
              <div>
                <h3 className="font-meem">نام سگمنت</h3>
                <p>شناسه قابل استفاده مجدد در کمپین‌ها</p>
              </div>
            </header>
            <label className="mowj-field font-meem">
              نام سگمنت
              <input
                className="mowj-input"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="مثلاً مدیران خرید زن در فولاد"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </label>
            <label className="mowj-field font-meem">
              توضیح (اختیاری)
              <textarea
                className="mowj-input mowj-textarea"
                rows={2}
                value={draft.description || ''}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="مثلاً مخاطبین کمپین روز زن — صنایع فولاد"
              />
            </label>
          </section>

          <section className="mowj-block">
            <header className="mowj-block__head">
              <Users {...ICON} aria-hidden="true" />
              <div>
                <h3 className="font-meem">مخاطب پایه</h3>
                <p>پایه سگمنت ثابت است</p>
              </div>
            </header>
            <div className="mowj-audience-base-pill font-meem">
              همه افراد مرتبط کانون
            </div>
          </section>

          <section className="mowj-block">
            <header className="mowj-block__head mowj-block__head--split">
              <div className="mowj-block__head-main">
                <Filter {...ICON} aria-hidden="true" />
                <div>
                  <h3 className="font-meem">شرط‌ها</h3>
                  <p>دسته → شرط → مقدار</p>
                </div>
              </div>
              <div className="mowj-live-count font-meem" aria-live="polite">
                <span>تعداد مخاطب قابل استفاده:</span>
                {' '}
                <strong className="font-yekan">
                  {liveCount == null ? '—' : liveCount.toLocaleString('fa-IR')}
                </strong>
                {' '}
                نفر
              </div>
            </header>

            <div className="mowj-condition-list">
              {(draft.rules || []).map((rule, index) => (
                <ConditionRow
                  key={rule.id || index}
                  condition={rule}
                  onChange={(next) => {
                    const rules = [...draft.rules];
                    rules[index] = next;
                    patch({ rules });
                  }}
                  onRemove={() => {
                    patch({ rules: draft.rules.filter((_, i) => i !== index) });
                  }}
                />
              ))}
            </div>

            <div className="mowj-condition-actions">
              <button
                type="button"
                className="mowj-btn mowj-btn--ghost"
                onClick={() => patch({
                  rules: [
                    ...(draft.rules || []),
                    emptyRule(defaultConditionId()),
                  ],
                })}
              >
                <Plus {...ICON} aria-hidden="true" />
                افزودن شرط
              </button>
              <button
                type="button"
                className="mowj-btn mowj-btn--ghost"
                onClick={() => patch({
                  groups: [...(draft.groups || []), emptyGroup()],
                })}
              >
                <Plus {...ICON} aria-hidden="true" />
                افزودن گروه شرط
              </button>
            </div>

            {(draft.groups || []).length > 0 ? (
              <div className="mowj-rule-groups">
                <div className="mowj-rule-groups__head">
                  <span className="font-meem">ترکیب گروه‌ها</span>
                  <select
                    className="mowj-select mowj-select--compact"
                    value={draft.groupCombinator || RULE_COMBINATOR.AND}
                    onChange={(e) => patch({ groupCombinator: e.target.value })}
                    aria-label="ترکیب گروه‌ها"
                  >
                    <option value={RULE_COMBINATOR.AND}>همه گروه‌ها (و)</option>
                    <option value={RULE_COMBINATOR.OR}>حداقل یک گروه (یا)</option>
                  </select>
                </div>

                {(draft.groups || []).map((group, groupIndex) => (
                  <div key={group.id || groupIndex} className="mowj-rule-group">
                    <div className="mowj-rule-group__head">
                      <strong className="font-meem">
                        گروه
                        {' '}
                        {(groupIndex + 1).toLocaleString('fa-IR')}
                      </strong>
                      <select
                        className="mowj-select mowj-select--compact"
                        value={group.combinator || RULE_COMBINATOR.OR}
                        onChange={(e) => {
                          const groups = [...draft.groups];
                          groups[groupIndex] = {
                            ...group,
                            combinator: e.target.value,
                          };
                          patch({ groups });
                        }}
                        aria-label="ترکیب شرط‌های گروه"
                      >
                        <option value={RULE_COMBINATOR.OR}>حداقل یکی (یا)</option>
                        <option value={RULE_COMBINATOR.AND}>همه (و)</option>
                      </select>
                      <button
                        type="button"
                        className="mowj-icon-btn"
                        aria-label="حذف گروه"
                        onClick={() => {
                          patch({
                            groups: draft.groups.filter((_, i) => i !== groupIndex),
                          });
                        }}
                      >
                        <Trash2 size={15} strokeWidth={1.75} />
                      </button>
                    </div>
                    <div className="mowj-condition-list">
                      {(group.rules || []).map((rule, ruleIndex) => (
                        <ConditionRow
                          key={rule.id || ruleIndex}
                          condition={rule}
                          onChange={(next) => {
                            const groups = [...draft.groups];
                            const rules = [...(group.rules || [])];
                            rules[ruleIndex] = next;
                            groups[groupIndex] = { ...group, rules };
                            patch({ groups });
                          }}
                          onRemove={() => {
                            const groups = [...draft.groups];
                            const rules = (group.rules || []).filter((_, i) => i !== ruleIndex);
                            if (!rules.length) {
                              patch({
                                groups: draft.groups.filter((_, i) => i !== groupIndex),
                              });
                              return;
                            }
                            groups[groupIndex] = { ...group, rules };
                            patch({ groups });
                          }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mowj-btn mowj-btn--ghost"
                      onClick={() => {
                        const groups = [...draft.groups];
                        groups[groupIndex] = {
                          ...group,
                          rules: [
                            ...(group.rules || []),
                            emptyRule(defaultConditionId()),
                          ],
                        };
                        patch({ groups });
                      }}
                    >
                      <Plus {...ICON} aria-hidden="true" />
                      شرط در این گروه
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <footer className="mowj-drawer__foot">
          <button
            type="button"
            className="mowj-btn mowj-btn--ghost"
            onClick={onClose}
          >
            انصراف
          </button>
          <button
            type="button"
            className="mowj-btn mowj-btn--launch"
            disabled={!canSave}
            onClick={handleSave}
          >
            <Save {...ICON} aria-hidden="true" />
            ذخیره
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
