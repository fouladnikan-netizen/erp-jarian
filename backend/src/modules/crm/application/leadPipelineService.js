/**
 * Personal Lead Pipeline use-cases — ownership enforced server-side.
 * Personal stages are orthogonal to raw_leads.status.
 */

import { z } from 'zod';
import { withTransaction } from '../../../db/pool.js';
import { appError, fromZodError, notFoundError } from '../../../lib/errors.js';
import { newEntityId, writeAudit } from '../../../lib/ids.js';
import * as pipelineRepo from '../infrastructure/leadPipelineRepository.js';
import * as leadRepo from '../infrastructure/leadRepository.js';

export const DEFAULT_STAGE_NAMES = Object.freeze([
  'سرنخ جدید',
  'تماس اولیه',
  'پیگیری',
  'ارزیابی',
  'واجد شرایط',
]);

const nameSchema = z.string().trim().min(1, 'نام مرحله الزامی است.').max(80);

/**
 * Ensure the caller owns an active personal pipeline (lazy-create with defaults).
 */
export async function ensurePersonalPipeline(ownerUserId) {
  let pipeline = await pipelineRepo.findActiveByOwner(ownerUserId);
  if (pipeline) {
  const stages = await pipelineRepo.listStages(pipeline.id);
  // Backfill: ACTIVE leads of this user without a stage → first stage
  if (stages[0]) {
    try {
      const { query } = await import('../../../db/pool.js');
      await query(
        `UPDATE raw_leads SET pipeline_stage_id = $1, updated_at = NOW()
         WHERE created_by = $2
           AND deleted_at IS NULL
           AND status IN ('NEW', 'QUALIFYING')
           AND pipeline_stage_id IS NULL`,
        [stages[0].id, ownerUserId],
      );
    } catch {
      /* backfill best-effort */
    }
  }
  return { pipeline, stages, created: false };
}

  const pipelineId = newEntityId('lpipe');
  await withTransaction(async (client) => {
    // Re-check inside TX to avoid duplicate under race
    const existing = await pipelineRepo.findActiveByOwner(ownerUserId, client);
    if (existing) {
      pipeline = existing;
      return;
    }
    await pipelineRepo.insertPipeline({
      id: pipelineId,
      ownerUserId,
      name: 'پایپ‌لاین شخصی',
    }, client);
    for (let i = 0; i < DEFAULT_STAGE_NAMES.length; i += 1) {
      await pipelineRepo.insertStage({
        id: newEntityId('lstage'),
        pipelineId,
        name: DEFAULT_STAGE_NAMES[i],
        position: i,
      }, client);
    }
    await writeAudit({
      actorUserId: ownerUserId,
      action: 'PIPELINE_CREATED',
      entityType: 'lead_pipeline',
      entityId: pipelineId,
      detail: { ownerUserId, defaultStages: DEFAULT_STAGE_NAMES },
    }, client);
    pipeline = await pipelineRepo.findActiveByOwner(ownerUserId, client);
  });

  const stages = await pipelineRepo.listStages(pipeline.id);
  return { pipeline, stages, created: true };
}

async function assertStageOwnedByUser(stageId, userId) {
  const stage = await pipelineRepo.findStageById(stageId);
  if (!stage) {
    throw notFoundError('مرحله پایپ‌لاین یافت نشد.');
  }
  const pipeline = await pipelineRepo.findActiveByOwner(userId);
  if (!pipeline || pipeline.id !== stage.pipelineId) {
    throw appError(
      'PIPELINE_FORBIDDEN',
      'دسترسی به پایپ‌لاین این کاربر مجاز نیست.',
      403,
      { stageId },
    );
  }
  return { stage, pipeline };
}

export async function createStage(ownerUserId, body) {
  const parsed = z.object({ name: nameSchema }).safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'نام مرحله نامعتبر است.');

  const { pipeline, stages } = await ensurePersonalPipeline(ownerUserId);
  const name = parsed.data.name;
  const collision = await pipelineRepo.findStageNameCollision(pipeline.id, name);
  if (collision) {
    throw appError('STAGE_NAME_DUPLICATE', 'مرحله‌ای با این نام وجود دارد.', 409);
  }

  const id = newEntityId('lstage');
  const position = stages.length === 0
    ? 0
    : Math.max(...stages.map((s) => s.position)) + 1;

  await withTransaction(async (client) => {
    await pipelineRepo.insertStage({ id, pipelineId: pipeline.id, name, position }, client);
    await pipelineRepo.touchPipeline(pipeline.id, client);
    await writeAudit({
      actorUserId: ownerUserId,
      action: 'PIPELINE_STAGE_CREATED',
      entityType: 'lead_pipeline_stage',
      entityId: id,
      detail: { pipelineId: pipeline.id, name, position },
    }, client);
  });

  return ensurePersonalPipeline(ownerUserId);
}

export async function renameStage(ownerUserId, stageId, body) {
  const parsed = z.object({ name: nameSchema }).safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'نام مرحله نامعتبر است.');

  const { stage, pipeline } = await assertStageOwnedByUser(stageId, ownerUserId);
  const name = parsed.data.name;
  const collision = await pipelineRepo.findStageNameCollision(pipeline.id, name, {
    excludeStageId: stageId,
  });
  if (collision) {
    throw appError('STAGE_NAME_DUPLICATE', 'مرحله‌ای با این نام وجود دارد.', 409);
  }

  await withTransaction(async (client) => {
    await pipelineRepo.updateStageName(stageId, name, client);
    await pipelineRepo.touchPipeline(pipeline.id, client);
    await writeAudit({
      actorUserId: ownerUserId,
      action: 'PIPELINE_STAGE_RENAMED',
      entityType: 'lead_pipeline_stage',
      entityId: stageId,
      detail: { previousName: stage.name, newName: name, pipelineId: pipeline.id },
    }, client);
  });

  return ensurePersonalPipeline(ownerUserId);
}

export async function reorderStages(ownerUserId, body) {
  const parsed = z.object({
    stageIds: z.array(z.string().trim().min(1)).min(1),
  }).safeParse(body);
  if (!parsed.success) throw fromZodError(parsed, 'ترتیب مراحل نامعتبر است.');

  const { pipeline, stages } = await ensurePersonalPipeline(ownerUserId);
  const currentIds = new Set(stages.map((s) => s.id));
  const nextIds = parsed.data.stageIds;

  if (nextIds.length !== stages.length || nextIds.some((id) => !currentIds.has(id))) {
    throw appError(
      'PIPELINE_REORDER_INVALID',
      'فهرست مراحل با پایپ‌لاین فعلی هم‌خوان نیست.',
      400,
    );
  }

  await withTransaction(async (client) => {
    for (let i = 0; i < nextIds.length; i += 1) {
      await pipelineRepo.updateStagePosition(nextIds[i], i, client);
    }
    await pipelineRepo.touchPipeline(pipeline.id, client);
    await writeAudit({
      actorUserId: ownerUserId,
      action: 'PIPELINE_STAGE_REORDERED',
      entityType: 'lead_pipeline',
      entityId: pipeline.id,
      detail: { stageIds: nextIds },
    }, client);
  });

  return ensurePersonalPipeline(ownerUserId);
}

export async function deleteStage(ownerUserId, stageId, body = {}) {
  const { stage, pipeline } = await assertStageOwnedByUser(stageId, ownerUserId);
  const stageCount = await pipelineRepo.countActiveStages(pipeline.id);
  if (stageCount <= 1) {
    throw appError(
      'PIPELINE_LAST_STAGE',
      'حداقل یک مرحله در پایپ‌لاین باید باقی بماند.',
      400,
    );
  }

  const leadCount = await pipelineRepo.countLeadsInStage(stageId);
  let moveToStageId = body.moveToStageId || body.targetStageId || null;

  if (leadCount > 0) {
    if (!moveToStageId) {
      throw appError(
        'STAGE_HAS_LEADS',
        'سرنخ‌های این مرحله باید به مرحله دیگری منتقل شوند.',
        400,
        { leadCount },
      );
    }
    if (moveToStageId === stageId) {
      throw appError('VALIDATION', 'مرحله مقصد باید متفاوت باشد.', 400);
    }
    await assertStageOwnedByUser(moveToStageId, ownerUserId);
  }

  await withTransaction(async (client) => {
    if (leadCount > 0 && moveToStageId) {
      await pipelineRepo.moveLeadsBetweenStages(stageId, moveToStageId, ownerUserId, client);
    }
    await pipelineRepo.softDeleteStage(stageId, ownerUserId, client);
    await pipelineRepo.touchPipeline(pipeline.id, client);
    await writeAudit({
      actorUserId: ownerUserId,
      action: 'PIPELINE_STAGE_DELETED',
      entityType: 'lead_pipeline_stage',
      entityId: stageId,
      detail: {
        pipelineId: pipeline.id,
        name: stage.name,
        movedToStageId: moveToStageId,
        leadsMoved: leadCount,
      },
    }, client);
  });

  return ensurePersonalPipeline(ownerUserId);
}

/**
 * Move lead into a stage owned by the actor. Lead must be ACTIVE (NEW|QUALIFYING).
 * Owner rule (v1): lead.createdBy must equal actor (responsible user).
 */
export async function moveLeadToStage(leadId, stageId, actorUserId) {
  if (!stageId) {
    throw appError('VALIDATION', 'stageId الزامی است.', 400);
  }
  const lead = await leadRepo.findById(leadId);
  if (!lead) throw notFoundError('سرنخ یافت نشد.');
  if (lead.status !== 'NEW' && lead.status !== 'QUALIFYING') {
    throw appError(
      'LEAD_NOT_ACTIVE',
      'فقط سرنخ‌های فعال در پایپ‌لاین شخصی جابه‌جا می‌شوند.',
      400,
      { status: lead.status },
    );
  }
  if (lead.createdBy && lead.createdBy !== actorUserId) {
    throw appError(
      'LEAD_OWNERSHIP_FORBIDDEN',
      'این سرنخ متعلق به کاربر دیگری است.',
      403,
      { leadId },
    );
  }

  const { stage, pipeline } = await assertStageOwnedByUser(stageId, actorUserId);
  const previousStageId = lead.pipelineStageId || null;

  await withTransaction(async (client) => {
    await leadRepo.updatePipelineStage(leadId, stageId, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'LEAD_STAGE_CHANGED',
      entityType: 'raw_lead',
      entityId: leadId,
      detail: {
        previousStageId,
        newStageId: stageId,
        pipelineId: pipeline.id,
        stageName: stage.name,
      },
    }, client);
  });

  return leadRepo.findById(leadId);
}

/**
 * Place new lead on first stage of creator's pipeline.
 */
export async function assignNewLeadToDefaultStage(leadId, ownerUserId, client = null) {
  const { stages } = await (async () => {
    if (client) {
      let pipeline = await pipelineRepo.findActiveByOwner(ownerUserId, client);
      if (!pipeline) {
        // Outside ensure (may nest TX) — create inline
        const pipelineId = newEntityId('lpipe');
        await pipelineRepo.insertPipeline({
          id: pipelineId,
          ownerUserId,
          name: 'پایپ‌لاین شخصی',
        }, client);
        for (let i = 0; i < DEFAULT_STAGE_NAMES.length; i += 1) {
          await pipelineRepo.insertStage({
            id: newEntityId('lstage'),
            pipelineId,
            name: DEFAULT_STAGE_NAMES[i],
            position: i,
          }, client);
        }
        pipeline = { id: pipelineId };
      }
      const stages = await pipelineRepo.listStages(pipeline.id, client);
      return { pipeline, stages };
    }
    return ensurePersonalPipeline(ownerUserId);
  })();

  const first = stages[0];
  if (!first) return null;
  await leadRepo.updatePipelineStage(leadId, first.id, ownerUserId, client);
  return first.id;
}

export default {
  ensurePersonalPipeline,
  createStage,
  renameStage,
  reorderStages,
  deleteStage,
  moveLeadToStage,
  assignNewLeadToDefaultStage,
  DEFAULT_STAGE_NAMES,
};
