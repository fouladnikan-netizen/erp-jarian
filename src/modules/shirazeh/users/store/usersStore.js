import { create } from 'zustand';
import { UserRepository } from '../../../../api/repositories/UserRepository';
import { getApiErrorMessage } from '../../../../api/apiErrors';

/**
 * UI controller for Shirazeh → Users.
 * Cache only — all list/create/edit/status/password operations go through
 * the canonical backend User API. No local user records.
 */

function emptyForm() {
  return {
    displayName: '',
    username: '',
    password: '',
    roleCodes: [],
    isActive: true,
  };
}

function emptyPasswordForm() {
  return { password: '' };
}

function readError(error, fallback) {
  const data = error?.response?.data;
  const message = getApiErrorMessage(error, fallback);
  return {
    message,
    code: data?.error || error?.code || null,
  };
}

export const useUsersStore = create((set, get) => ({
  users: [],
  roles: [],
  loading: false,
  saving: false,
  error: null,
  errorCode: null,
  loaded: false,

  modalOpen: false,
  editingUserId: null,
  form: emptyForm(),

  passwordModalUserId: null,
  passwordForm: emptyPasswordForm(),

  loadUsers: async () => {
    set({ loading: true, error: null, errorCode: null });
    try {
      const users = await UserRepository.listUsers();
      set({ users: users || [], loaded: true, loading: false, error: null, errorCode: null });
      return users;
    } catch (error) {
      const parsed = readError(error, 'بارگذاری کاربران ناموفق بود.');
      set({
        loading: false,
        loaded: true,
        error: parsed.message,
        errorCode: parsed.code,
      });
      throw error;
    }
  },

  loadRoles: async () => {
    try {
      const roles = await UserRepository.listRoles();
      set({ roles: roles || [] });
      return roles;
    } catch (error) {
      const parsed = readError(error, 'بارگذاری نقش‌ها ناموفق بود.');
      set({ error: parsed.message, errorCode: parsed.code });
      throw error;
    }
  },

  openAddModal: () =>
    set({
      modalOpen: true,
      editingUserId: null,
      form: emptyForm(),
      error: null,
      errorCode: null,
    }),

  openEditModal: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return;
    set({
      modalOpen: true,
      editingUserId: userId,
      form: {
        displayName: user.displayName || '',
        username: user.username || '',
        password: '',
        roleCodes: (user.roles || []).map((r) => r.code),
        isActive: user.isActive !== false,
      },
      error: null,
      errorCode: null,
    });
  },

  closeModal: () =>
    set({
      modalOpen: false,
      editingUserId: null,
      form: emptyForm(),
    }),

  setFormField: (key, value) =>
    set((state) => ({
      form: { ...state.form, [key]: value },
    })),

  toggleFormRole: (code) =>
    set((state) => {
      const current = Array.isArray(state.form.roleCodes) ? state.form.roleCodes : [];
      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];
      return { form: { ...state.form, roleCodes: next } };
    }),

  saveUser: async () => {
    const { form, editingUserId } = get();
    const displayName = String(form.displayName || '').trim();
    const username = String(form.username || '').trim();
    const password = String(form.password || '');
    const roleCodes = Array.isArray(form.roleCodes) ? form.roleCodes : [];
    const isActive = form.isActive !== false;

    if (!displayName) {
      set({ error: 'نام نمایشی الزامی است.', errorCode: 'VALIDATION' });
      return { ok: false, reason: 'required' };
    }
    if (!editingUserId && !username) {
      set({ error: 'نام کاربری الزامی است.', errorCode: 'VALIDATION' });
      return { ok: false, reason: 'required' };
    }
    if (!editingUserId && password.length < 8) {
      set({ error: 'رمز عبور باید حداقل ۸ نویسه باشد.', errorCode: 'VALIDATION' });
      return { ok: false, reason: 'password' };
    }
    if (!roleCodes.length) {
      set({ error: 'حداقل یک نقش الزامی است.', errorCode: 'VALIDATION' });
      return { ok: false, reason: 'roles' };
    }

    set({ saving: true, error: null, errorCode: null });
    try {
      if (editingUserId) {
        const saved = await UserRepository.updateUser(editingUserId, {
          displayName,
          isActive,
          roles: roleCodes,
        });
        set((state) => ({
          users: state.users.map((u) => (u.id === saved.id ? saved : u)),
          modalOpen: false,
          editingUserId: null,
          form: emptyForm(),
          saving: false,
        }));
        return { ok: true, mode: 'edit', user: saved };
      }

      const saved = await UserRepository.createUser({
        username,
        displayName,
        password,
        roles: roleCodes,
        isActive,
      });
      set((state) => ({
        users: [saved, ...state.users.filter((u) => u.id !== saved.id)],
        modalOpen: false,
        editingUserId: null,
        form: emptyForm(),
        saving: false,
      }));
      return { ok: true, mode: 'create', user: saved };
    } catch (error) {
      const parsed = readError(error, 'ذخیره کاربر ناموفق بود.');
      set({ saving: false, error: parsed.message, errorCode: parsed.code });
      return { ok: false, reason: parsed.code, error: parsed.message };
    }
  },

  setUserActive: async (userId, isActive) => {
    set({ saving: true, error: null, errorCode: null });
    try {
      const saved = await UserRepository.updateUser(userId, { isActive });
      set((state) => ({
        users: state.users.map((u) => (u.id === saved.id ? saved : u)),
        saving: false,
      }));
      return { ok: true, user: saved };
    } catch (error) {
      const parsed = readError(error, 'تغییر وضعیت کاربر ناموفق بود.');
      set({ saving: false, error: parsed.message, errorCode: parsed.code });
      return { ok: false, reason: parsed.code, error: parsed.message };
    }
  },

  toggleUserStatus: async (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return { ok: false, reason: 'USER_NOT_FOUND' };
    return get().setUserActive(userId, !user.isActive);
  },

  openPasswordModal: (userId) =>
    set({
      passwordModalUserId: userId,
      passwordForm: emptyPasswordForm(),
    }),

  closePasswordModal: () =>
    set({
      passwordModalUserId: null,
      passwordForm: emptyPasswordForm(),
    }),

  setPasswordFormField: (key, value) =>
    set((state) => ({
      passwordForm: { ...state.passwordForm, [key]: value },
    })),

  resetPassword: async () => {
    const { passwordModalUserId, passwordForm } = get();
    const password = String(passwordForm.password || '');
    if (!passwordModalUserId) return { ok: false, reason: 'required' };
    if (password.length < 8) {
      set({ error: 'رمز عبور باید حداقل ۸ نویسه باشد.', errorCode: 'VALIDATION' });
      return { ok: false, reason: 'password' };
    }
    set({ saving: true, error: null, errorCode: null });
    try {
      await UserRepository.resetPassword(passwordModalUserId, password);
      set({
        saving: false,
        passwordModalUserId: null,
        passwordForm: emptyPasswordForm(),
      });
      return { ok: true };
    } catch (error) {
      const parsed = readError(error, 'بازنشانی رمز عبور ناموفق بود.');
      set({ saving: false, error: parsed.message, errorCode: parsed.code });
      return { ok: false, reason: parsed.code, error: parsed.message };
    }
  },

  clearError: () => set({ error: null, errorCode: null }),
}));

export default useUsersStore;
