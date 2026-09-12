/**
 * Pure tree helpers for organization hierarchy.
 * Position (job title) and role (RBAC code) stay independent.
 * Person node id === users.id. Units persist as organization_units.
 */

import { createEntityId, ENTITY_ID_PREFIX } from '../../../../domain/identity';

export const ROOT_UNIT_ID = 'ou_root';

export const ORG_POSITION_SUGGESTIONS = [
  'مدیر فروش',
  'کارشناس فروش',
  'مدیر بازرگانی',
  'کارشناس بازرگانی',
  'مسئول ارسال',
];

export function emptyOrganizationTree() {
  return {
    id: ROOT_UNIT_ID,
    type: 'department',
    name: 'سازمان',
    code: 'ROOT',
    sortOrder: 0,
    isActive: true,
    children: [],
  };
}

export function walkTree(node, visit, parent = null) {
  visit(node, parent);
  (node.children || []).forEach((child) => walkTree(child, visit, node));
}

export function findNodeById(root, id) {
  let found = null;
  walkTree(root, (node) => {
    if (node.id === id) found = node;
  });
  return found;
}

export function findParentId(root, id) {
  let parentId = null;
  walkTree(root, (node, parent) => {
    if (node.id === id) parentId = parent?.id ?? null;
  });
  return parentId;
}

export function countMembers(node) {
  let count = 0;
  walkTree(node, (n) => {
    if (n.type === 'user') count += 1;
  });
  return count;
}

export function collectUserIds(root) {
  const ids = [];
  if (!root) return ids;
  walkTree(root, (node) => {
    if (node.type === 'user') ids.push(node.userId || node.id);
  });
  return ids;
}

export function resolveDepartmentParentId(root, candidateId) {
  if (!root) return ROOT_UNIT_ID;
  const target = candidateId ? findNodeById(root, candidateId) : null;
  if (target?.type === 'department') return target.id;
  if (target?.type === 'user') return findParentId(root, target.id) || ROOT_UNIT_ID;
  return ROOT_UNIT_ID;
}

/**
 * Department options for a parent picker.
 * excludeSubtreeId omits that unit and its descendants (cannot be own parent).
 */
export function collectDepartmentOptions(root, { excludeSubtreeId } = {}) {
  const excluded = new Set();
  if (excludeSubtreeId) {
    const subtree = findNodeById(root, excludeSubtreeId);
    if (subtree) {
      walkTree(subtree, (node) => {
        if (node.type === 'department') excluded.add(node.id);
      });
    }
  }

  const options = [];
  const visit = (node, depth) => {
    if (node?.type === 'department' && !excluded.has(node.id)) {
      options.push({ id: node.id, name: node.name, depth });
    }
    (node.children || []).forEach((child) => {
      if (child.type === 'department') visit(child, depth + 1);
    });
  };
  visit(root, 0);
  return options;
}

export function removeNodeById(root, id) {
  if (root.id === id) return { tree: root, removed: null };

  const next = structuredClone(root);
  let removed = null;

  const strip = (node) => {
    if (!node.children?.length) return node;
    const kept = [];
    node.children.forEach((child) => {
      if (child.id === id) {
        removed = child;
        return;
      }
      kept.push(strip(child));
    });
    node.children = kept;
    return node;
  };

  strip(next);
  return { tree: next, removed };
}

export function insertChild(root, parentId, child) {
  const next = structuredClone(root);
  const parent = findNodeById(next, parentId);
  if (!parent) return root;
  if (parent.type !== 'department') return root;
  parent.children = [...(parent.children || []), child];
  return next;
}

/**
 * Move node under a new parent department.
 * Rejects cycles and dropping onto users.
 */
export function moveNode(root, nodeId, newParentId) {
  if (nodeId === newParentId) return { tree: root, moved: false, reason: 'same' };
  if (nodeId === root.id || nodeId === ROOT_UNIT_ID) return { tree: root, moved: false, reason: 'root' };

  const target = findNodeById(root, newParentId);
  if (!target || target.type !== 'department') {
    return { tree: root, moved: false, reason: 'invalid-target' };
  }

  let isDescendant = false;
  const moving = findNodeById(root, nodeId);
  if (!moving) return { tree: root, moved: false, reason: 'missing' };
  walkTree(moving, (n) => {
    if (n.id === newParentId) isDescendant = true;
  });
  if (isDescendant) return { tree: root, moved: false, reason: 'cycle' };

  const currentParentId = findParentId(root, nodeId);
  if (currentParentId === newParentId) {
    return { tree: root, moved: false, reason: 'unchanged' };
  }

  const { tree: without, removed } = removeNodeById(root, nodeId);
  if (!removed) return { tree: root, moved: false, reason: 'missing' };

  const tree = insertChild(without, newParentId, removed);
  return {
    tree,
    moved: true,
    node: removed,
    fromParentId: currentParentId,
    toParentId: newParentId,
  };
}

export function createDepartmentNode(name) {
  const id = createEntityId(ENTITY_ID_PREFIX.ORG_UNIT);
  return {
    id,
    type: 'department',
    name,
    code: id.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 48),
    children: [],
  };
}

/** Person node identity is users.id — never a synthetic org-only person. */
export function createUserNode(user, extras = {}) {
  const userId = user.userId || user.id;
  return {
    id: userId,
    type: 'user',
    userId,
    name: user.displayName || user.fullName || user.name || user.username || userId,
    username: user.username || '',
    mobile: user.mobile || '',
    position: extras.position || '',
    positionId: extras.positionId || null,
    isManager: extras.isManager === true,
  };
}

/** Layout tree → React Flow nodes/edges (top-down, RTL-friendly x). */
export function layoutOrganizationFlow(root) {
  const NODE_W = 220;
  const NODE_H = 108;
  const GAP_X = 36;
  const GAP_Y = 88;

  const subtreeWidth = (node) => {
    const kids = node.children || [];
    if (!kids.length) return NODE_W;
    const sum = kids.reduce((acc, child) => acc + subtreeWidth(child), 0);
    return Math.max(NODE_W, sum + GAP_X * (kids.length - 1));
  };

  const nodes = [];
  const edges = [];

  const place = (node, depth, left) => {
    const width = subtreeWidth(node);
    const x = left + width / 2 - NODE_W / 2;
    const y = depth * (NODE_H + GAP_Y);

    nodes.push({
      id: node.id,
      type: node.type === 'user' ? 'orgUser' : 'orgDepartment',
      position: { x, y },
      data: {
        ...node,
        memberCount: node.type === 'department' ? countMembers(node) : undefined,
      },
      draggable: node.id !== ROOT_UNIT_ID,
    });

    const kids = node.children || [];
    let cursor = left;
    kids.forEach((child) => {
      const childWidth = subtreeWidth(child);
      place(child, depth + 1, cursor);
      edges.push({
        id: `e-${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: 'smoothstep',
        style: { stroke: 'var(--color-neutral-400)', strokeWidth: 1.5 },
      });
      cursor += childWidth + GAP_X;
    });
  };

  place(root, 0, 0);
  return { nodes, edges };
}

export function buildMoveAuditEvent({ actor, node, fromParent, toParent }) {
  const fromName = fromParent?.name || '—';
  const toName = toParent?.name || '—';
  const subject = node.type === 'user' ? `کاربر ${node.name}` : `واحد ${node.name}`;
  return {
    type: 'ORGANIZATION_CHANGED',
    actor: actor || 'admin',
    description: `${subject} از واحد «${fromName}» به «${toName}» منتقل شد`,
    payload: {
      nodeId: node.id,
      nodeType: node.type,
      fromParentId: fromParent?.id ?? null,
      toParentId: toParent?.id ?? null,
    },
    createdAt: new Date().toISOString(),
  };
}
