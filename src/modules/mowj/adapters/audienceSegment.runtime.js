/**
 * Audience segment runtime — repository + resolver preview.
 */

import { getDefaultAudienceResolver } from './audienceResolver.runtime';
import {
  audienceRepositoryReset,
  createAudienceRepository,
} from '../repositories/audienceSegmentRepository';
import { useMowjStore } from '../store/useMowjStore';

let defaultRepo = null;

function previewViaResolver(definition) {
  const resolved = getDefaultAudienceResolver().resolve(definition);
  return {
    ok: resolved.ok,
    count: resolved.count,
    error: resolved.error,
  };
}

export function getDefaultAudienceRepository() {
  if (!defaultRepo) {
    defaultRepo = createAudienceRepository(previewViaResolver);
  }
  return defaultRepo;
}

export function __resetAudienceSegmentRuntimeForTests() {
  audienceRepositoryReset();
  defaultRepo = createAudienceRepository(previewViaResolver);
  useMowjStore.getState().bump();
}

export function saveAudienceSegment(input) {
  const saved = getDefaultAudienceRepository().saveSegment(input);
  if (saved) useMowjStore.getState().bump();
  return saved;
}

export function getAudienceSegment(id) {
  return getDefaultAudienceRepository().getSegment(id);
}

export function listAudienceSegments() {
  return getDefaultAudienceRepository().listSegments();
}

export function previewAudienceSegment(segmentOrId) {
  return getDefaultAudienceRepository().previewSegment(segmentOrId);
}
