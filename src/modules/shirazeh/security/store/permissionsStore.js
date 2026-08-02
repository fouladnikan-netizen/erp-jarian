import { create } from 'zustand';
import {
  DEFAULT_SECURITY_ROLE_ID,
  ROLE_PERMISSION_DEFAULTS,
} from '../config/permissionsRegistry';

function cloneRoleMatrix() {
  return structuredClone(ROLE_PERMISSION_DEFAULTS);
}

const DEFAULT_GRANT = Object.freeze({ enabled: false, scope: 'OWN' });

function sameGrant(a, b) {
  return Boolean(a?.enabled) === Boolean(b?.enabled)
    && (a?.scope || 'OWN') === (b?.scope || 'OWN');
}

/**
 * Permission Matrix UI store — Explicit Save only.
 * pendingChanges holds drafts; committed grants live in rolePermissions.
 */
export const usePermissionsStore = create((set, get) => ({
  selectedRoleId: DEFAULT_SECURITY_ROLE_ID,
  expandedModuleId: null,
  /** Committed grants per role (working copy until backend sync). */
  rolePermissions: cloneRoleMatrix(),
  /**
   * Pending edits for the active role:
   * { [actionId]: { enabled: boolean, scope: 'OWN'|'TEAM'|'ALL' } }
   */
  pendingChanges: {},
  saving: false,

  selectRole: (roleId) => {
    const { pendingChanges } = get();
    if (Object.keys(pendingChanges).length > 0) {
      // Switching role discards unsaved drafts for the previous role (explicit UX).
      set({
        selectedRoleId: roleId,
        pendingChanges: {},
        expandedModuleId: null,
      });
      return;
    }
    set({ selectedRoleId: roleId, expandedModuleId: null });
  },

  toggleModule: (moduleId) =>
    set((state) => ({
      expandedModuleId: state.expandedModuleId === moduleId ? null : moduleId,
    })),

  getCommittedGrant: (actionId) => {
    const { selectedRoleId, rolePermissions } = get();
    return rolePermissions[selectedRoleId]?.[actionId] ?? DEFAULT_GRANT;
  },

  /** Effective grant = pending override ?? committed */
  getEffectiveGrant: (actionId) => {
    const { pendingChanges } = get();
    if (Object.prototype.hasOwnProperty.call(pendingChanges, actionId)) {
      return pendingChanges[actionId];
    }
    return get().getCommittedGrant(actionId);
  },

  hasPendingChanges: () => Object.keys(get().pendingChanges).length > 0,

  pendingCount: () => Object.keys(get().pendingChanges).length,

  togglePermission: (actionId) => {
    const committed = get().getCommittedGrant(actionId);
    const current = get().getEffectiveGrant(actionId);
    const next = {
      enabled: !current.enabled,
      scope: current.scope || 'OWN',
    };

    set((state) => {
      const pending = { ...state.pendingChanges };
      if (sameGrant(next, committed)) {
        delete pending[actionId];
      } else {
        pending[actionId] = next;
      }
      return { pendingChanges: pending };
    });
  },

  setScope: (actionId, scope) => {
    const committed = get().getCommittedGrant(actionId);
    const current = get().getEffectiveGrant(actionId);
    const next = {
      enabled: current.enabled,
      scope,
    };

    set((state) => {
      const pending = { ...state.pendingChanges };
      if (sameGrant(next, committed)) {
        delete pending[actionId];
      } else {
        pending[actionId] = next;
      }
      return { pendingChanges: pending };
    });
  },

  discardChanges: () => set({ pendingChanges: {} }),

  /**
   * Explicit save — merges pending into committed matrix.
   * Future: POST /api/v1/rbac/roles/:id/permissions + Audit event.
   */
  savePermissions: async () => {
    const { selectedRoleId, pendingChanges, rolePermissions } = get();
    if (!Object.keys(pendingChanges).length) return { ok: true };

    set({ saving: true });
    await new Promise((resolve) => {
      window.setTimeout(resolve, 420);
    });

    const nextRole = {
      ...(rolePermissions[selectedRoleId] || {}),
      ...pendingChanges,
    };

    set((state) => ({
      saving: false,
      pendingChanges: {},
      rolePermissions: {
        ...state.rolePermissions,
        [selectedRoleId]: nextRole,
      },
      // TODO: Audit — PERMISSIONS_CHANGED for selectedRoleId
      // TODO: NotificationEngine — role ACL updated
    }));

    return { ok: true };
  },
}));
