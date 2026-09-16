import axios from 'axios';
import {
  clearAuthSession,
  getAuthToken,
} from '../modules/auth/authSession.js';
import {
  FORBIDDEN_MESSAGE,
  isForbiddenError,
  isUnauthorizedError,
} from './apiErrors.js';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

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
    const token = getAuthToken() || localStorage.getItem('token') || localStorage.getItem('authToken');
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
    const status = error?.response?.status;
    console.error('[api] response error', status, error?.message, error);

    if (isUnauthorizedError(error)) {
      // Session invalid — clear and send to login. Do NOT treat 403 the same way.
      clearAuthSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
        window.location.assign(`/login?next=${next}`);
      }
    } else if (isForbiddenError(error)) {
      const data = error.response?.data;
      if (data && !data.message) {
        data.message = FORBIDDEN_MESSAGE;
      } else if (error.response && !error.response.data) {
        error.response.data = { error: 'FORBIDDEN', message: FORBIDDEN_MESSAGE };
      }
      // Stay authenticated — caller shows message
    }

    return Promise.reject(error);
  }
);

export default apiClient;
