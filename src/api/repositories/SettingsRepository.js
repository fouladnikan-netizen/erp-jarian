/**
 * Settings read SSOT — document chrome + reason registry.
 * URLs: GET /api/v1/settings/document-chrome, GET /api/v1/settings/reasons
 * Mock mode returns the same domain constants the API serializes.
 */
import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';
import {
  DOCUMENT_CHROME_TAGLINE,
} from '../../domain/settings/documentChrome.js';
import {
  GATEWAY_CANCEL_REASONS,
  LEAD_REJECT_REASONS,
  REASON_SCOPES,
  listReasons,
} from '../../domain/settings/reasonRegistry.js';

export const SETTINGS_DOCUMENT_CHROME_PATH = '/settings/document-chrome';
export const SETTINGS_REASONS_PATH = '/settings/reasons';
export const ORGANIZATION_IDENTITY_PATH = '/api/v1/organization-identity';

function mockDocumentChrome() {
  return {
    tagline: DOCUMENT_CHROME_TAGLINE,
    organizationIdentityPath: ORGANIZATION_IDENTITY_PATH,
  };
}

function mockReasons(scope) {
  return {
    items: listReasons(scope),
    scopes: Object.values(REASON_SCOPES),
  };
}

export const SettingsRepository = {
  async getDocumentChrome() {
    if (useMockApi()) return mockDocumentChrome();
    const { data } = await apiClient.get(SETTINGS_DOCUMENT_CHROME_PATH);
    return {
      tagline: data?.tagline || DOCUMENT_CHROME_TAGLINE,
      organizationIdentityPath: data?.organizationIdentityPath || ORGANIZATION_IDENTITY_PATH,
    };
  },

  async listReasons(scope) {
    if (useMockApi()) return mockReasons(scope);
    const { data } = await apiClient.get(SETTINGS_REASONS_PATH, {
      params: scope ? { scope } : {},
    });
    const items = Array.isArray(data?.items) ? data.items : [];
    return {
      items,
      scopes: Array.isArray(data?.scopes) ? data.scopes : Object.values(REASON_SCOPES),
    };
  },
};

export {
  DOCUMENT_CHROME_TAGLINE,
  GATEWAY_CANCEL_REASONS,
  LEAD_REJECT_REASONS,
  REASON_SCOPES,
};

export default SettingsRepository;
