import { create } from 'zustand';
import { RbacRepository } from '../../../../api/repositories/RbacRepository';
import { getApiErrorMessage } from '../../../../api/apiErrors';
import { getAuthProfile, hydrateAuthProfile } from '../../../auth/authSession';
import {
  applyPendingToCommitted,
  isPermissionEnabled,
} from '../permissions/rolePermissionDraft';
import { roleNameConflictMessage } from '../permissions/roleCode';

function readError(error, fallback) {
  const data = error?.response?.data || {};
  return {
    message: getApiErrorMessage(error, fallback),
    code: data.error || data.code || error?.code || null,
    existingRoleCode: data.existingRoleCode || data.details?.existingRoleCode || null,
    existingRoleIsActive: data.existingRoleIsActive ?? data.details?.existingRoleIsActive,
  };
}

function emptyCreateForm() {
  return { labelFa: '', description: '', isActive: true };
}

function draftFromRole(role) {
  return {
    labelFa: role?.labelFa || '',
    description: role?.description || '',
    isActive: role?.isActive !== false,
  };
}

/**
 * Role + permission matrix UI cache.
 * Source of truth is PostgreSQL via RbacRepository.
 */
export const usePermissionsStore = create((set, get) => ({
  roles: [],
  catalog: [],
  selectedRoleCode: null,
  roleDraft: draftFromRole(null),
  committedCodes: [],
  pendingChanges: {},
  expandedModuleId: null,
  permissionQuery: '',
  loading: false,
  roleLoading: false,
  saving: false,
  savingRole: false,
  loaded: false,
  error: null,
  errorCode: null,
  usageWarning: null,
  roleUsers: [],
  roleUsersLoading: false,

  createModalOpen: false,
  createForm: emptyCreateForm(),
  editModalOpen: false,
  editForm: emptyCreateForm(),

  selectedRole: () => {
    const { roles, selectedRoleCode } = get();
    return roles.find((role) => role.code === selectedRoleCode) || null;
  },

  isEnabled: (code) => {
    const { committedCodes, pendingChanges } = get();
    return isPermissionEnabled(code, committedCodes, pendingChanges);
  },

  hasPendingChanges: () => Object.keys(get().pendingChanges).length > 0,

  isRoleDraftDirty: () => {
    const role = get().selectedRole();
    if (!role) return false;
    const draft = get().roleDraft;
    return draft.labelFa !== (role.labelFa || '')
      || draft.description !== (role.description || '')
      || draft.isActive !== (role.isActive !== false);
  },

  loadCatalog: async () => {
    set({ loading: true, error: null, errorCode: null });
    try {
      const [roles, catalog] = await Promise.all([
        RbacRepository.listRoles(),
        RbacRepository.listPermissions(),
      ]);
      const previous = get().selectedRoleCode;
      const selectedRoleCode = roles.some((role) => role.code === previous)
        ? previous
        : (roles[0]?.code || null);
      const selected = roles.find((role) => role.code === selectedRoleCode) || null;
      set({
        roles: roles || [],
        catalog: catalog || [],
        selectedRoleCode,
        roleDraft: draftFromRole(selected),
        loaded: true,
        loading: false,
        error: null,
        errorCode: null,
        pendingChanges: {},
        usageWarning: null,
        roleUsers: [],
        roleUsersLoading: Boolean(selectedRoleCode),
      });
      if (selectedRoleCode) {
        await Promise.all([
          get().loadRolePermissions(selectedRoleCode),
          get().loadRoleUsers(selectedRoleCode),
        ]);
      } else {
        set({ committedCodes: [], roleUsers: [], roleUsersLoading: false });
      }
      return { roles, catalog };
    } catch (error) {
      const parsed = readError(error, 'بارگذاری نقش‌ها و دسترسی‌ها ناموفق بود.');
      set({
        loading: false,
        loaded: true,
        error: parsed.message,
        errorCode: parsed.code,
      });
      throw error;
    }
  },

  loadRolePermissions: async (roleCode) => {
    const code = roleCode || get().selectedRoleCode;
    if (!code) {
      set({ committedCodes: [], roleLoading: false });
      return [];
    }
    set({ roleLoading: true, error: null, errorCode: null });
    try {
      const committedCodes = await RbacRepository.listRolePermissions(code);
      set({
        committedCodes,
        roleLoading: false,
        pendingChanges: {},
        error: null,
        errorCode: null,
      });
      return committedCodes;
    } catch (error) {
      const parsed = readError(error, 'بارگذاری دسترسی‌های نقش ناموفق بود.');
      set({
        roleLoading: false,
        error: parsed.message,
        errorCode: parsed.code,
      });
      throw error;
    }
  },

  loadRoleUsers: async (roleCode) => {
    const code = roleCode || get().selectedRoleCode;
    if (!code) {
      set({ roleUsers: [], roleUsersLoading: false });
      return [];
    }
    set({ roleUsersLoading: true });
    try {
      const users = await RbacRepository.listRoleUsers(code);
      if (get().selectedRoleCode !== code) return users;
      set({ roleUsers: users, roleUsersLoading: false });
      return users;
    } catch (error) {
      if (get().selectedRoleCode !== code) return [];
      const parsed = readError(error, 'بارگذاری کاربران نقش ناموفق بود.');
      set({
        roleUsers: [],
        roleUsersLoading: false,
        error: parsed.message,
        errorCode: parsed.code,
      });
      throw error;
    }
  },

  selectRole: (roleCode) => {
    if (!roleCode || roleCode === get().selectedRoleCode) return;
    const role = get().roles.find((item) => item.code === roleCode) || null;
    set({
      selectedRoleCode: roleCode,
      roleDraft: draftFromRole(role),
      pendingChanges: {},
      expandedModuleId: null,
      usageWarning: null,
      roleUsers: [],
      roleUsersLoading: true,
      editModalOpen: false,
      editForm: emptyCreateForm(),
    });
    void get().loadRolePermissions(roleCode);
    void get().loadRoleUsers(roleCode);
  },

  setRoleDraftField: (field, value) =>
    set((state) => ({
      roleDraft: { ...state.roleDraft, [field]: value },
    })),

  openCreateModal: () => set({
    createModalOpen: true,
    editModalOpen: false,
    createForm: emptyCreateForm(),
  }),
  closeCreateModal: () => set({ createModalOpen: false, createForm: emptyCreateForm() }),
  setCreateFormField: (field, value) =>
    set((state) => ({
      createForm: { ...state.createForm, [field]: value },
    })),

  openEditModal: () => {
    const role = get().selectedRole();
    if (!role) return;
    set({
      createModalOpen: false,
      editModalOpen: true,
      editForm: {
        labelFa: role.labelFa || '',
        description: role.description || '',
        isActive: role.isActive !== false,
      },
    });
  },
  closeEditModal: () => set({ editModalOpen: false, editForm: emptyCreateForm() }),
  setEditFormField: (field, value) =>
    set((state) => ({
      editForm: { ...state.editForm, [field]: value },
    })),

  saveRoleProfile: async () => {
    const form = get().editForm;
    const labelFa = String(form.labelFa || '').trim();
    if (!labelFa) {
      set({ error: 'نام نقش الزامی است.', errorCode: 'VALIDATION' });
      return { ok: false };
    }
    const result = await get().saveRole({
      labelFa,
      description: String(form.description || '').trim(),
    });
    if (result?.ok) {
      set({ editModalOpen: false, editForm: emptyCreateForm() });
    }
    return result;
  },

  createRole: async () => {
    const form = get().createForm;
    if (!String(form.labelFa || '').trim()) {
      set({ error: 'نام نقش الزامی است.', errorCode: 'VALIDATION' });
      return { ok: false };
    }
    set({ savingRole: true, error: null, errorCode: null });
    try {
      const role = await RbacRepository.createRole({
        labelFa: String(form.labelFa).trim(),
        description: String(form.description || '').trim(),
        isActive: form.isActive !== false,
      });
      set({
        savingRole: false,
        createModalOpen: false,
        createForm: emptyCreateForm(),
        selectedRoleCode: role.code,
      });
      await get().loadCatalog();
      return { ok: true, role };
    } catch (error) {
      const parsed = readError(error, 'ایجاد نقش ناموفق بود.');
      if (parsed.code === 'ROLE_NAME_ALREADY_EXISTS') {
        const attempted = String(form.labelFa || '').trim();
        const existingCode = parsed.existingRoleCode || get().selectedRoleCode;
        set({
          savingRole: false,
          createModalOpen: false,
          createForm: emptyCreateForm(),
          selectedRoleCode: existingCode,
        });
        await get().loadCatalog().catch(() => {});
        set({
          error: roleNameConflictMessage(attempted, parsed.existingRoleIsActive),
          errorCode: parsed.code,
          selectedRoleCode: existingCode || get().selectedRoleCode,
        });
        return { ok: false };
      }
      set({ savingRole: false, error: parsed.message, errorCode: parsed.code });
      return { ok: false };
    }
  },

  saveRole: async (patch) => {
    const selectedRoleCode = get().selectedRoleCode;
    if (!selectedRoleCode) return { ok: false };
    const draft = get().roleDraft;
    const body = patch || {
      labelFa: draft.labelFa.trim(),
      description: draft.description.trim(),
      isActive: draft.isActive,
    };
    set({ savingRole: true, error: null, errorCode: null, usageWarning: null });
    try {
      const result = await RbacRepository.updateRole(selectedRoleCode, body);
      const role = result.role || result;
      set((state) => ({
        savingRole: false,
        roles: state.roles.map((item) => (item.code === role.code ? { ...item, ...role } : item)),
        roleDraft: draftFromRole(role),
        usageWarning: result.usage || null,
      }));
      return { ok: true, role, usage: result.usage || null };
    } catch (error) {
      const parsed = readError(error, 'ذخیره نقش ناموفق بود.');
      const attempted = patch?.labelFa ?? get().editForm?.labelFa ?? get().roleDraft?.labelFa;
      const message = parsed.code === 'ROLE_NAME_ALREADY_EXISTS'
        ? roleNameConflictMessage(attempted, parsed.existingRoleIsActive)
        : parsed.message;
      set({ savingRole: false, error: message, errorCode: parsed.code });
      return { ok: false };
    }
  },

  toggleModule: (moduleId) =>
    set((state) => ({
      expandedModuleId: state.expandedModuleId === moduleId ? null : moduleId,
    })),

  setPermissionQuery: (permissionQuery) => set({ permissionQuery: String(permissionQuery || '') }),

  togglePermission: (code) => {
    const { committedCodes, pendingChanges } = get();
    const committed = committedCodes.includes(code);
    const current = isPermissionEnabled(code, committedCodes, pendingChanges);
    const nextEnabled = !current;

    const pending = { ...pendingChanges };
    if (nextEnabled === committed) {
      delete pending[code];
    } else {
      pending[code] = nextEnabled;
    }
    set({ pendingChanges: pending });
  },

  discardChanges: () => set({ pendingChanges: {} }),

  clearError: () => set({ error: null, errorCode: null }),

  savePermissions: async () => {
    const { selectedRoleCode, pendingChanges, committedCodes } = get();
    if (!selectedRoleCode || !Object.keys(pendingChanges).length) {
      return { ok: true };
    }

    const next = applyPendingToCommitted(committedCodes, pendingChanges);
    set({ saving: true, error: null, errorCode: null });
    try {
      const saved = await RbacRepository.replaceRolePermissions(selectedRoleCode, next);
      set({
        saving: false,
        pendingChanges: {},
        committedCodes: saved,
        error: null,
        errorCode: null,
      });

      const roles = getAuthProfile()?.roles || [];
      if (roles.includes(selectedRoleCode)) {
        try {
          await hydrateAuthProfile();
        } catch (hydrateError) {
          console.error('[permissionsStore] session hydrate failed', hydrateError);
        }
      }
      return { ok: true };
    } catch (error) {
      const parsed = readError(error, 'ذخیره دسترسی‌ها ناموفق بود.');
      set({
        saving: false,
        error: parsed.message,
        errorCode: parsed.code,
      });
      return { ok: false };
    }
  },
}));
