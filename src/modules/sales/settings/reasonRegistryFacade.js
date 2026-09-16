/**
 * Live gateway cancel reasons — API cache of GET /api/v1/settings/reasons.
 * Domain GATEWAY_CANCEL_REASONS is fallback until hydrate (and mock SSOT).
 */
import { useSyncExternalStore } from 'react';
import { SettingsRepository } from '../../../api/repositories/SettingsRepository.js';
import {
  GATEWAY_CANCEL_REASONS,
  REASON_SCOPES,
  getCancelReasonLabel as domainGetCancelReasonLabel,
} from '../../../domain/settings/reasonRegistry.js';

let cache = null;
let inflight = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeGatewayCancelReasons(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedGatewayCancelReasons() {
  return cache;
}

export function setCachedGatewayCancelReasons(items) {
  const next = Array.isArray(items) && items.length > 0 ? items : GATEWAY_CANCEL_REASONS;
  cache = next;
  notify();
  return cache;
}

export function listGatewayCancelReasons() {
  return cache && cache.length > 0 ? cache : GATEWAY_CANCEL_REASONS;
}

export function getCancelReasonLabel(value) {
  const found = listGatewayCancelReasons().find((reason) => reason.value === value);
  if (found?.label) return found.label;
  return domainGetCancelReasonLabel(value);
}

export async function loadGatewayCancelReasons({ force = false } = {}) {
  if (cache && !force) return cache;
  if (inflight) return inflight;
  inflight = SettingsRepository.listReasons(REASON_SCOPES.GATEWAY_CANCEL)
    .then((row) => setCachedGatewayCancelReasons(row.items))
    .catch(() => {
      if (!cache) setCachedGatewayCancelReasons(GATEWAY_CANCEL_REASONS);
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useGatewayCancelReasons() {
  return useSyncExternalStore(
    subscribeGatewayCancelReasons,
    listGatewayCancelReasons,
    listGatewayCancelReasons,
  );
}

export const reasonRegistryFacade = {
  loadGatewayCancelReasons,
  listGatewayCancelReasons,
  getCancelReasonLabel,
  getCachedGatewayCancelReasons,
  setCachedGatewayCancelReasons,
  subscribeGatewayCancelReasons,
};
