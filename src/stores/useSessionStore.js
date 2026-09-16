/**
 * Canonical client session — wraps authSession for React subscribers.
 * Backend JWT + /auth/me permissions are authority; this is UX cache only.
 */
import { create } from 'zustand';
import {
  clearAuthSession,
  getAuthPermissions,
  getAuthProfile,
  getAuthToken,
  getAuthUsername,
  isAuthenticated,
  hydrateAuthProfile,
  subscribeAuthSession,
} from '../modules/auth/authSession.js';
import { can as canPerm, hasAnyPermission, hasAllPermissions } from '../auth/permissions.js';

export const useSessionStore = create((set) => ({
  authenticated: isAuthenticated(),
  loading: false,
  user: getAuthProfile(),
  permissions: getAuthPermissions(),
  displayName: getAuthUsername() || getAuthProfile()?.displayName || '',

  syncFromStorage: () => {
    const user = getAuthProfile();
    set({
      authenticated: isAuthenticated(),
      user,
      permissions: getAuthPermissions(),
      displayName: getAuthUsername() || user?.displayName || '',
      loading: false,
    });
  },

  hydrate: async () => {
    if (!isAuthenticated()) {
      set({
        authenticated: false,
        user: null,
        permissions: [],
        displayName: '',
        loading: false,
      });
      return null;
    }
    set({ loading: true });
    try {
      const user = await hydrateAuthProfile();
      set({
        authenticated: true,
        user,
        permissions: user?.permissions || getAuthPermissions(),
        displayName: user?.displayName || getAuthUsername(),
        loading: false,
      });
      return user;
    } catch (error) {
      console.error('[session] hydrate failed', error);
      // 401 path clears storage via hydrateAuthProfile → notify → syncFromStorage;
      // still force sync so create-buttons reflect empty permissions immediately.
      const user = getAuthProfile();
      set({
        authenticated: isAuthenticated(),
        user,
        permissions: getAuthPermissions(),
        displayName: getAuthUsername() || user?.displayName || '',
        loading: false,
      });
      throw error;
    }
  },

  logout: () => {
    clearAuthSession();
    set({
      authenticated: false,
      user: null,
      permissions: [],
      displayName: '',
      loading: false,
    });
  },

  can: (permission) => canPerm(permission, getAuthPermissions()),
  hasAny: (list) => hasAnyPermission(list, getAuthPermissions()),
  hasAll: (list) => hasAllPermissions(list, getAuthPermissions()),
}));

/** Keep store in sync when authSession mutates outside React. */
if (typeof window !== 'undefined') {
  subscribeAuthSession(() => {
    useSessionStore.getState().syncFromStorage();
  });
}

export function useCan(permission) {
  return useSessionStore((s) => s.permissions.includes(permission));
}

export function useAuthUser() {
  return useSessionStore((s) => s.user);
}

export default useSessionStore;
