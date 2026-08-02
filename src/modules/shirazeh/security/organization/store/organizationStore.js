import { create } from 'zustand';
import { cloneOrganizationTree } from '../mockData/organizationTree';
import {
  buildMoveAuditEvent,
  createDepartmentNode,
  createUserNode,
  findNodeById,
  findParentId,
  insertChild,
  moveNode,
  removeNodeById,
} from '../treeUtils';

/**
 * UI working copy for Organization Designer.
 * Not a permanent store — saveChanges() is the future API boundary.
 */

export const useOrganizationStore = create((set, get) => ({
  tree: cloneOrganizationTree(),
  selectedNodeId: null,
  drawerOpen: false,
  draggingNodeId: null,
  dirty: false,
  pendingAuditEvents: [],
  roleReviewPrompt: null,

  selectNode: (id) =>
    set({
      selectedNodeId: id,
      drawerOpen: Boolean(id),
    }),

  closeDrawer: () => set({ drawerOpen: false }),

  setDragging: (id) => set({ draggingNodeId: id }),

  addDepartment: (parentId, name = 'واحد جدید') => {
    const parent = parentId || get().selectedNodeId || 'root';
    const target = findNodeById(get().tree, parent);
    const safeParent = target?.type === 'department' ? parent : 'root';
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
          actor: 'admin',
          description: `واحد سازمانی «${name}» ایجاد شد`,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    return node.id;
  },

  addUser: (parentId, payload = {}) => {
    const parent = parentId || get().selectedNodeId || 'root';
    const target = findNodeById(get().tree, parent);
    const safeParent = target?.type === 'department' ? parent : 'root';
    const dept = findNodeById(get().tree, safeParent);
    const node = createUserNode({
      name: payload.name || 'کاربر جدید',
      position: payload.position || 'بدون سمت',
      role: payload.role || dept?.defaultRole || 'MEMBER',
    });
    set((state) => ({
      tree: insertChild(state.tree, safeParent, node),
      dirty: true,
      selectedNodeId: node.id,
      drawerOpen: true,
      pendingAuditEvents: [
        ...state.pendingAuditEvents,
        {
          type: 'ORGANIZATION_CHANGED',
          actor: 'admin',
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
    if (id === 'root') return;
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
          actor: 'admin',
          description: `${node?.type === 'user' ? 'کاربر' : 'واحد'} «${node?.name || id}» حذف شد`,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  },

  /**
   * Move node under a department. Roles are NOT auto-changed.
   * If a user moves, open role-review confirmation.
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
      actor: 'admin',
      node: result.node,
      fromParent,
      toParent,
    });

    set((state) => ({
      tree: result.tree,
      dirty: true,
      pendingAuditEvents: [...state.pendingAuditEvents, audit],
      roleReviewPrompt:
        result.node.type === 'user'
          ? {
              userId: result.node.id,
              userName: result.node.name,
              currentRole: result.node.role,
              suggestedRole: toParent?.defaultRole || null,
              fromDepartment: fromParent?.name || '—',
              toDepartment: toParent?.name || '—',
            }
          : null,
    }));

    return result;
  },

  dismissRoleReview: () => set({ roleReviewPrompt: null }),

  applySuggestedRole: () => {
    const prompt = get().roleReviewPrompt;
    if (!prompt?.suggestedRole) {
      set({ roleReviewPrompt: null });
      return;
    }
    get().updateNode(prompt.userId, { role: prompt.suggestedRole });
    set((state) => ({
      roleReviewPrompt: null,
      pendingAuditEvents: [
        ...state.pendingAuditEvents,
        {
          type: 'ORGANIZATION_CHANGED',
          actor: 'admin',
          description: `نقش سیستم «${prompt.userName}» به ${prompt.suggestedRole} به‌روز شد (پس از جابه‌جایی سازمانی)`,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  },

  /** Future: POST /api/v1/organization + flush audit to Notification/Audit engines */
  saveChanges: async () => {
    const { pendingAuditEvents } = get();
    await new Promise((resolve) => {
      window.setTimeout(resolve, 450);
    });
    // TODO: apiClient.put('/organization', { tree })
    // TODO: NotificationEngine / ActivityTimeline / AuditLog ← pendingAuditEvents
    console.info('[organization] pending audit events', pendingAuditEvents);
    set({ dirty: false, pendingAuditEvents: [] });
    return { ok: true };
  },

  resetFromMock: () =>
    set({
      tree: cloneOrganizationTree(),
      dirty: false,
      selectedNodeId: null,
      drawerOpen: false,
      pendingAuditEvents: [],
      roleReviewPrompt: null,
    }),

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
