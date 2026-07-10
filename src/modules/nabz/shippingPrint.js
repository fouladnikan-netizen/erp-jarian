import { SHIPPING_PREVIEW_STORAGE_KEY } from './tajhizStageConfig';
import { buildShippingDocumentViewModel } from './tajhizStageService';

const PREVIEW_PATH = '/nabz/shipping/preview';

function writePreviewPayload(previewId, payload) {
  const serialized = JSON.stringify(payload);
  localStorage.setItem(SHIPPING_PREVIEW_STORAGE_KEY, serialized);
  localStorage.setItem(`${SHIPPING_PREVIEW_STORAGE_KEY}:${previewId}`, serialized);
}

export function storeShippingPreviewPayload(order, carrierId) {
  const viewModel = buildShippingDocumentViewModel(order, carrierId);
  const previewId = `${Date.now()}`;
  writePreviewPayload(previewId, {
    viewModel,
    orderCode: order.code,
    carrierId,
  });
  return { previewId, viewModel };
}

function openShippingWindow(path) {
  const url = new URL(path, window.location.href).href;
  const win = window.open(url, '_blank');
  if (!win) {
    window.location.assign(url);
  }
}

export function openShippingPreview(order, carrierId) {
  const { previewId } = storeShippingPreviewPayload(order, carrierId);
  openShippingWindow(`${PREVIEW_PATH}?id=${encodeURIComponent(previewId)}`);
}

export function printShippingVoucher(order, carrierId) {
  // Prefer the order snapshot so voucherNumber/date match what was just issued.
  const viewModel = buildShippingDocumentViewModel(order, carrierId);
  const previewId = `${Date.now()}`;
  writePreviewPayload(previewId, {
    viewModel,
    orderCode: order.code,
    carrierId,
  });
  openShippingWindow(`${PREVIEW_PATH}?print=1&id=${encodeURIComponent(previewId)}`);
}

export function readShippingPreviewPayload(previewId) {
  const keys = [
    previewId ? `${SHIPPING_PREVIEW_STORAGE_KEY}:${previewId}` : null,
    SHIPPING_PREVIEW_STORAGE_KEY,
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
