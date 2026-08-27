/**
 * Auth session SSOT (client).
 * Backend JWT + requirePermission = security authority.
 * This module caches token + user profile (incl. permissions) for UX.
 */

import { ALL_PERMISSION_CODES } from '../../auth/permissions.catalog.js';

const AUTH_TOKEN_KEY = 'jarian_auth_token';
const AUTH_USER_KEY = 'jarian_auth_user';
const AUTH_PROFILE_KEY = 'jarian_auth_profile';

/** In-memory fallback when localStorage is unavailable (Node unit tests). */
const memoryStore = new Map();

function storageGet(key) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      return localStorage.getItem(key);
    }
  } catch {
    /* ignore */
  }
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}

function storageSet(key, value) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    /* fall through */
  }
  memoryStore.set(key, value);
}

function storageRemove(key) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
  memoryStore.delete(key);
}

/** Mock-mode fixture — never used as production authority. */
export const MOCK_AUTH_FIXTURE = Object.freeze({
  id: 'u_mock_dev',
  username: 'mock',
  displayName: 'علی رضایی',
  roles: ['admin'],
  permissions: [...ALL_PERMISSION_CODES],
});

const listeners = new Set();

function notifyAuthSession() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error('[authSession] listener error', err);
    }
  });
}

export function subscribeAuthSession(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useMockAuth() {
  return String(import.meta.env.VITE_USE_MOCK_API || '').toLowerCase() === 'true';
}

export function getAuthToken() {
  return storageGet(AUTH_TOKEN_KEY) || storageGet('token') || '';
}

export function getAuthUsername() {
  return storageGet(AUTH_USER_KEY) || '';
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export function getAuthProfile() {
  try {
    const raw = storageGet(AUTH_PROFILE_KEY);
    if (!raw) {
      if (useMockAuth() && isAuthenticated()) return { ...MOCK_AUTH_FIXTURE };
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      id: parsed.id || null,
      username: parsed.username || '',
      displayName: parsed.displayName || parsed.username || '',
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
    };
  } catch {
    return null;
  }
}

export function getAuthPermissions() {
  const profile = getAuthProfile();
  if (profile?.permissions?.length) return profile.permissions;
  if (useMockAuth() && isAuthenticated()) return [...MOCK_AUTH_FIXTURE.permissions];
  return [];
}

/** Display name for UI stamps / assignees — not audit authority (server uses JWT). */
export function getSessionDisplayName() {
  const profile = getAuthProfile();
  return profile?.displayName || getAuthUsername() || (useMockAuth() ? MOCK_AUTH_FIXTURE.displayName : '');
}

export function getSessionUserId() {
  return getAuthProfile()?.id || null;
}

export function setAuthProfile(user) {
  if (!user) {
    storageRemove(AUTH_PROFILE_KEY);
  } else {
    storageSet(AUTH_PROFILE_KEY, JSON.stringify({
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      roles: Array.isArray(user.roles) ? user.roles : [],
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    }));
  }
  notifyAuthSession();
}

export function setAuthSession({ token, username, user } = {}) {
  if (token) {
    storageSet(AUTH_TOKEN_KEY, token);
    storageSet('token', token);
  }
  if (username) {
    storageSet(AUTH_USER_KEY, username);
  }
  if (user) {
    setAuthProfile(user);
  } else {
    notifyAuthSession();
  }
}

export function clearAuthSession() {
  storageRemove(AUTH_TOKEN_KEY);
  storageRemove(AUTH_USER_KEY);
  storageRemove('token');
  storageRemove('authToken');
  storageRemove(AUTH_PROFILE_KEY);
  notifyAuthSession();
}

/**
 * Refresh profile + permissions from Backend GET /auth/me.
 * Production path; mock returns fixture.
 */
export async function hydrateAuthProfile() {
  if (!isAuthenticated()) return null;

  if (useMockAuth()) {
    setAuthProfile(MOCK_AUTH_FIXTURE);
    if (!getAuthUsername()) {
      storageSet(AUTH_USER_KEY, MOCK_AUTH_FIXTURE.displayName);
    }
    notifyAuthSession();
    return getAuthProfile();
  }

  const token = getAuthToken();
  const response = await fetch('/api/v1/auth/me', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    // Stale/invalid token leaves UI in a half-auth state (no permissions → create buttons dead).
    if (response.status === 401) {
      clearAuthSession();
    }
    const err = new Error(data?.message || 'نشست کاربر نامعتبر است.');
    err.code = data?.error || 'UNAUTHORIZED';
    err.status = response.status;
    throw err;
  }
  const user = data?.user || data;
  if (!user?.id) {
    const err = new Error('نشست کاربر نامعتبر است.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  setAuthSession({
    username: user.displayName || user.username,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles || [],
      permissions: user.permissions || [],
    },
  });
  return getAuthProfile();
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

  if (!useMockAuth()) {
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
    const user = data.user || null;
    const displayName = user?.displayName || trimmedUser;
    setAuthSession({ token, username: displayName, user });
    const { default: hydrateErpData } = await import('../../api/bootstrap.js');
    await hydrateErpData();
    return { token, username: displayName, user, permissions: user?.permissions || [] };
  }

  await new Promise((resolve) => {
    const t = globalThis.setTimeout || setTimeout;
    t(resolve, 0);
  });

  const token = `mock.${btoa(unescape(encodeURIComponent(trimmedUser)))}.${Date.now()}`;
  const fixture = {
    ...MOCK_AUTH_FIXTURE,
    username: trimmedUser,
    displayName: trimmedUser || MOCK_AUTH_FIXTURE.displayName,
  };
  setAuthSession({ token, username: fixture.displayName, user: fixture });
  return {
    token,
    username: fixture.displayName,
    user: fixture,
    permissions: fixture.permissions,
  };
}
