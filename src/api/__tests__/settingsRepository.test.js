import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOCUMENT_CHROME_TAGLINE } from '../../domain/settings/documentChrome.js';
import { GATEWAY_CANCEL_REASONS, REASON_SCOPES } from '../../domain/settings/reasonRegistry.js';

describe('SettingsRepository', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns domain chrome and reasons in mock API mode', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    vi.stubEnv('MODE', 'development');
    const { SettingsRepository } = await import('../repositories/SettingsRepository.js');
    const chrome = await SettingsRepository.getDocumentChrome();
    expect(chrome.tagline).toBe(DOCUMENT_CHROME_TAGLINE);
    expect(chrome.organizationIdentityPath).toBe('/api/v1/organization-identity');

    const reasons = await SettingsRepository.listReasons(REASON_SCOPES.GATEWAY_CANCEL);
    expect(reasons.items.map((r) => r.value)).toEqual(
      GATEWAY_CANCEL_REASONS.map((r) => r.value),
    );
  });

  it('reads live settings API paths when mock is off', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false');
    vi.stubEnv('MODE', 'development');
    vi.resetModules();

    const get = vi.fn()
      .mockResolvedValueOnce({
        data: {
          tagline: 'API tagline',
          organizationIdentityPath: '/api/v1/organization-identity',
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [{ value: 'high_price', label: 'API price' }],
          scopes: ['GATEWAY_CANCEL'],
        },
      });

    vi.doMock('../client.ts', () => ({
      apiClient: { get },
      default: { get },
    }));
    vi.doMock('../client', () => ({
      apiClient: { get },
      default: { get },
    }));

    const { SettingsRepository } = await import('../repositories/SettingsRepository.js');
    const chrome = await SettingsRepository.getDocumentChrome();
    expect(chrome.tagline).toBe('API tagline');
    expect(get).toHaveBeenCalledWith('/settings/document-chrome');

    const reasons = await SettingsRepository.listReasons('GATEWAY_CANCEL');
    expect(reasons.items[0].label).toBe('API price');
    expect(get.mock.calls[1][0]).toBe('/settings/reasons');
    expect(get.mock.calls[1][1]).toEqual({ params: { scope: 'GATEWAY_CANCEL' } });
  });
});
