import { create } from 'zustand';
import { UserRepository } from '../../../../api/repositories/UserRepository';
import { OrganizationRepository } from '../../../../api/repositories/OrganizationRepository';
import { getApiErrorMessage } from '../../../../api/apiErrors';
import { normalizeUserMobile, normalizeUserEmail } from '../../../../domain/userAccount/normalize';

/**
 * UI controller for Shirazeh → Users.
 * Cache only — all list/create/edit/status/password operations go through
 * the canonical backend User API. No local user records.
 */

function emptyForm() {
  return {
    fullName: '',
    mobile: '',
    email: '',
    unitId: '',
    positionId: '',
    roleCodes: [],
    status: 'INVITED',
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
  units: [],
  positions: [],
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

  loadOrganizationOptions: async () => {
    try {
      const [units, positions] = await Promise.all([
        OrganizationRepository.listUnits(),
        OrganizationRepository.listPositions(),
      ]);
      set({
        units: (units || []).filter((u) => u.isActive !== false),
        positions: positions || [],
      });
    } catch (error) {
      const parsed = readError(error, 'بارگذاری ساختار سازمانی ناموفق بود.');
      set({ error: parsed.message, errorCode: parsed.code });
      throw error;
    }
  },

  openAddModal: () => {
    set({
      modalOpen: true,
      editingUserId: null,
      form: emptyForm(),
      error: null,
      errorCode: null,
    });
    void get().loadOrganizationOptions().catch(() => {});
  },

  openEditModal: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return;
    set({
      modalOpen: true,
      editingUserId: userId,
      form: {
        fullName: user.fullName || user.displayName || '',
        mobile: user.mobile || '',
        email: user.email || '',
        unitId: user.organization?.unitId || '',
        positionId: user.organization?.positionId || '',
        roleCodes: (user.roles || []).map((r) => r.code),
        status: user.status || (user.isActive === false ? 'INACTIVE' : 'ACTIVE'),
      },
      error: null,
      errorCode: null,
    });
    void get().loadOrganizationOptions().catch(() => {});
  },

  closeModal: () =>
    set({
      modalOpen: false,
      editingUserId: null,
      form: emptyForm(),
    }),

  setFormField: (key, value) =>
    set((state) => {
      const form = { ...state.form, [key]: value };
      if (key === 'unitId' && value !== state.form.unitId) {
        const stillValid = (state.positions || []).some(
          (p) => p.id === form.positionId && p.unitId === value,
        );
        if (!stillValid) form.positionId = '';
      }
      return { form };
    }),

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
    const fullName = String(form.fullName || '').trim();
    const roleCodes = Array.isArray(form.roleCodes) ? form.roleCodes : [];
    const mobileParsed = normalizeUserMobile(form.mobile);
    const emailParsed = normalizeUserEmail(form.email);

    if (!fullName) {
      set({ error: 'نام و نام خانوادگی الزامی است.', errorCode: 'VALIDATION' });
      return { ok: false, reason: 'required' };
    }
    if (!mobileParsed.ok) {
      set({ error: 'شماره موبایل سازمانی نامعتبر است.', errorCode: 'VALIDATION' });
      return { ok: false, reason: 'mobile' };
    }
    if (String(form.email || '').trim() && !emailParsed.ok) {
      set({ error: 'ایمیل سازمانی نامعتبر است.', errorCode: 'VALIDATION' });
      return { ok: false, reason: 'email' };
    }
    if (!roleCodes.length) {
      set({ error: 'حداقل یک نقش الزامی است.', errorCode: 'VALIDATION' });
      return { ok: false, reason: 'roles' };
    }

    const organization = form.unitId
      ? {
        unitId: form.unitId,
        positionId: form.positionId || null,
      }
      : null;

    set({ saving: true, error: null, errorCode: null });
    try {
      if (editingUserId) {
        const saved = await UserRepository.updateUser(editingUserId, {
          fullName,
          mobile: mobileParsed.mobile,
          email: emailParsed.email || '',
          roles: roleCodes,
          status: form.status,
          organization,
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
        fullName,
        mobile: mobileParsed.mobile,
        email: emailParsed.email || '',
        roles: roleCodes,
        organization: organization || undefined,
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
    const currentlyInactive = (user.status || (user.isActive === false ? 'INACTIVE' : 'ACTIVE')) === 'INACTIVE';
    return get().setUserActive(userId, currentlyInactive);
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
      const result = await UserRepository.resetPassword(passwordModalUserId, password);
      const saved = result?.user;
      set((state) => ({
        saving: false,
        passwordModalUserId: null,
        passwordForm: emptyPasswordForm(),
        users: saved
          ? state.users.map((u) => (u.id === saved.id ? saved : u))
          : state.users,
      }));
      return { ok: true };
    } catch (error) {
      const parsed = readError(error, 'بازنشانی رمز عبور ناموفق بود.');
      set({ saving: false, error: parsed.message, errorCode: parsed.code });
      return { ok: false, reason: parsed.code, error: parsed.message };
    }
  },

  resendInvitation: async (userId) => {
    if (!userId) return { ok: false, reason: 'USER_NOT_FOUND' };
    set({ saving: true, error: null, errorCode: null });
    try {
      const result = await UserRepository.resendInvitation(userId);
      set({ saving: false });
      return { ok: true, invitation: result?.invitation };
    } catch (error) {
      const parsed = readError(error, 'ارسال مجدد دعوتنامه ناموفق بود.');
      set({ saving: false, error: parsed.message, errorCode: parsed.code });
      return { ok: false, reason: parsed.code, error: parsed.message };
    }
  },

  clearError: () => set({ error: null, errorCode: null }),
}));

export default useUsersStore;
