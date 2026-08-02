import { create } from 'zustand';
import {
  getIntegrationById,
  MOCK_INTEGRATION_HEALTH,
} from '../config/integrationsRegistry';

/**
 * UI-only store for Integrations panel.
 *
 * Safety rules:
 * - Do NOT treat this as a credential vault.
 * - draftForms hold temporary input while editing; clear secrets after save/test where possible.
 * - Permanent encrypted storage belongs on the backend.
 *
 * Future hooks:
 * - NotificationEngine on test success/failure
 * - Audit log for credential save / connection test
 */

function cloneHealth() {
  return structuredClone(MOCK_INTEGRATION_HEALTH);
}

export const useIntegrationUIStore = create((set, get) => ({
  selectedIntegrationId: null,
  expandedId: null,
  testingId: null,
  savingId: null,
  loading: false,
  /** @type {Record<string, { status: 'idle'|'success'|'error', message: string }>} */
  testResults: {},
  /** Temporary form drafts — never the source of truth for secrets */
  draftForms: {},
  /** Display-only connection health (simulates backend until API exists) */
  health: cloneHealth(),

  selectIntegration: (id) => set({ selectedIntegrationId: id }),

  toggleExpand: (id) =>
    set((state) => ({
      expandedId: state.expandedId === id ? null : id,
      selectedIntegrationId: id,
    })),

  setDraftField: (integrationId, key, value) =>
    set((state) => ({
      draftForms: {
        ...state.draftForms,
        [integrationId]: {
          ...(state.draftForms[integrationId] || {}),
          [key]: value,
        },
      },
    })),

  clearDraft: (integrationId) =>
    set((state) => {
      const next = { ...state.draftForms };
      delete next[integrationId];
      return { draftForms: next };
    }),

  /**
   * Simulate credential save → backend encrypted vault.
   * After "save", wipe full secret values from draft; keep only a short mask hint.
   */
  saveCredentials: async (integrationId) => {
    const integration = getIntegrationById(integrationId);
    if (!integration) return { ok: false };

    set({ savingId: integrationId, loading: true });
    await new Promise((resolve) => {
      window.setTimeout(resolve, 500);
    });

    const draft = get().draftForms[integrationId] || {};
    const sanitized = { ...draft };
    integration.fields.forEach((field) => {
      if (field.type !== 'secret') return;
      const raw = String(sanitized[field.key] || '');
      if (!raw) return;
      const hint = raw.length <= 2 ? '**' : `********${raw.slice(-2)}`;
      sanitized[field.key] = hint;
      sanitized[`${field.key}__masked`] = true;
    });

    set((state) => ({
      savingId: null,
      loading: false,
      draftForms: {
        ...state.draftForms,
        [integrationId]: sanitized,
      },
      // TODO: NotificationEngine — INTEGRATION_CREDENTIALS_SAVED
      // TODO: Audit — who saved which integration (never log secret values)
    }));

    return { ok: true };
  },

  /**
   * Simulate connection test against provider.
   * Does not require backend yet — returns success if required fields look non-empty
   * OR if the integration is already marked connected in mock health.
   */
  testConnection: async (integrationId) => {
    const integration = getIntegrationById(integrationId);
    if (!integration) return { ok: false };

    set({
      testingId: integrationId,
      loading: true,
      testResults: {
        ...get().testResults,
        [integrationId]: { status: 'idle', message: '' },
      },
    });

    await new Promise((resolve) => {
      window.setTimeout(resolve, 900);
    });

    const draft = get().draftForms[integrationId] || {};
    const requiredFilled = integration.fields.every((field) => {
      const value = String(draft[field.key] || '').trim();
      return value.length > 0;
    });
    const alreadyConnected = Boolean(get().health[integrationId]?.connected);
    const ok = requiredFilled || alreadyConnected;

    const nowLabel = new Date().toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    set((state) => ({
      testingId: null,
      loading: false,
      testResults: {
        ...state.testResults,
        [integrationId]: {
          status: ok ? 'success' : 'error',
          message: ok ? 'اتصال موفق بود' : 'اتصال برقرار نشد',
        },
      },
      health: {
        ...state.health,
        [integrationId]: {
          connected: ok,
          lastCheckLabel: ok ? `امروز ${nowLabel}` : state.health[integrationId]?.lastCheckLabel || null,
        },
      },
      // TODO: NotificationEngine — INTEGRATION_TEST_SUCCESS / INTEGRATION_TEST_FAILED
      // TODO: Audit — connection test outcome
    }));

    return { ok };
  },
}));
