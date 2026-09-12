/**
 * Public authentication lifecycle API (DDL-41).
 * Invitation set-password and forgot-password are unauthenticated.
 * Do not attach the session token — a stale JWT must not bounce these pages to /login.
 */

async function publicJson(path, { method = 'POST', body } = {}) {
  const response = await fetch(`/api/v1${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const err = new Error(data?.message || 'درخواست ناموفق بود.');
    err.code = data?.error || 'REQUEST_FAILED';
    err.status = response.status;
    throw err;
  }
  return data;
}

export const AuthRepository = {
  async peekInvitation(token) {
    const encoded = encodeURIComponent(String(token || ''));
    return publicJson(`/auth/invitation?token=${encoded}`, { method: 'GET' });
  },

  async setPassword({ token, password }) {
    return publicJson('/auth/set-password', { body: { token, password } });
  },

  async requestPasswordReset(mobile) {
    return publicJson('/auth/forgot-password', { body: { mobile } });
  },

  async verifyPasswordResetOtp({ mobile, code }) {
    return publicJson('/auth/forgot-password/verify', { body: { mobile, code } });
  },
};

export default AuthRepository;
