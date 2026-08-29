import { describe, it, expect, vi, afterEach } from 'vitest';

describe('UserRepository live-API guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('refuses to return mock users when mock API is on', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    vi.stubEnv('MODE', 'development');
    const { UserRepository } = await import('../repositories/UserRepository.js');
    await expect(UserRepository.listUsers()).rejects.toMatchObject({
      code: 'USERS_API_REQUIRED',
    });
  });
});
