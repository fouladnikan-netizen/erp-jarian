import { describe, it, expect } from 'vitest';
import {
  ROOT_UNIT_ID,
  collectDepartmentOptions,
  collectUserIds,
  createUserNode,
  emptyOrganizationTree,
  insertChild,
  moveNode,
  resolveDepartmentParentId,
} from '../treeUtils.js';

describe('organization tree utils — real user nodes', () => {
  it('empty tree uses canonical root unit id', () => {
    expect(emptyOrganizationTree().id).toBe(ROOT_UNIT_ID);
    expect(emptyOrganizationTree().type).toBe('department');
  });

  it('person nodes use users.id and never invent a second identity', () => {
    const node = createUserNode(
      { id: 'u_real', displayName: 'مدیر جریان', username: 'admin' },
      { position: 'کارشناس فروش', isManager: false },
    );
    expect(node.id).toBe('u_real');
    expect(node.userId).toBe('u_real');
    expect(node.username).toBe('admin');
    expect(node.position).toBe('کارشناس فروش');
    expect(node).not.toHaveProperty('role');
  });

  it('moving a user between units keeps the same user id', () => {
    const user = createUserNode({ id: 'u_1', displayName: 'علی', username: 'ali' }, { position: 'کارشناس فروش' });
    let tree = emptyOrganizationTree();
    tree = insertChild(tree, ROOT_UNIT_ID, {
      id: 'ou_a',
      type: 'department',
      name: 'واحد آ',
      children: [user],
    });
    tree = insertChild(tree, ROOT_UNIT_ID, {
      id: 'ou_b',
      type: 'department',
      name: 'واحد ب',
      children: [],
    });
    const moved = moveNode(tree, 'u_1', 'ou_b');
    expect(moved.moved).toBe(true);
    expect(collectUserIds(moved.tree)).toEqual(['u_1']);
    expect(moved.node.id).toBe('u_1');
  });

  it('resolveDepartmentParentId uses the selected department, else the user parent, else root', () => {
    const user = createUserNode({ id: 'u_1', displayName: 'علی', username: 'ali' });
    let tree = emptyOrganizationTree();
    tree = insertChild(tree, ROOT_UNIT_ID, {
      id: 'ou_sales',
      type: 'department',
      name: 'فروش',
      children: [user],
    });
    expect(resolveDepartmentParentId(tree, 'ou_sales')).toBe('ou_sales');
    expect(resolveDepartmentParentId(tree, 'u_1')).toBe('ou_sales');
    expect(resolveDepartmentParentId(tree, null)).toBe(ROOT_UNIT_ID);
  });

  it('collectDepartmentOptions lists nested units and can exclude a subtree', () => {
    let tree = emptyOrganizationTree();
    tree = insertChild(tree, ROOT_UNIT_ID, {
      id: 'ou_sales',
      type: 'department',
      name: 'فروش',
      children: [{ id: 'ou_inside', type: 'department', name: 'داخل فروش', children: [] }],
    });
    const all = collectDepartmentOptions(tree);
    expect(all.map((item) => item.id)).toEqual([ROOT_UNIT_ID, 'ou_sales', 'ou_inside']);
    const forSales = collectDepartmentOptions(tree, { excludeSubtreeId: 'ou_sales' });
    expect(forSales.map((item) => item.id)).toEqual([ROOT_UNIT_ID]);
  });
});
