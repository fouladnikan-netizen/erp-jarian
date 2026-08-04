import { create } from 'zustand';
import { createEntityId, ENTITY_ID_PREFIX } from '../../../../domain/identity';

/**
 * UI store for Shirazeh → Users management.
 * Mock-only until auth/user API exists.
 * User is platform identity — not part of Company/Order aggregates.
 */

const MOCK_USERS = [
  {
    id: 'u-1',
    fullName: 'احسان محصصی',
    mobile: '09121234567',
    email: 'ehsan@jarian.local',
    roleId: 'ceo',
    lastLoginLabel: '۱۴۰۴/۰۵/۱۱ — ۰۹:۴۲',
    status: 'active',
    forcePasswordChange: false,
  },
  {
    id: 'u-2',
    fullName: 'علی',
    mobile: '09138877665',
    email: 'ali@jarian.local',
    roleId: 'sales',
    lastLoginLabel: '۱۴۰۴/۰۵/۱۰ — ۱۶:۱۸',
    status: 'active',
    forcePasswordChange: false,
  },
  {
    id: 'u-3',
    fullName: 'رضا',
    mobile: '09105544332',
    email: 'reza@jarian.local',
    roleId: 'supply',
    lastLoginLabel: '۱۴۰۴/۰۴/۲۸ — ۱۱:۰۵',
    status: 'inactive',
    forcePasswordChange: false,
  },
  {
    id: 'u-4',
    fullName: 'سارا نوری',
    mobile: '09351234567',
    email: 'sara@jarian.local',
    roleId: 'ops',
    lastLoginLabel: '۱۴۰۴/۰۵/۰۹ — ۰۸:۳۰',
    status: 'active',
    forcePasswordChange: true,
  },
];

function emptyForm() {
  return {
    fullName: '',
    mobile: '',
    email: '',
    roleId: 'sales',
  };
}

export const useUsersStore = create((set, get) => ({
  users: structuredClone(MOCK_USERS),
  modalOpen: false,
  editingUserId: null,
  form: emptyForm(),

  openAddModal: () =>
    set({
      modalOpen: true,
      editingUserId: null,
      form: emptyForm(),
    }),

  openEditModal: (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return;
    set({
      modalOpen: true,
      editingUserId: userId,
      form: {
        fullName: user.fullName,
        mobile: user.mobile,
        email: user.email,
        roleId: user.roleId,
      },
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

  /**
   * Explicit save — create or update from modal form.
   * No auto-save.
   */
  saveUser: () => {
    const { form, editingUserId, users } = get();
    const fullName = String(form.fullName || '').trim();
    const mobile = String(form.mobile || '').trim();
    const email = String(form.email || '').trim();
    const roleId = form.roleId || 'sales';

    if (!fullName || !mobile) return { ok: false, reason: 'required' };

    if (editingUserId) {
      set({
        users: users.map((u) =>
          (u.id === editingUserId
            ? { ...u, fullName, mobile, email, roleId }
            : u)),
        modalOpen: false,
        editingUserId: null,
        form: emptyForm(),
      });
      return { ok: true, mode: 'edit' };
    }

    const next = {
      id: createEntityId(ENTITY_ID_PREFIX.USER),
      fullName,
      mobile,
      email,
      roleId,
      lastLoginLabel: '—',
      status: 'active',
      forcePasswordChange: true,
    };

    set({
      users: [next, ...users],
      modalOpen: false,
      editingUserId: null,
      form: emptyForm(),
    });
    return { ok: true, mode: 'create' };
  },

  toggleUserStatus: (userId) =>
    set((state) => ({
      users: state.users.map((u) => {
        if (u.id !== userId) return u;
        return {
          ...u,
          status: u.status === 'active' ? 'inactive' : 'active',
        };
      }),
    })),

  /** Mark user to change password on next login. */
  forcePasswordChange: (userId) =>
    set((state) => ({
      users: state.users.map((u) =>
        (u.id === userId ? { ...u, forcePasswordChange: true } : u)),
    })),
}));
