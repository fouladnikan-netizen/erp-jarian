import { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { isOpenLeadStatus } from './domain/lead.constants.js';
import LeadPipelineRepository from '../../api/repositories/LeadPipelineRepository.js';
import LifecycleIndicator from '../../components/common/LifecycleIndicator';
import { resolveRawLeadVisual } from './lifecycleVisualRegistry.js';
import { getPulseStatus, PULSE_META } from './pipelineConfig';
import { showSystemToast } from '../../utils/systemToast';

function formatFaDate(isoDate) {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleDateString('fa-IR');
  } catch {
    return '';
  }
}

function PulseDot({ nextFollowUpDate }) {
  const status = getPulseStatus(nextFollowUpDate);
  const meta = PULSE_META[status];
  const dateLabel = formatFaDate(nextFollowUpDate);
  return (
    <span
      className={`ofoq-pulse ${meta.className}`}
      title={dateLabel ? `${meta.label} — ${dateLabel}` : meta.label}
    >
      <span className="ofoq-pulse__dot" aria-hidden="true" />
      <span className="ofoq-pulse__label">{dateLabel || 'بدون پیگیری'}</span>
    </span>
  );
}

function PersonalLeadCard({ lead, index, onOpen }) {
  const visual = resolveRawLeadVisual(lead.status);
  return (
    <Draggable draggableId={`plead-${lead.id}`} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`ofoq-lead-card ofoq-lead-card--raw${snapshot.isDragging ? ' is-dragging' : ''}`}
          style={provided.draggableProps.style}
          onClick={(e) => {
            if (e.defaultPrevented) return;
            onOpen(lead.id);
          }}
          data-entity-type="RAW_LEAD"
          data-testid={`ofogh-plead-card-${lead.id}`}
        >
          <div className="ofoq-lead-card__row">
            <h3 className="ofoq-lead-card__name">
              <LifecycleIndicator visual={visual.kind} label={visual.label} size={12} />
              {lead.companyName}
            </h3>
            <PulseDot nextFollowUpDate={lead.next_follow_up_date} />
          </div>
          {lead.personName ? (
            <span className="ofoq-lead-card__tag">{lead.personName}</span>
          ) : null}
          {(lead.leadSource || lead.mobile) ? (
            <span className="ofoq-lead-card__meta font-yekan">
              {[lead.leadSource, lead.mobile].filter(Boolean).join(' · ')}
            </span>
          ) : null}
          {lead.assignee?.name ? (
            <span className="ofoq-lead-card__meta font-meem">{lead.assignee.name}</span>
          ) : null}
        </article>
      )}
    </Draggable>
  );
}

/**
 * Personal Lead Pipeline Kanban — USER-CONTROLLED stages (per user, SERVER_FIRST).
 */
export default function OfoqPersonalLeadBoard({
  globalQuery = '',
  globalDue = null,
  onSelectLead,
}) {
  const leads = useLeadsStore((s) => s.leads);
  const fetchLeads = useLeadsStore((s) => s.fetchLeads);
  const moveLeadPipelineStageAsync = useLeadsStore((s) => s.moveLeadPipelineStageAsync);

  const [stages, setStages] = useState([]);
  const [pipelineId, setPipelineId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState('');

  const refreshPipeline = useCallback(async () => {
    const data = await LeadPipelineRepository.getMine();
    setPipelineId(data.pipeline?.id || null);
    setStages(Array.isArray(data.stages) ? data.stages : []);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await refreshPipeline();
        await fetchLeads();
      } catch (err) {
        showSystemToast(err?.response?.data?.message || err?.message || 'بارگذاری پایپ‌لاین ناموفق بود.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshPipeline, fetchLeads]);

  const openLeads = useMemo(() => {
    const query = globalQuery.trim();
    return leads.filter((lead) => {
      if (!isOpenLeadStatus(lead.status)) return false;
      if (query) {
        const haystack = `${lead.companyName} ${lead.personName || ''} ${lead.leadSource || ''} ${lead.mobile || ''}`;
        if (!haystack.includes(query)) return false;
      }
      if (globalDue && getPulseStatus(lead.next_follow_up_date) !== globalDue) return false;
      return true;
    });
  }, [leads, globalQuery, globalDue]);

  const leadsByStage = useMemo(() => {
    const map = Object.fromEntries(stages.map((s) => [s.id, []]));
    const firstId = stages[0]?.id;
    openLeads.forEach((lead) => {
      const sid = lead.pipelineStageId && map[lead.pipelineStageId]
        ? lead.pipelineStageId
        : firstId;
      if (sid && map[sid]) map[sid].push(lead);
    });
    return map;
  }, [stages, openLeads]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;

    if (type === 'COLUMN') {
      if (destination.index === source.index) return;
      const ordered = Array.from(stages);
      const [moved] = ordered.splice(source.index, 1);
      ordered.splice(destination.index, 0, moved);
      setStages(ordered);
      setBusy(true);
      try {
        const data = await LeadPipelineRepository.reorderStages(ordered.map((s) => s.id));
        setStages(data.stages || ordered);
      } catch (err) {
        await refreshPipeline();
        showSystemToast(err?.response?.data?.message || 'بازچینش ستون‌ها ناموفق بود.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (destination.droppableId === source.droppableId) return;
    if (!String(draggableId).startsWith('plead-')) return;
    const leadId = String(draggableId).replace(/^plead-/, '');
    const stageId = destination.droppableId;
    setBusy(true);
    try {
      await moveLeadPipelineStageAsync(leadId, stageId);
    } catch (err) {
      showSystemToast(err?.response?.data?.message || 'جابه‌جایی سرنخ ناموفق بود.');
      await fetchLeads();
    } finally {
      setBusy(false);
    }
  };

  const handleAddStage = async () => {
    const name = newStageName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const data = await LeadPipelineRepository.createStage(name);
      setStages(data.stages || []);
      setNewStageName('');
      setAddOpen(false);
    } catch (err) {
      showSystemToast(err?.response?.data?.message || 'افزودن مرحله ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async () => {
    const name = renameValue.trim();
    if (!renameId || !name) return;
    setBusy(true);
    try {
      const data = await LeadPipelineRepository.renameStage(renameId, name);
      setStages(data.stages || []);
      setRenameId(null);
      setRenameValue('');
    } catch (err) {
      showSystemToast(err?.response?.data?.message || 'تغییر نام ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const leadCount = (leadsByStage[deleteId] || []).length;
    if (leadCount > 0 && !deleteTargetId) {
      showSystemToast('مرحله مقصد را انتخاب کنید.');
      return;
    }
    setBusy(true);
    try {
      const data = await LeadPipelineRepository.deleteStage(
        deleteId,
        leadCount > 0 ? deleteTargetId : null,
      );
      setStages(data.stages || []);
      setDeleteId(null);
      setDeleteTargetId('');
      await fetchLeads();
    } catch (err) {
      showSystemToast(err?.response?.data?.message || 'حذف مرحله ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="ofoq-personal-pipeline" data-testid="ofogh-lead-board" data-pipeline-id="">
        <p className="font-meem ofoq-pipeline__loading">در حال بارگذاری پایپ‌لاین…</p>
      </div>
    );
  }

  return (
    <div className="ofoq-personal-pipeline" data-testid="ofogh-lead-board" data-pipeline-id={pipelineId || ''}>
      <DragDropContext onDragEnd={(r) => void handleDragEnd(r)}>
        <Droppable droppableId="personal-columns" direction="horizontal" type="COLUMN">
          {(colProvided) => (
            <div
              className="ofoq-pipeline__board"
              dir="rtl"
              ref={colProvided.innerRef}
              {...colProvided.droppableProps}
            >
              {stages.map((stage, colIndex) => (
                <Draggable key={stage.id} draggableId={`pcol-${stage.id}`} index={colIndex}>
                  {(colDrag) => (
                    <section
                      ref={colDrag.innerRef}
                      {...colDrag.draggableProps}
                      className="ofoq-pipeline__column"
                      style={{
                        ...colDrag.draggableProps.style,
                        '--stage-color': 'var(--text-muted)',
                        '--stage-glow': 'color-mix(in srgb, var(--text-muted) 25%, transparent)',
                      }}
                      data-testid={`ofogh-plead-col-${stage.id}`}
                      data-stage-name={stage.name}
                    >
                      <header className="ofoq-pipeline__column-head" {...colDrag.dragHandleProps}>
                        <h2 className="ofoq-pipeline__column-title">{stage.name}</h2>
                        <div className="ofoq-pipeline__column-tools">
                          <span
                            className="ofoq-pipeline__column-count"
                            data-testid={`ofogh-plead-count-${stage.id}`}
                          >
                            {(leadsByStage[stage.id] || []).length.toLocaleString('fa-IR')}
                          </span>
                          <button
                            type="button"
                            className="ofoq-column-filter__btn"
                            title="تغییر نام"
                            data-testid={`ofogh-plead-rename-${stage.id}`}
                            onClick={() => {
                              setRenameId(stage.id);
                              setRenameValue(stage.name);
                            }}
                            disabled={busy}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="ofoq-column-filter__btn"
                            title="حذف مرحله"
                            data-testid={`ofogh-plead-delete-${stage.id}`}
                            onClick={() => {
                              setDeleteId(stage.id);
                              setDeleteTargetId('');
                            }}
                            disabled={busy || stages.length <= 1}
                          >
                            ×
                          </button>
                        </div>
                      </header>

                      <Droppable droppableId={stage.id} type="LEAD">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`ofoq-pipeline__column-body${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}
                          >
                            {(leadsByStage[stage.id] || []).map((lead, index) => (
                              <PersonalLeadCard
                                key={lead.id}
                                lead={lead}
                                index={index}
                                onOpen={onSelectLead}
                              />
                            ))}
                            {provided.placeholder}
                            {(leadsByStage[stage.id] || []).length === 0 ? (
                              <div className="ofoq-pipeline__empty" aria-hidden="true">
                                سرنخ را اینجا رها کنید
                              </div>
                            ) : null}
                          </div>
                        )}
                      </Droppable>
                    </section>
                  )}
                </Draggable>
              ))}
              {colProvided.placeholder}

              <div className="ofoq-pipeline__column ofoq-pipeline__column--add">
                {addOpen ? (
                  <div className="ofoq-add-stage" data-testid="ofogh-plead-add-form">
                    <input
                      className="kanoon-form__input font-meem"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="نام مرحله"
                      data-testid="ofogh-plead-add-input"
                    />
                    <button
                      type="button"
                      className="btn btn--primary font-meem"
                      onClick={() => void handleAddStage()}
                      disabled={busy || !newStageName.trim()}
                      data-testid="ofogh-plead-add-submit"
                    >
                      ثبت
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost font-meem"
                      onClick={() => setAddOpen(false)}
                    >
                      انصراف
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn--ghost ofoq-add-stage__trigger font-meem"
                    onClick={() => setAddOpen(true)}
                    data-testid="ofogh-plead-add-stage"
                  >
                    + افزودن مرحله
                  </button>
                )}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {renameId ? (
        <div className="kanoon-modal-overlay" role="presentation">
          <div className="kanoon-modal kanoon-modal--minimal" role="dialog" aria-modal="true">
            <header className="kanoon-modal__header">
              <h2 className="kanoon-modal__title font-meem">تغییر نام مرحله</h2>
            </header>
            <div className="kanoon-modal__body">
              <input
                className="kanoon-form__input font-meem"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                data-testid="ofogh-plead-rename-input"
              />
            </div>
            <footer className="kanoon-modal__footer">
              <button type="button" className="btn btn--ghost" onClick={() => setRenameId(null)}>انصراف</button>
              <button
                type="button"
                className="btn btn--primary"
                data-testid="ofogh-plead-rename-submit"
                onClick={() => void handleRename()}
                disabled={busy || !renameValue.trim()}
              >
                ذخیره
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {deleteId ? (
        <div className="kanoon-modal-overlay" role="presentation">
          <div className="kanoon-modal kanoon-modal--minimal" role="dialog" aria-modal="true" data-testid="ofogh-plead-delete-dialog">
            <header className="kanoon-modal__header">
              <h2 className="kanoon-modal__title font-meem">حذف مرحله</h2>
            </header>
            <div className="kanoon-modal__body">
              {(leadsByStage[deleteId] || []).length > 0 ? (
                <>
                  <p className="font-meem">سرنخ‌های این مرحله به کدام مرحله منتقل شوند؟</p>
                  <select
                    className="kanoon-form__input font-meem"
                    value={deleteTargetId}
                    onChange={(e) => setDeleteTargetId(e.target.value)}
                    data-testid="ofogh-plead-delete-target"
                  >
                    <option value="">انتخاب کنید…</option>
                    {stages.filter((s) => s.id !== deleteId).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </>
              ) : (
                <p className="font-meem">این مرحله خالی است و حذف می‌شود.</p>
              )}
            </div>
            <footer className="kanoon-modal__footer">
              <button type="button" className="btn btn--ghost" onClick={() => setDeleteId(null)}>انصراف</button>
              <button
                type="button"
                className="btn btn--primary"
                data-testid="ofogh-plead-delete-submit"
                onClick={() => void handleDelete()}
                disabled={busy}
              >
                حذف
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
