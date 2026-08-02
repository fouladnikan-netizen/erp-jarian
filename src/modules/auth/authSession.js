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
}

/**
 * Future integration point:
 *   const { data } = await apiClient.post('/auth/login', { username, password });
 *   setAuthSession({ token: data.accessToken, username });
 *
 * Mock path keeps UX working until the backend auth endpoint is live.
 */
export async function authenticate({ username, password }) {
  const trimmedUser = String(username || '').trim();
  const trimmedPass = String(password || '');

  if (!trimmedUser || !trimmedPass) {
    const error = new Error('شناسه کاربری و رمز عبور الزامی است.');
    error.code = 'VALIDATION';
    throw error;
  }

  // --- MOCK (replace with API call) ---
  await new Promise((resolve) => {
    window.setTimeout(resolve, 420);
  });

  const token = `mock.${btoa(unescape(encodeURIComponent(trimmedUser)))}.${Date.now()}`;
  setAuthSession({ token, username: trimmedUser });
  return { token, username: trimmedUser };
}
