/**
 * Live document chrome — API cache of GET /api/v1/settings/document-chrome.
 * Domain DOCUMENT_CHROME_TAGLINE is fallback / historical freeze only.
 */
import { useSyncExternalStore } from 'react';
import { SettingsRepository } from '../../../api/repositories/SettingsRepository.js';
import { DOCUMENT_CHROME_TAGLINE } from '../../../domain/settings/documentChrome.js';

const FALLBACK = Object.freeze({
  tagline: DOCUMENT_CHROME_TAGLINE,
  organizationIdentityPath: '/api/v1/organization-identity',
});

let cache = null;
let inflight = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeDocumentChrome(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedDocumentChrome() {
  return cache;
}

export function setCachedDocumentChrome(row) {
  cache = {
    tagline: row?.tagline || DOCUMENT_CHROME_TAGLINE,
    organizationIdentityPath: row?.organizationIdentityPath || FALLBACK.organizationIdentityPath,
  };
  notify();
  return cache;
}

export function getDocumentChromeTagline() {
  return cache?.tagline || DOCUMENT_CHROME_TAGLINE;
}

/**
 * Snapshot / live header tagline.
 * Issued docs with stored tagline keep it; otherwise live API cache (domain fallback).
 */
export function resolveDocumentTagline(organization) {
  const stored = typeof organization?.tagline === 'string' ? organization.tagline.trim() : '';
  if (stored) return stored;
  return getDocumentChromeTagline();
}

export async function loadDocumentChrome({ force = false } = {}) {
  if (cache && !force) return cache;
  if (inflight) return inflight;
  inflight = SettingsRepository.getDocumentChrome()
    .then((row) => setCachedDocumentChrome(row))
    .catch(() => {
      if (!cache) setCachedDocumentChrome(FALLBACK);
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useDocumentChromeTagline() {
  return useSyncExternalStore(
    subscribeDocumentChrome,
    getDocumentChromeTagline,
    getDocumentChromeTagline,
  );
}

export const documentChromeFacade = {
  loadDocumentChrome,
  getCachedDocumentChrome,
  getDocumentChromeTagline,
  resolveDocumentTagline,
  subscribeDocumentChrome,
  setCachedDocumentChrome,
};
