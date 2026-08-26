/**
 * Auth session helpers — swap body of authenticate() for real API later.
 * Token is stored for the shared Axios Bearer interceptor (localStorage `token`).
 */

const AUTH_TOKEN_KEY = 'jarian_auth_token';
const AUTH_USER_KEY = 'jarian_auth_user';

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('token') || '';
}

export function getAuthUsername() {
  return localStorage.getItem(AUTH_USER_KEY) || '';
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export function setAuthSession({ token, username }) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem('token', token);
  if (username) {
    localStorage.setItem(AUTH_USER_KEY, username);
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('jarian_auth_profile');
}

/**
 * Real backend: POST /api/v1/auth/login (Vite proxies /api → :3100).
 * Set VITE_USE_MOCK_API=true to keep offline mock login.
 */
export async function authenticate({ username, password }) {
  const trimmedUser = String(username || '').trim();
  const trimmedPass = String(password || '');

  if (!trimmedUser || !trimmedPass) {
    const error = new Error('شناسه کاربری و رمز عبور الزامی است.');
    error.code = 'VALIDATION';
    throw error;
  }

  const useMock = String(import.meta.env.VITE_USE_MOCK_API || '').toLowerCase() === 'true';

  if (!useMock) {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmedUser, password: trimmedPass }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const error = new Error(data?.message || 'ورود ناموفق بود.');
      error.code = data?.error || 'LOGIN_FAILED';
      throw error;
    }

    const token = data.accessToken;
    const displayName = data.user?.displayName || trimmedUser;
    setAuthSession({ token, username: displayName });
    if (data.user) {
      localStorage.setItem('jarian_auth_profile', JSON.stringify(data.user));
    }
    const { default: hydrateErpData } = await import('../../api/bootstrap.js');
    await hydrateErpData();
    return { token, username: displayName, user: data.user };
  }

  await new Promise((resolve) => {
    window.setTimeout(resolve, 420);
  });

  const token = `mock.${btoa(unescape(encodeURIComponent(trimmedUser)))}.${Date.now()}`;
  setAuthSession({ token, username: trimmedUser });
  return { token, username: trimmedUser };
}
