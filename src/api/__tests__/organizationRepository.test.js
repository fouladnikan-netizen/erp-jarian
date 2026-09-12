import { describe, it, expect, vi, afterEach } from 'vitest';

describe('OrganizationRepository live-API guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('refuses mock fixtures when mock API is on', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    vi.stubEnv('MODE', 'development');
    const { OrganizationRepository } = await import('../repositories/OrganizationRepository.js');
    await expect(OrganizationRepository.getTree()).rejects.toMatchObject({
      code: 'ORGANIZATION_API_REQUIRED',
    });
  });
});
