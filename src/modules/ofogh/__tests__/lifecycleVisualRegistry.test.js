import { describe, expect, it } from 'vitest';
import {
  LIFECYCLE_VISUAL_KIND,
  resolveRawLeadVisual,
  resolveCompanyLifecycleVisual,
} from '../lifecycleVisualRegistry.js';
import { LEAD_STATUS } from '../domain/lead.constants.js';
import { RELATIONSHIP_LIFECYCLE_STAGES } from '../../../domain/party/relationshipLifecycle.constants.js';
import { LIFECYCLE_STAGES } from '../../../domain/party/lifecycle.constants.js';

describe('LifecycleVisualRegistry', () => {
  it('Raw Lead → dashed circle (never NOPODID fill)', () => {
    const open = resolveRawLeadVisual(LEAD_STATUS.NEW);
    expect(open.kind).toBe(LIFECYCLE_VISUAL_KIND.DASHED_CIRCLE);
    expect(open.entityType).toBe('RAW_LEAD');
    expect(open.kind).not.toBe(LIFECYCLE_VISUAL_KIND.EMPTY_CIRCLE);

    const qualifying = resolveRawLeadVisual(LEAD_STATUS.QUALIFYING);
    expect(qualifying.kind).toBe(LIFECYCLE_VISUAL_KIND.DASHED_CIRCLE);
  });

  it('lifecycle company visuals map correctly', () => {
    expect(resolveCompanyLifecycleVisual({
      lifecycleStage: RELATIONSHIP_LIFECYCLE_STAGES.NOPODID,
    }).kind).toBe(LIFECYCLE_VISUAL_KIND.EMPTY_CIRCLE);

    expect(resolveCompanyLifecycleVisual({
      lifecycleStage: RELATIONSHIP_LIFECYCLE_STAGES.DIDAR,
    }).kind).toBe(LIFECYCLE_VISUAL_KIND.CIRCLE_25);

    expect(resolveCompanyLifecycleVisual({
      lifecycleStage: RELATIONSHIP_LIFECYCLE_STAGES.ROYESH,
    }).kind).toBe(LIFECYCLE_VISUAL_KIND.CIRCLE_50);

    expect(resolveCompanyLifecycleVisual({
      lifecycleStage: RELATIONSHIP_LIFECYCLE_STAGES.ASTANE,
    }).kind).toBe(LIFECYCLE_VISUAL_KIND.CIRCLE_75);

    expect(resolveCompanyLifecycleVisual({
      lifecycleStage: RELATIONSHIP_LIFECYCLE_STAGES.NOPAYMAN,
    }).kind).toBe(LIFECYCLE_VISUAL_KIND.FULL_CIRCLE);

    expect(resolveCompanyLifecycleVisual({
      lifecycleStage: RELATIONSHIP_LIFECYCLE_STAGES.HAMPAYMAN,
    }).kind).toBe(LIFECYCLE_VISUAL_KIND.STAR);

    expect(resolveCompanyLifecycleVisual({
      lifecycleStage: RELATIONSHIP_LIFECYCLE_STAGES.SAYEH,
    }).kind).toBe(LIFECYCLE_VISUAL_KIND.MOON);
  });

  it('empty company lifecycle → empty circle نوپدید, not dashed Raw Lead', () => {
    const visual = resolveCompanyLifecycleVisual({});
    expect(visual.kind).toBe(LIFECYCLE_VISUAL_KIND.EMPTY_CIRCLE);
    expect(visual.stage).toBe(RELATIONSHIP_LIFECYCLE_STAGES.NOPODID);
  });

  it('legacy RAW_LEAD on company continuum → empty نوپدید (not dashed card)', () => {
    const visual = resolveCompanyLifecycleVisual({
      lifecycleStage: RELATIONSHIP_LIFECYCLE_STAGES.RAW_LEAD,
    });
    expect(visual.kind).toBe(LIFECYCLE_VISUAL_KIND.EMPTY_CIRCLE);
  });

  it('pipeline cold_lead → نوپدید empty', () => {
    expect(resolveCompanyLifecycleVisual({
      lifecycle_stage: LIFECYCLE_STAGES.COLD_LEAD,
    }).kind).toBe(LIFECYCLE_VISUAL_KIND.EMPTY_CIRCLE);
  });

  it('Converted / Rejected Lead visuals', () => {
    expect(resolveRawLeadVisual(LEAD_STATUS.CONVERTED).kind).toBe(
      LIFECYCLE_VISUAL_KIND.CONVERTED_DASHED_CHECK,
    );
    expect(resolveRawLeadVisual(LEAD_STATUS.REJECTED).kind).toBe(
      LIFECYCLE_VISUAL_KIND.REJECTED_DASHED_SLASH,
    );
  });
});

describe('Raw Lead allowed actions (presentation contract)', () => {
  const ALLOWED = new Set(['activity', 'task', 'edit', 'status', 'convert', 'archive']);
  const FORBIDDEN = new Set(['order', 'finance', 'campaign', 'correspondence', 'quotation', 'contract']);

  it('documents allowed vs forbidden without inventing JSX rules', () => {
    expect(ALLOWED.has('activity')).toBe(true);
    expect(ALLOWED.has('convert')).toBe(true);
    expect(FORBIDDEN.has('order')).toBe(true);
    expect(FORBIDDEN.has('campaign')).toBe(true);
  });
});
