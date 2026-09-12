import { useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, X } from 'lucide-react';
import { useUomStore } from '../../../stores/useUomStore';
import {
  DISPLAY_NAME_SEPARATORS,
  DEFAULT_DISPLAY_NAME_SEPARATOR,
  annotateDisplayNameTokens,
  normalizeDisplayNameRule,
  paletteItems,
  previewDisplayName,
  tokenHasUnit,
  tokenInstanceKey,
  tokenKey,
} from '../../../domain/productMaster/displayNameRule';

const EMPTY_RULE = { separator: DEFAULT_DISPLAY_NAME_SEPARATOR, tokens: [] };

function sourceLabel(token, taxonomy = {}) {
  if (token.sourceType === 'group') return taxonomy.group?.name || 'گروه';
  if (token.sourceType === 'category') return taxonomy.category?.name || 'دسته';
  if (token.sourceType === 'type') return taxonomy.type?.name || 'نوع';
  if (token.sourceType === 'literal') return token.literalText || 'قطعه نمایش';
  return token.definition?.nameFa || 'ویژگی حذف‌شده';
}

function Badge({ badge }) {
  if (!badge) return null;
  return (
    <span className={`vitrin-structure__dnr-badge vitrin-structure__dnr-badge--${badge.id}`}>
      {badge.label}
    </span>
  );
}

function tokenFromItem(item) {
  if (item.sourceType === 'attribute') {
    return {
      sourceType: 'attribute',
      attributeId: item.attributeId,
      includeLabel: false,
      includeUnit: true,
    };
  }
  if (item.sourceType === 'literal') {
    return { sourceType: 'literal', literalId: item.literalId };
  }
  return { sourceType: item.sourceType, includeLabel: false };
}

function insertionIndexFromPoint(x, y, root, draggedIndex) {
  if (!root) return null;
  const tokens = [...root.querySelectorAll('[data-dnr-index]')].filter((el) => (
    !el.classList.contains('is-dragging') && !el.classList.contains('is-clone')
  ));
  if (!tokens.length) return 0;

  const hit = tokens.find((el) => {
    const box = el.getBoundingClientRect();
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  });
  const target = hit || tokens.reduce((best, el) => {
    const box = el.getBoundingClientRect();
    const dx = (box.left + box.width / 2) - x;
    const dy = (box.top + box.height / 2) - y;
    const dist = dx * dx + dy * dy;
    return dist < best.dist ? { el, dist } : best;
  }, { el: tokens[0], dist: Infinity }).el;

  const box = target.getBoundingClientRect();
  const index = Number(target.dataset.dnrIndex);
  const after = y > box.bottom || (y >= box.top && x < box.left + box.width / 2);
  const dest = after ? index + 1 : index;
  if (dest === draggedIndex || dest === draggedIndex + 1) return draggedIndex;
  return dest > draggedIndex ? dest - 1 : dest;
}

function TokenSwitch({ on, disabled, onToggle, name, kind }) {
  const isUnit = kind === 'unit';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={isUnit ? `نمایش واحد «${name}» در نام محصول` : `نمایش عنوان «${name}» در نام محصول`}
      title={isUnit
        ? (on ? 'واحد در نام هست' : 'واحد در نام نیست')
        : (on ? 'عنوان در نام هست' : 'عنوان در نام نیست')}
      disabled={disabled}
      className={`vitrin-structure__dnr-switch${isUnit ? ' vitrin-structure__dnr-switch--unit' : ''}${on ? ' is-on' : ''}`}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      <span className="vitrin-structure__dnr-switch-knob" aria-hidden="true" />
    </button>
  );
}

export default function TypeDisplayNamePanel({
  type,
  group,
  category,
  schema = [],
  canManage,
  onSave,
}) {
  const uoms = useUomStore((s) => s.uoms);
  const [draft, setDraft] = useState(EMPTY_RULE);
  const draftRef = useRef(draft);
  const draggingRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const ruleRef = useRef(null);
  const saveSeq = useRef(Promise.resolve());

  useEffect(() => {
    const next = normalizeDisplayNameRule(type?.displayNameRule) || { ...EMPTY_RULE, tokens: [] };
    draftRef.current = next;
    setDraft(next);
  }, [type?.id]);

  useEffect(() => {
    const onMove = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const palette = useMemo(
    () => paletteItems({ group, category, type, schema }),
    [group, category, type, schema],
  );
  const annotated = useMemo(
    () => annotateDisplayNameTokens(draft, { schema }),
    [draft, schema],
  );
  const used = useMemo(() => new Set(annotated.map((token) => tokenKey(token))), [annotated]);

  const attributes = useMemo(() => {
    const next = {};
    for (const entry of schema) {
      if (entry?.binding?.isActive === false || !entry?.definition?.id) continue;
      const uom = uoms.find((item) => item.id === entry.definition.uomId);
      next[entry.definition.id] = {
        nameFa: entry.definition.nameFa,
        unitLabel: uom?.nameFa || null,
        omitName: entry.definition.code === 'kind' || entry.definition.code === 'ral',
      };
    }
    return next;
  }, [schema, uoms]);

  const taxonomy = { group, category, type };
  const preview = previewDisplayName(draft, {
    sources: { group: group?.name || '', category: category?.name || '', type: type?.name || '' },
    attributes,
  });

  const persist = (next) => {
    const normalized = normalizeDisplayNameRule(next) || { ...EMPTY_RULE, tokens: [] };
    draftRef.current = normalized;
    setDraft(normalized);
    if (!canManage) return;
    const payload = { displayNameRule: normalized.tokens.length ? normalized : null };
    saveSeq.current = saveSeq.current.catch(() => {}).then(() => onSave(payload));
  };

  const onDragStart = () => {
    draggingRef.current = true;
  };

  const onDragEnd = (result) => {
    draggingRef.current = false;
    if (!canManage) return;
    if (result.source.droppableId !== 'dnr-rule') return;
    const from = result.source.index;
    const dest = insertionIndexFromPoint(
      pointerRef.current.x,
      pointerRef.current.y,
      ruleRef.current,
      from,
    );
    const to = dest == null ? result.destination?.index : dest;
    if (to == null || from === to) return;
    const tokens = [...draftRef.current.tokens];
    const [moved] = tokens.splice(from, 1);
    tokens.splice(to, 0, moved);
    persist({ ...draftRef.current, tokens });
  };

  const addFromPalette = (item) => {
    if (!canManage || draggingRef.current) return;
    if (item.sourceType !== 'literal' && used.has(tokenKey(item))) return;
    persist({ ...draftRef.current, tokens: [...draftRef.current.tokens, tokenFromItem(item)] });
  };

  const removeAt = (index) => {
    persist({
      ...draftRef.current,
      tokens: draftRef.current.tokens.filter((_, i) => i !== index),
    });
  };

  const toggleFlag = (index, key) => {
    if (!canManage || draggingRef.current) return;
    persist({
      ...draftRef.current,
      tokens: draftRef.current.tokens.map((token, i) => (
        i === index ? { ...token, [key]: !token[key] } : token
      )),
    });
  };

  const renderRuleClone = (provided, _snapshot, rubric) => {
    const token = annotated[rubric.source.index];
    if (!token) return null;
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`vitrin-structure__dnr-token is-dragging is-clone${token.invalid ? ' is-invalid' : ''}${token.sourceType === 'literal' ? ' is-literal' : ''}`}
        style={provided.draggableProps.style}
      >
        <span className="vitrin-structure__dnr-handle"><GripVertical size={14} /></span>
        <span className="vitrin-structure__dnr-token-label">{sourceLabel(token, taxonomy)}</span>
        <Badge badge={token.badge} />
      </div>
    );
  };

  return (
    <div className="vitrin-structure__dnr">
      <section className="vitrin-structure__dnr-pane" aria-label="اجزای قابل استفاده">
        <h3 className="vitrin-structure__dnr-heading">اجزای قابل استفاده</h3>
        <div className="vitrin-structure__dnr-chips">
          {palette.map((item) => {
            const key = tokenKey(item);
            const repeatable = item.sourceType === 'literal';
            const inRule = !repeatable && used.has(key);
            return (
              <button
                key={key}
                type="button"
                tabIndex={canManage && !inRule ? 0 : -1}
                disabled={!canManage || inRule}
                className={`vitrin-structure__dnr-chip${inRule ? ' is-used' : ''}${repeatable ? ' is-literal' : ''}`}
                onClick={() => addFromPalette(item)}
              >
                <span>{item.label}</span>
                {item.detail ? <span className="vitrin-structure__dnr-chip-detail">{item.detail}</span> : null}
                <Badge badge={item.badge} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="vitrin-structure__dnr-pane" aria-label="ساختار نام محصول">
        <div className="vitrin-structure__dnr-heading-row">
          <h3 className="vitrin-structure__dnr-heading">ساختار نام محصول</h3>
          <p className="vitrin-structure__dnr-hint">شاخه / × / ابعاد فقط نمایش‌اند و در هویت کالا نیستند · چراغ عنوان = نام فیلد · چراغ واحد = میل/اینچ از بانک واحد</p>
        </div>
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="vitrin-structure__dnr-rule-scroller">
            <Droppable
              droppableId="dnr-rule"
              direction="horizontal"
              ignoreContainerClipping
              renderClone={renderRuleClone}
            >
              {(provided, snapshot) => (
                <div
                  className={`vitrin-structure__dnr-rule${snapshot.isDraggingOver ? ' is-over' : ''}${annotated.length === 0 ? ' is-empty' : ''}`}
                  ref={(node) => {
                    provided.innerRef(node);
                    ruleRef.current = node;
                  }}
                  {...provided.droppableProps}
                >
                  {annotated.map((token, index) => (
                    <Draggable
                      key={tokenInstanceKey(token)}
                      draggableId={`rule-${tokenInstanceKey(token)}`}
                      index={index}
                      isDragDisabled={!canManage}
                    >
                      {(drag, dragSnapshot) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          data-dnr-index={index}
                          className={`vitrin-structure__dnr-token${token.invalid ? ' is-invalid' : ''}${token.sourceType === 'literal' ? ' is-literal' : ''}${dragSnapshot.isDragging ? ' is-dragging' : ''}`}
                          style={drag.draggableProps.style}
                        >
                          {canManage ? (
                            <span
                              className="vitrin-structure__dnr-grab"
                              {...drag.dragHandleProps}
                              aria-label="جابجایی"
                            >
                              <span className="vitrin-structure__dnr-handle">
                                <GripVertical size={14} />
                              </span>
                              <span className="vitrin-structure__dnr-token-label">{sourceLabel(token, taxonomy)}</span>
                              <Badge badge={token.badge} />
                            </span>
                          ) : (
                            <>
                              <span className="vitrin-structure__dnr-token-label">{sourceLabel(token, taxonomy)}</span>
                              <Badge badge={token.badge} />
                            </>
                          )}
                          {token.sourceType === 'literal' ? null : (
                          <div className="vitrin-structure__dnr-toggles">
                            <TokenSwitch
                              kind="label"
                              on={Boolean(token.includeLabel)}
                              disabled={!canManage}
                              name={sourceLabel(token, taxonomy)}
                              onToggle={() => toggleFlag(index, 'includeLabel')}
                            />
                            {tokenHasUnit(token) ? (
                              <TokenSwitch
                                kind="unit"
                                on={token.includeUnit !== false}
                                disabled={!canManage}
                                name={attributes[token.attributeId]?.unitLabel || 'واحد'}
                                onToggle={() => toggleFlag(index, 'includeUnit')}
                              />
                            ) : null}
                          </div>
                          )}
                          {canManage ? (
                            <button
                              type="button"
                              className="vitrin-structure__dnr-remove"
                              onPointerDown={(event) => event.stopPropagation()}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={() => removeAt(index)}
                              aria-label={`حذف ${sourceLabel(token, taxonomy)} از ساختار نام`}
                            >
                              <X size={12} />
                            </button>
                          ) : null}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {annotated.length === 0 ? (
                    <p className="vitrin-structure__dnr-empty" dir="rtl">از بالا انتخاب کنید، بعد اینجا جابه‌جا کنید</p>
                  ) : null}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      </section>

      <fieldset className="vitrin-structure__dnr-seps" disabled={!canManage}>
        <legend>جداکننده</legend>
        {DISPLAY_NAME_SEPARATORS.map((item) => (
          <label key={item.id} className="vitrin-structure__dnr-sep">
            <input
              type="radio"
              name={`dnr-sep-${type?.id || 'type'}`}
              checked={(draft.separator || DEFAULT_DISPLAY_NAME_SEPARATOR) === item.value}
              onChange={() => persist({ ...draftRef.current, separator: item.value })}
            />
            {item.label}
          </label>
        ))}
      </fieldset>

      <div className="vitrin-structure__dnr-preview">
        <span className="vitrin-structure__dnr-heading">پیش‌نمایش نام محصول</span>
        <p dir="auto">{preview || '—'}</p>
      </div>
    </div>
  );
}
