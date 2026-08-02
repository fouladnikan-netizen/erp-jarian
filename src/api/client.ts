import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30_000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[api] request error', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Global error sink — Notification Engine wiring comes later
    console.error('[api] response error', error?.response?.status, error?.message, error);
    return Promise.reject(error);
  }
);

export default apiClient;
