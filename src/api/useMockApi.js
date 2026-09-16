/** Shared flag — mock local data vs PostgreSQL API */
export function useMockApi() {
  // Fail-safe: production bundles never use mock SoR, even if env is misconfigured.
  const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
  if (isProduction) {
    return false;
  }
  return String(import.meta.env.VITE_USE_MOCK_API || '').toLowerCase() === 'true';
}

export default useMockApi;
