/** Shared flag — mock local data vs PostgreSQL API */
export function useMockApi() {
  return String(import.meta.env.VITE_USE_MOCK_API || '').toLowerCase() === 'true';
}

export default useMockApi;
