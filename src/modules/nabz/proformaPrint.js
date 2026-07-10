import { PROFORMA_PREVIEW_STORAGE_KEY } from './proformaConfig';
import { buildProformaViewModel, getProformaTerms } from './proformaService';

const PREVIEW_PATH = '/nabz/proforma/preview';

function serializePayload(payload) {
  return JSON.stringify(payload);
}

function writePreviewPayload(previewId, payload) {
  const serialized = serializePayload(payload);
  localStorage.setItem(PROFORMA_PREVIEW_STORAGE_KEY, serialized);
  localStorage.setItem(`${PROFORMA_PREVIEW_STORAGE_KEY}:${previewId}`, serialized);
}

export function storeProformaPreviewPayload(order, terms) {
  const viewModel = buildProformaViewModel(order);
  const termsCustom = Boolean(order.proforma?.customTerms);
  const payload = {
    viewModel,
    terms: terms || getProformaTerms(order),
    termsCustom,
  };
  const previewId = `${Date.now()}`;
  writePreviewPayload(previewId, payload);
  return { payload, previewId };
}

function openProformaWindow(path) {
  const url = new URL(path, window.location.href).href;
  const win = window.open(url, '_blank');
  if (!win) {
    window.location.assign(url);
  }
}

export function openProformaPreview(order, terms) {
  const { previewId } = storeProformaPreviewPayload(order, terms);
  openProformaWindow(`${PREVIEW_PATH}?id=${encodeURIComponent(previewId)}`);
}

export function printProforma(order, terms) {
  const { previewId } = storeProformaPreviewPayload(order, terms);
  openProformaWindow(`${PREVIEW_PATH}?print=1&id=${encodeURIComponent(previewId)}`);
}

export function readProformaPreviewPayload(previewId) {
  const keys = [
    previewId ? `${PROFORMA_PREVIEW_STORAGE_KEY}:${previewId}` : null,
    PROFORMA_PREVIEW_STORAGE_KEY,
  ].filter(Boolean);

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {
      /* try next key */
    }
  }

  return null;
}
