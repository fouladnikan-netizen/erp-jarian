import { create } from 'zustand';
import { OrganizationRepository } from '../../../../../api/repositories/OrganizationRepository';
import { getApiErrorMessage } from '../../../../../api/apiErrors';
import {
  ROOT_UNIT_ID,
  buildMoveAuditEvent,
  createDepartmentNode,
  createUserNode,
  emptyOrganizationTree,
  findNodeById,
  findParentId,
  insertChild,
  moveNode,
  removeNodeById,
  resolveDepartmentParentId,
} from '../treeUtils';

/**
 * UI working copy for Organization Designer.
 * Cache only — saveChanges() writes PostgreSQL via OrganizationRepository.
 */

function readError(error, fallback) {
  return getApiErrorMessage(error, fallback);
}

export const useOrganizationStore = create((set, get) => ({
  tree: emptyOrganizationTree(),
  selectedNodeId: null,
  drawerOpen: false,
  draggingNodeId: null,
  dirty: false,
  loading: false,
  saving: false,
  error: null,
  pendingAuditEvents: [],
  moveNotice: null,
  assignPickerParentId: null,

  loadTree: async () => {
    set({ loading: true, error: null });
    try {
      const snapshot = await OrganizationRepository.getTree();
      set({
        tree: snapshot.tree || emptyOrganizationTree(),
        dirty: false,
        loading: false,
        error: null,
        pendingAuditEvents: [],
        moveNotice: null,
      });
      return snapshot;
    } catch (error) {
      set({
        loading: false,
        error: readError(error, 'بارگذاری ساختار سازمانی ناموفق بود.'),
      });
      throw error;
    }
  },

  selectNode: (id) =>
    set({
      selectedNodeId: id,
      drawerOpen: Boolean(id),
    }),

  closeDrawer: () => set({ drawerOpen: false }),

  setDragging: (id) => set({ draggingNodeId: id }),

  openAssignPicker: (parentId) => {
    const safeParent = resolveDepartmentParentId(get().tree, parentId || get().selectedNodeId);
    set({ assignPickerParentId: safeParent });
  },

  closeAssignPicker: () => set({ assignPickerParentId: null }),

  addDepartment: (parentId, name = 'واحد جدید') => {
    const safeParent = resolveDepartmentParentId(get().tree, parentId || get().selectedNodeId);
    const node = createDepartmentNode(name);
    set((state) => ({
      tree: insertChild(state.tree, safeParent, node),
      dirty: true,
      selectedNodeId: node.id,
      drawerOpen: true,
      pendingAuditEvents: [
        ...state.pendingAuditEvents,
        {
          type: 'ORGANIZATION_CHANGED',
          actor: 'session',
          description: `واحد سازمانی «${name}» ایجاد شد`,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    return node.id;
  },

  assignUser: (parentId, user, extras = {}) => {
    if (!user?.id) return null;
    const safeParent = resolveDepartmentParentId(get().tree, parentId || get().selectedNodeId);
    const existing = findNodeById(get().tree, user.id);
    if (existing?.type === 'user') {
      const result = get().relocateNode(user.id, safeParent);
      get().updateNode(user.id, {
        position: extras.position || existing.position || '',
        isManager: extras.isManager === true,
        name: user.displayName || existing.name,
        username: user.username || existing.username || '',
      });
      set({ assignPickerParentId: null });
      return result?.moved || existing.id;
    }
    const dept = findNodeById(get().tree, safeParent);
    const node = createUserNode(user, extras);
    set((state) => ({
      tree: insertChild(state.tree, safeParent, node),
      dirty: true,
      selectedNodeId: node.id,
      drawerOpen: true,
      assignPickerParentId: null,
      pendingAuditEvents: [
        ...state.pendingAuditEvents,
        {
          type: 'ORGANIZATION_CHANGED',
          actor: 'session',
          description: `کاربر «${node.name}» به واحد «${dept?.name || '—'}» افزوده شد`,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    return node.id;
  },

  updateNode: (id, patch) => {
    const next = structuredClone(get().tree);
    const node = findNodeById(next, id);
    if (!node) return;
    Object.assign(node, patch);
    set({ tree: next, dirty: true });
  },

  deleteNode: (id) => {
    if (id === ROOT_UNIT_ID) return;
    const node = findNodeById(get().tree, id);
    const { tree } = removeNodeById(get().tree, id);
    set((state) => ({
      tree,
      dirty: true,
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      drawerOpen: state.selectedNodeId === id ? false : state.drawerOpen,
      pendingAuditEvents: [
        ...state.pendingAuditEvents,
        {
          type: 'ORGANIZATION_CHANGED',
          actor: 'session',
          description: node?.type === 'user'
            ? `انتساب سازمانی «${node.name || id}» حذف شد (حساب کاربری باقی ماند)`
            : `واحد «${node?.name || id}» حذف شد`,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  },

  /**
   * Move node under a department. RBAC roles are never changed.
   */
  relocateNode: (nodeId, newParentId) => {
    const before = get().tree;
    const result = moveNode(before, nodeId, newParentId);
    if (!result.moved) return result;

    const fromParent = result.fromParentId
      ? findNodeById(before, result.fromParentId)
      : null;
    const toParent = findNodeById(result.tree, result.toParentId);
    const audit = buildMoveAuditEvent({
      actor: 'session',
      node: result.node,
      fromParent,
      toParent,
    });

    set((state) => ({
      tree: result.tree,
      dirty: true,
      pendingAuditEvents: [...state.pendingAuditEvents, audit],
      moveNotice:
        result.node.type === 'user'
          ? {
            userName: result.node.name,
            fromDepartment: fromParent?.name || '—',
            toDepartment: toParent?.name || '—',
          }
          : state.moveNotice,
    }));

    return result;
  },

  dismissMoveNotice: () => set({ moveNotice: null }),

  saveChanges: async () => {
    set({ saving: true, error: null });
    try {
      const snapshot = await OrganizationRepository.putTree(get().tree);
      set({
        tree: snapshot.tree || get().tree,
        dirty: false,
        saving: false,
        error: null,
        pendingAuditEvents: [],
      });
      return { ok: true, snapshot };
    } catch (error) {
      const message = readError(error, 'ذخیره ساختار سازمانی ناموفق بود.');
      set({ saving: false, error: message });
      throw error;
    }
  },

  getSelectedNode: () => {
    const { tree, selectedNodeId } = get();
    if (!selectedNodeId) return null;
    return findNodeById(tree, selectedNodeId);
  },

  getParentOfSelected: () => {
    const { tree, selectedNodeId } = get();
    if (!selectedNodeId) return null;
    const parentId = findParentId(tree, selectedNodeId);
    return parentId ? findNodeById(tree, parentId) : null;
  },
}));
