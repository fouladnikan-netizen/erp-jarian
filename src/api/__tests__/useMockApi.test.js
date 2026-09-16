import { describe, it, expect, vi, afterEach } from 'vitest';

describe('useMockApi', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns true in non-production when VITE_USE_MOCK_API=true', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    const { useMockApi } = await import('../useMockApi.js');
    expect(useMockApi()).toBe(true);
  });

  it('returns false in non-production when VITE_USE_MOCK_API=false', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false');
    vi.resetModules();
    const { useMockApi } = await import('../useMockApi.js');
    expect(useMockApi()).toBe(false);
  });

  it('returns false in production build mode even if env would enable mock', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    vi.stubEnv('MODE', 'production');
    vi.resetModules();
    const { useMockApi } = await import('../useMockApi.js');
    expect(useMockApi()).toBe(false);
  });
});
